"""Ω-Chat: natural-language interface with a strict draft → confirm → execute flow."""
from __future__ import annotations

import datetime as dt
import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from ..audit import record, record_for_user
from ..database import get_db
from ..models import (
    AiMessage,
    DataQualityIssue,
    Encounter,
    Patient,
    Referral,
    ServiceCatalogItem,
    ServiceRequest,
    SyncTransaction,
    User,
    Vital,
)
from ..schemas import ChatRequest, ChatResponse, ExecuteRequest, ExecuteResult
from ..security import get_current_user, require_capability, verify_secret
from ..serializers import patient_summary, service_request_to_dict
from ..services import ai as ai_service
from ..services import clinical_rules, sib_bridge
from ..utils import age_from_birth_date, bmi_for, to_jalali_str

router = APIRouter(prefix="/api/ai", tags=["ai"])


def _load_patient(db: Session, patient_id: str) -> Patient:
    patient = db.scalar(
        select(Patient)
        .options(
            selectinload(Patient.conditions),
            selectinload(Patient.medications),
            selectinload(Patient.vitals),
            selectinload(Patient.encounters),
            selectinload(Patient.preventive_care),
            selectinload(Patient.quality_issues),
            selectinload(Patient.service_requests).selectinload(ServiceRequest.service),
        )
        .where(Patient.id == patient_id)
    )
    if patient is None:
        raise HTTPException(status_code=404, detail=f"Patient '{patient_id}' not found")
    return patient


@router.get("/status", summary="AI engine status")
def status(_: User = Depends(get_current_user)) -> dict:
    from ..config import settings

    return {
        "engine": ai_service.engine_name(),
        "llm_configured": settings.ai_enabled,
        "model": settings.ai_model if settings.ai_enabled else None,
        "action_catalogue": sorted(ai_service.ACTION_CATALOG.keys()),
        "requires_confirmation": True,
    }


@router.get("/actions", summary="Action catalogue the assistant may propose")
def actions(_: User = Depends(get_current_user)) -> dict:
    return ai_service.ACTION_CATALOG


@router.get("/history", summary="Persisted conversation for a session")
def history(
    session_id: str = Query(...),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
) -> dict:
    rows = list(
        db.scalars(
            select(AiMessage)
            .where(AiMessage.session_id == session_id)
            .order_by(AiMessage.created_at.desc())
            .limit(limit)
        )
    )
    rows.reverse()
    return {
        "session_id": session_id,
        "items": [
            {
                "role": m.role,
                "content": m.content,
                "intent": m.intent,
                "engine": m.engine,
                "payload": m.payload,
                "created_at": m.created_at,
            }
            for m in rows
        ],
    }


