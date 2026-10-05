"""Append-only audit trail.

Every state-changing endpoint and every AI-executed action writes one row.
The table is append-only by convention: the API exposes no update or delete
operation for ``audit_logs`` (see docs/SECURITY.md).
"""
from __future__ import annotations

from typing import Any

from sqlalchemy.orm import Session

from .config import settings
from .models import AuditLog, User


def record(
    db: Session,
    *,
    action: str,
    actor: str = "system",
    actor_role: str | None = None,
    entity_type: str | None = None,
    entity_id: str | None = None,
    detail: dict[str, Any] | None = None,
    source_ip: str | None = None,
    commit: bool = False,
) -> AuditLog | None:
    """Write one audit row. Returns the row (or ``None`` when auditing is off)."""
    if not settings.audit_enabled:
        return None
    row = AuditLog(
        action=action,
        actor=actor,
        actor_role=actor_role,
        entity_type=entity_type,
        entity_id=str(entity_id) if entity_id is not None else None,
        detail=detail or {},
        source_ip=source_ip,
    )
    db.add(row)
    if commit:
        db.commit()
        db.refresh(row)
    else:
        db.flush()
    return row


def record_for_user(
    db: Session,
    user: User | None,
    *,
    action: str,
    entity_type: str | None = None,
    entity_id: str | None = None,
    detail: dict[str, Any] | None = None,
    source_ip: str | None = None,
    commit: bool = False,
) -> AuditLog | None:
    return record(
        db,
        action=action,
        actor=user.username if user else "system",
        actor_role=user.role if user else None,
        entity_type=entity_type,
        entity_id=entity_id,
        detail=detail,
        source_ip=source_ip,
        commit=commit,
    )