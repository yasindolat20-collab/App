"""Visit (ویزیت) endpoints, including the draft → commit → SIB sync workflow."""
from __future__ import annotations

import datetime as dt

from fastapi import APIRouter, Depends, HTTPException, Query, Request, Response
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from ..audit import record_for_user
from ..database import get_db
from ..models import Encounter, Patient, SyncTransaction, User, Vital
from ..schemas import CommitRequest, EncounterCreate
from ..security import get_current_user, require_capability, verify_secret
from ..serializers import encounter_to_dict
from ..services import clinical_rules, sib_bridge
from ..utils import age_from_birth_date, bmi_for, to_jalali_str

router = APIRouter(prefix="/api/encounters", tags=["encounters"])


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
            selectinload(Patient.service_requests),
        )
        .where(Patient.id == patient_id)
    )
    if patient is None:
        raise HTTPException(status_code=404, detail=f"Patient '{patient_id}' not found")
    return patient


@router.get("", summary="List visits")
def list_encounters(
    patient_id: str | None = None,
    status: str | None = Query(None, description="DRAFT | COMMITTED"),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
) -> dict:
    stmt = select(Encounter).order_by(Encounter.occurred_at.desc())
    if patient_id:
        stmt = stmt.where(Encounter.patient_id == patient_id)
    if status:
        stmt = stmt.where(Encounter.status == status)
    rows = list(db.scalars(stmt))
    total = len(rows)
    page = rows[offset : offset + limit]
    return {"items": [encounter_to_dict(e) for e in page], "total": total, "limit": limit, "offset": offset}


@router.post("", status_code=201, summary="Register a visit (draft, or commit immediately)")
def create_encounter(
    payload: EncounterCreate,
    request: Request,
    response: Response,
    db: Session = Depends(get_db),
    user: User = Depends(require_capability("write_visit")),
) -> dict:
    patient = _load_patient(db, payload.patient_id)

    vitals_snapshot: dict = {}
    if payload.vitals:
        measured_at = payload.vitals.measured_at or dt.datetime.now(dt.timezone.utc)
        vital = Vital(
            patient_id=patient.id,
            measured_at=measured_at,
            jalali_date=to_jalali_str(measured_at),
            bp_systolic=payload.vitals.bp_systolic,
            bp_diastolic=payload.vitals.bp_diastolic,
            heart_rate=payload.vitals.heart_rate,
            weight_kg=payload.vitals.weight_kg,
            height_cm=payload.vitals.height_cm,
            bmi=bmi_for(payload.vitals.weight_kg, payload.vitals.height_cm),
            fasting_blood_sugar=payload.vitals.fasting_blood_sugar,
            hba1c=payload.vitals.hba1c,
            total_cholesterol=payload.vitals.total_cholesterol,
            measured_by=payload.vitals.measured_by or user.full_name,
            recorded_in=payload.vitals.recorded_in or "Ω-SIB visit form",
        )
        db.add(vital)
        db.flush()
        vitals_snapshot = {
            "vital_id": vital.id,
            "bp_systolic": vital.bp_systolic,
            "bp_diastolic": vital.bp_diastolic,
            "heart_rate": vital.heart_rate,
            "weight_kg": vital.weight_kg,
            "height_cm": vital.height_cm,
            "bmi": vital.bmi,
            "fasting_blood_sugar": vital.fasting_blood_sugar,
            "hba1c": vital.hba1c,
        }

    now = dt.datetime.now(dt.timezone.utc)
    encounter = Encounter(
        patient_id=patient.id,
        clinician_id=user.id,
        occurred_at=now,
        jalali_date=to_jalali_str(now),
        facility=payload.facility or user.facility,
        clinician_role=payload.clinician_role or "Family Physician",
        chief_complaint=payload.chief_complaint,
        subjective=payload.subjective,
        objective=payload.objective,
        physical_findings=payload.physical_findings,
        assessment=list(payload.assessment),
        icd_codes=list(payload.icd_codes),
        plan=list(payload.plan),
        prescriptions=list(payload.prescriptions),
        lab_orders=list(payload.lab_orders),
        vitals_snapshot=vitals_snapshot,
        referral_requested=payload.referral_requested,
        referral_specialty=payload.referral_specialty,
        follow_up_days=payload.follow_up_days,
        status="DRAFT",
    )
    db.add(encounter)
    db.flush()
    record_for_user(
        db,
        user,
        action="encounter.create",
        entity_type="encounter",
        entity_id=encounter.id,
        detail={"patient_id": patient.id, "assessment": encounter.assessment},
        source_ip=request.client.host if request.client else None,
    )
    db.commit()

    if payload.commit:
        response.status_code = 200
        return commit_encounter(encounter.id, CommitRequest(pin=payload.pin), request, db, user)

    return encounter_to_dict(encounter)


@router.get("/{encounter_id}", summary="Visit detail")
def get_encounter(
    encounter_id: str,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
) -> dict:
    encounter = db.get(Encounter, encounter_id)
    if encounter is None:
        raise HTTPException(status_code=404, detail="Encounter not found")
    data = encounter_to_dict(encounter)
    patient = db.get(Patient, encounter.patient_id)
    data["patient"] = (
        {
            "id": patient.id,
            "name": patient.name,
            "persian_name": patient.persian_name,
            "national_id": patient.national_id,
            "age": age_from_birth_date(patient.birth_date),
        }
        if patient
        else None
    )
    return data


@router.post("/{encounter_id}/commit", summary="Commit a visit to SIB (enqueue + push)")
def commit_encounter(
    encounter_id: str,
    payload: CommitRequest,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(require_capability("commit_sib")),
) -> dict:
    encounter = db.get(Encounter, encounter_id)
    if encounter is None:
        raise HTTPException(status_code=404, detail="Encounter not found")
    if encounter.status == "COMMITTED":
        raise HTTPException(status_code=409, detail="This visit is already committed to SIB")

    pin_confirmed = False
    if user.pin_hash:
        if not verify_secret(payload.pin or "", user.pin_hash):
            raise HTTPException(
                status_code=403,
                detail="Clinical e-signature PIN is required to commit a visit to SIB",
            )
        pin_confirmed = True

    patient = _load_patient(db, encounter.patient_id)
    transaction = sib_bridge.build_encounter_transaction(
        db,
        encounter=encounter,
        patient=patient,
        user=user,
        pin_confirmed=pin_confirmed,
        summary_override=payload.summary_override,
    )
    db.commit()

    ok, error = sib_bridge.process_transaction(db, transaction)
    record_for_user(
        db,
        user,
        action="encounter.commit",
        entity_type="encounter",
        entity_id=encounter.id,
        detail={"transaction_id": transaction.id, "synced": ok, "error": error},
        source_ip=request.client.host if request.client else None,
    )
    db.commit()

    db.refresh(encounter)
    db.refresh(transaction)
    return {
        "encounter": encounter_to_dict(encounter),
        "transaction": {
            "id": transaction.id,
            "status": transaction.status,
            "summary": transaction.summary,
            "error_message": transaction.error_message,
            "retry_count": transaction.retry_count,
        },
        "synced": ok,
    }


@router.get("/{encounter_id}/sync-transactions", summary="Sync transactions created by this visit")
def encounter_transactions(
    encounter_id: str,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
) -> dict:
    rows = list(db.scalars(select(SyncTransaction).where(SyncTransaction.encounter_id == encounter_id)))
    return {
        "items": [
            {
                "id": t.id,
                "status": t.status,
                "retry_count": t.retry_count,
                "error_message": t.error_message,
                "created_at": t.created_at,
                "synced_at": t.synced_at,
            }
            for t in rows
        ]
    }