@router.post("/chat", response_model=ChatResponse, summary="Ask the assistant (returns a draft plan)")
def chat(
    payload: ChatRequest,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> ChatResponse:
    session_id = payload.session_id or uuid.uuid4().hex[:12]
    brief = None
    patient = None
    if payload.patient_id:
        patient = _load_patient(db, payload.patient_id)
        brief = clinical_rules.patient_brief(patient)

    plan = ai_service.build_plan(payload.message, brief, payload.history)

    evidence: list[dict] = []
    if brief:
        risk = brief.get("risk") or {}
        if risk.get("available"):
            evidence.append(
                {
                    "kind": "risk",
                    "label": f"10-year CVD risk ≈ {risk['percentage']}% ({risk['colorCategory']})",
                    "provenance": risk.get("provenance"),
                }
            )
        for gap in (brief.get("care_gaps") or [])[:5]:
            evidence.append({"kind": "care_gap", "label": f"{gap['item']}: {gap['status']}", "detail": gap["detail"]})
        for alert in (brief.get("drug_alerts") or [])[:5]:
            evidence.append({"kind": "drug_alert", "label": alert["title"], "detail": alert["recommendation"]})

    db.add(
        AiMessage(
            session_id=session_id,
            patient_id=payload.patient_id,
            role="user",
            content=payload.message,
            engine=plan["engine"],
        )
    )
    db.add(
        AiMessage(
            session_id=session_id,
            patient_id=payload.patient_id,
            role="assistant",
            content=plan["reply"],
            intent=plan["intent"],
            engine=plan["engine"],
            payload={"actions": plan["actions"], "summary": plan["summary"]},
        )
    )
    record_for_user(
        db,
        user,
        action="ai.chat",
        entity_type="patient" if patient else None,
        entity_id=patient.id if patient else None,
        detail={"intent": plan["intent"], "engine": plan["engine"], "actions": [a["type"] for a in plan["actions"]]},
        source_ip=request.client.host if request.client else None,
    )
    db.commit()

    return ChatResponse(
        session_id=session_id,
        reply=plan["reply"],
        intent=plan["intent"],
        engine=plan["engine"],
        draft_plan={"summary": plan["summary"], "actions": plan["actions"]},
        provenance=plan["provenance"],
        requires_confirmation=plan["requires_confirmation"],
        patient_id=payload.patient_id,
        evidence=evidence,
    )


# --------------------------------------------------------------------------- #
# Execute
# --------------------------------------------------------------------------- #
def _execute_action(db: Session, user: User, action: dict, patient: Patient | None, pin: str | None) -> dict:
    action_type = action.get("type")
    params = action.get("params") or {}
    result: dict = {"type": action_type, "ok": False, "message": "", "data": None}

    if action_type not in ai_service.ACTION_CATALOG:
        result["message"] = f"Unknown action type '{action_type}'"
        return result

    if action_type == "SEARCH_PATIENTS":
        query = str(params.get("query", ""))
        matches = list(
            db.scalars(
                select(Patient).where(
                    Patient.persian_name.ilike(f"%{query}%") | Patient.national_id.like(f"%{query}%")
                )
            )
        )
        result.update(ok=True, message=f"{len(matches)} patient(s) matched", data=[patient_summary(m) for m in matches])
        return result

    if patient is None:
        result["message"] = f"Action '{action_type}' requires a patient context"
        return result

    if action_type == "REGISTER_VITALS":
        provided = {key: value for key, value in params.items() if value is not None}
        if not provided:
            result["message"] = "No vital-sign values were provided — nothing to record"
            return result
        params = provided
        now = dt.datetime.now(dt.timezone.utc)
        vital = Vital(
            patient_id=patient.id,
            measured_at=now,
            jalali_date=to_jalali_str(now),
            bp_systolic=params.get("bp_systolic"),
            bp_diastolic=params.get("bp_diastolic"),
            heart_rate=params.get("heart_rate"),
            weight_kg=params.get("weight_kg"),
            height_cm=params.get("height_cm"),
            bmi=bmi_for(params.get("weight_kg"), params.get("height_cm")),
            fasting_blood_sugar=params.get("fasting_blood_sugar"),
            hba1c=params.get("hba1c"),
            total_cholesterol=params.get("total_cholesterol"),
            measured_by=user.full_name,
            recorded_in="Ω-Chat (AI-assisted entry)",
        )
        db.add(vital)
        db.flush()
        transaction = sib_bridge.build_vitals_transaction(
            db,
            patient=patient,
            vital_payload={
                "vital_id": vital.id,
                "bp_systolic": vital.bp_systolic,
                "bp_diastolic": vital.bp_diastolic,
                "heart_rate": vital.heart_rate,
                "weight_kg": vital.weight_kg,
                "height_cm": vital.height_cm,
                "bmi": vital.bmi,
                "fasting_blood_sugar": vital.fasting_blood_sugar,
                "hba1c": vital.hba1c,
            },
            user=user,
        )
        db.commit()
        ok, error = sib_bridge.process_transaction(db, transaction)
        db.commit()
        result.update(
            ok=True,
            message="Vitals recorded" + (" and queued to SIB" if ok else f"; SIB push failed: {error}"),
            data={"vital_id": vital.id, "jalali_date": vital.jalali_date, "bmi": vital.bmi, "sync": transaction.status},
        )
        return result

    if action_type == "CREATE_ENCOUNTER":
        now = dt.datetime.now(dt.timezone.utc)
        encounter = Encounter(
            patient_id=patient.id,
            clinician_id=user.id,
            occurred_at=now,
            jalali_date=to_jalali_str(now),
            facility=user.facility,
            clinician_role=user.role if user.role != "admin" else "Family Physician",
            chief_complaint=params.get("chief_complaint"),
            assessment=list(params.get("assessment") or []),
            plan=list(params.get("plan") or []),
            follow_up_days=params.get("follow_up_days"),
            status="DRAFT",
            sib_module="Ω-SIB AI draft",
        )
        db.add(encounter)
        db.flush()
        db.commit()
        result.update(
            ok=True,
            message="Draft visit created — review and commit it from the Visits screen",
            data={"encounter_id": encounter.id, "status": encounter.status},
        )
        return result

    if action_type == "CREATE_REFERRAL":
        referral = Referral(
            patient_id=patient.id,
            specialty=str(params.get("specialty", "General")),
            persian_specialty=str(params.get("persian_specialty", "")),
            urgency=str(params.get("urgency", "ROUTINE")).upper(),
            reason=str(params.get("reason", "")),
            workup=list(params.get("workup") or []),
            clinician_id=user.id,
            status="DRAFT",
        )
        db.add(referral)
        db.flush()
        transaction_id = None
        if params.get("send"):
            referral.status = "SENT"
            referral.sent_at = dt.datetime.now(dt.timezone.utc)
            transaction = SyncTransaction(
                patient_id=patient.id,
                kind="REFERRAL",
                summary=[f"ارجاع {referral.urgency} به {referral.specialty}"],
                payload={"patient": {"id": patient.id, "national_id": patient.national_id}, "referral_id": referral.id},
                clinician_name=user.full_name,
                status="QUEUED",
            )
            db.add(transaction)
            db.flush()
            transaction_id = transaction.id
            db.commit()
            sib_bridge.process_transaction(db, transaction)
        db.commit()
        result.update(
            ok=True,
            message=f"Referral created ({referral.status})",
            data={"referral_id": referral.id, "status": referral.status, "sync_transaction_id": transaction_id},
        )
        return result

    if action_type == "REQUEST_SERVICE":
        code = str(params.get("service_code", "")).upper()
        service = db.scalar(select(ServiceCatalogItem).where(ServiceCatalogItem.code == code))
        if service is None:
            result["message"] = f"Unknown service code '{code}'"
            return result
        service_request = ServiceRequest(
            patient_id=patient.id,
            service_id=service.id,
            status="REQUESTED",
            requested_by=user.full_name,
            notes=params.get("notes"),
        )
        db.add(service_request)
        db.flush()
        transaction = SyncTransaction(
            patient_id=patient.id,
            kind="SERVICE",
            summary=[f"درخواست {service.persian_name or service.name}"],
            payload={"patient": {"id": patient.id}, "service_request_id": service_request.id},
            clinician_name=user.full_name,
            status="QUEUED",
        )
        db.add(transaction)
        db.commit()
        ok, error = sib_bridge.process_transaction(db, transaction)
        db.commit()
        result.update(
            ok=True,
            message=f"Service '{code}' requested" + ("" if ok else f" (SIB push failed: {error})"),
            data=service_request_to_dict(service_request),
        )
        return result

    if action_type == "RESOLVE_QUALITY_ISSUE":
        issue_id = params.get("issue_id")
        issue = db.get(DataQualityIssue, issue_id) if issue_id else None
        if issue is None or issue.patient_id != patient.id:
            result["message"] = "Quality issue not found for this patient"
            return result
        issue.resolved = True
        issue.resolved_at = dt.datetime.now(dt.timezone.utc)
        issue.resolved_by = user.full_name
        db.commit()
        result.update(ok=True, message="Quality issue resolved", data={"issue_id": issue.id})
        return result

    if action_type == "SYNC_FLUSH":
        outcome = sib_bridge.flush_queue(db)
        result.update(ok=True, message=f"Queue flushed: {outcome['synced']} synced, {outcome['failed']} failed", data=outcome)
        return result

    if action_type == "SUMMARIZE_PATIENT":
        result.update(ok=True, message="Patient summary generated", data=clinical_rules.patient_brief(patient))
        return result

    if action_type == "GET_RISK":
        result.update(ok=True, message="Risk estimate computed", data=clinical_rules.cvd_risk(patient))
        return result

    result["message"] = "Action not implemented"
    return result


@router.post("/execute", response_model=ExecuteResult, summary="Execute a confirmed draft plan (audited)")
def execute(
    payload: ExecuteRequest,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(require_capability("ai_execute")),
) -> ExecuteResult:
    patient = _load_patient(db, payload.patient_id) if payload.patient_id else None

    if payload.pin and user.pin_hash and not verify_secret(payload.pin, user.pin_hash):
        raise HTTPException(status_code=403, detail="Invalid clinical e-signature PIN")

    results: list[dict] = []
    for action in payload.actions:
        outcome = _execute_action(db, user, action.model_dump(), patient, payload.pin)
        results.append(outcome)
        record_for_user(
            db,
            user,
            action=f"ai.execute.{outcome['type']}",
            entity_type="patient" if patient else None,
            entity_id=patient.id if patient else None,
            detail={"ok": outcome["ok"], "message": outcome["message"], "params": action.params},
            source_ip=request.client.host if request.client else None,
        )
    summary_row = record_for_user(
        db,
        user,
        action="ai.execute",
        entity_type="patient" if patient else None,
        entity_id=patient.id if patient else None,
        detail={
            "session_id": payload.session_id,
            "executed": len(results),
            "actions": [r["type"] for r in results],
            "ok": all(r["ok"] for r in results),
        },
        source_ip=request.client.host if request.client else None,
    )
    db.commit()

    return ExecuteResult(
        executed=len([r for r in results if r["ok"]]),
        results=results,
        audit_id=summary_row.id if summary_row else None,
    )
