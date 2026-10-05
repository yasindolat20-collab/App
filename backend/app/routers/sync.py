"""SIB sync queue endpoints (mirrors the SIB offline buffer)."""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..audit import record_for_user
from ..config import settings
from ..database import get_db
from ..models import AuditLog, SyncTransaction, User
from ..schemas import AuditLogOut
from ..security import get_current_user, require_capability
from ..services import sib_bridge

router = APIRouter(prefix="/api", tags=["sync"])


def _transaction_dict(t: SyncTransaction) -> dict:
    return {
        "id": t.id,
        "patient_id": t.patient_id,
        "encounter_id": t.encounter_id,
        "kind": t.kind,
        "summary": t.summary or [],
        "payload": t.payload or {},
        "clinician_name": t.clinician_name,
        "pin_confirmed": t.pin_confirmed,
        "status": t.status,
        "retry_count": t.retry_count,
        "error_message": t.error_message,
        "created_at": t.created_at,
        "synced_at": t.synced_at,
    }


@router.get("/sync/queue", summary="Pending / historical sync transactions")
def queue(
    status: str | None = Query(None, description="QUEUED | SYNCING | SYNCED | FAILED"),
    limit: int = Query(50, ge=1, le=500),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
) -> dict:
    stmt = select(SyncTransaction).order_by(SyncTransaction.created_at.desc()).limit(limit)
    if status:
        stmt = select(SyncTransaction).where(SyncTransaction.status == status).order_by(SyncTransaction.created_at.desc()).limit(limit)
    rows = list(db.scalars(stmt))
    return {
        "items": [_transaction_dict(t) for t in rows],
        "total": len(rows),
        "adapter": sib_bridge.get_adapter().name,
        "counts": {
            "queued": len(list(db.scalars(select(SyncTransaction).where(SyncTransaction.status == "QUEUED")))),
            "failed": len(list(db.scalars(select(SyncTransaction).where(SyncTransaction.status == "FAILED")))),
            "synced": len(list(db.scalars(select(SyncTransaction).where(SyncTransaction.status == "SYNCED")))),
        },
    }


@router.get("/sync/status", summary="Bridge / adapter status")
def status(_: User = Depends(get_current_user)) -> dict:
    adapter = sib_bridge.get_adapter()
    return {
        "adapter": adapter.name,
        "configured_adapter": settings.sib_adapter,
        "adapter_url": settings.sib_adapter_url or None,
        "simulated_failure_rate": settings.sib_simulated_failure_rate,
        "ai_engine": "llm" if settings.ai_enabled else "rules",
        "ai_model": settings.ai_model if settings.ai_enabled else None,
    }


@router.post("/sync/queue/{transaction_id}/retry", summary="Retry one transaction")
def retry_transaction(
    transaction_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(require_capability("commit_sib")),
) -> dict:
    transaction = db.get(SyncTransaction, transaction_id)
    if transaction is None:
        raise HTTPException(status_code=404, detail="Transaction not found")
    ok, error = sib_bridge.process_transaction(db, transaction)
    record_for_user(
        db,
        user,
        action="sync.retry",
        entity_type="sync_transaction",
        entity_id=transaction.id,
        detail={"status": transaction.status, "error": error},
    )
    db.commit()
    return {"id": transaction.id, "status": transaction.status, "error_message": error, "synced": ok}


@router.post("/sync/flush", summary="Flush the queue to SIB")
def flush(
    limit: int = Query(25, ge=1, le=200),
    retry_failed: bool = True,
    db: Session = Depends(get_db),
    user: User = Depends(require_capability("commit_sib")),
) -> dict:
    result = sib_bridge.flush_queue(db, limit=limit, retry_failed=retry_failed)
    record_for_user(
        db,
        user,
        action="sync.flush",
        entity_type="sync_queue",
        detail={k: v for k, v in result.items() if k != "details"},
    )
    db.commit()
    return result


@router.get("/audit", response_model=dict, summary="Audit trail (append-only)")
def audit_log(
    limit: int = Query(100, ge=1, le=1000),
    action: str | None = None,
    actor: str | None = None,
    db: Session = Depends(get_db),
    _: User = Depends(require_capability("reports")),
) -> dict:
    stmt = select(AuditLog).order_by(AuditLog.at.desc()).limit(limit)
    if action:
        stmt = select(AuditLog).where(AuditLog.action == action).order_by(AuditLog.at.desc()).limit(limit)
    if actor:
        stmt = select(AuditLog).where(AuditLog.actor == actor).order_by(AuditLog.at.desc()).limit(limit)
    rows = list(db.scalars(stmt))
    return {
        "items": [AuditLogOut.model_validate(r).model_dump(mode="json") for r in rows],
        "total": len(rows),
    }