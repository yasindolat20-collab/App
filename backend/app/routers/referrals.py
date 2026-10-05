"""Referral (ارجاع) endpoints, including the printable referral slip."""
from __future__ import annotations

import datetime as dt

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from ..audit import record_for_user
from ..database import get_db
from ..models import Encounter, Patient, Referral, SyncTransaction, User
from ..schemas import ReferralCreate, ReferralUpdate
from ..security import get_current_user, require_capability
from ..services import sib_bridge
from ..utils import age_from_birth_date, to_jalali_str

router = APIRouter(prefix="/api/referrals", tags=["referrals"])

SPECIALTY_WORKUP: dict[str, list[str]] = {
    "Cardiology": [
        "12-lead ECG",
        "Fasting lipid profile",
        "Fasting blood glucose / HbA1c",
        "Serum creatinine and electrolytes",
        "Current medication list with doses",
    ],
    "Endocrinology": [
        "HbA1c (within 3 months)",
        "Fasting blood glucose",
        "TSH",
        "Serum creatinine",
        "Lipid profile",
    ],
    "Ophthalmology": ["Visual acuity", "Fundoscopy request", "HbA1c and blood pressure record"],
    "Nephrology": ["Serum creatinine and eGFR", "Urine albumin-to-creatinine ratio", "Blood pressure log"],
    "Orthopedics": ["Plain radiograph of the affected region", "Pain and function description"],
    "Psychiatry": ["PHQ-9 score", "Sleep and appetite history", "Substance-use screen"],
    "Pulmonology": ["Chest radiograph", "Spirometry if available", "Smoking history"],
    "Gastroenterology": ["CBC", "Liver function tests", "Abdominal ultrasound if indicated"],
    "Dermatology": ["Clinical photographs of the lesion", "Onset and progression history"],
    "Neurology": ["Blood pressure log", "Medication list", "Duration and character of symptoms"],
}


def _referral_dict(referral: Referral) -> dict:
    return {
        "id": referral.id,
        "patient_id": referral.patient_id,
        "encounter_id": referral.encounter_id,
        "specialty": referral.specialty,
        "persian_specialty": referral.persian_specialty,
        "urgency": referral.urgency,
        "reason": referral.reason,
        "workup": referral.workup or [],
        "target_facility": referral.target_facility,
        "status": referral.status,
        "created_at": referral.created_at,
        "sent_at": referral.sent_at,
        "outcome": referral.outcome,
        "notes": referral.notes,
    }


@router.get("", summary="List referrals")
def list_referrals(
    patient_id: str | None = None,
    status: str | None = None,
    specialty: str | None = None,
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
) -> dict:
    stmt = select(Referral).order_by(Referral.created_at.desc())
    if patient_id:
        stmt = stmt.where(Referral.patient_id == patient_id)
    if status:
        stmt = stmt.where(Referral.status == status)
    if specialty:
        stmt = stmt.where(Referral.specialty == specialty)
    rows = list(db.scalars(stmt))
    total = len(rows)
    return {
        "items": [_referral_dict(r) for r in rows[offset : offset + limit]],
        "total": total,
        "limit": limit,
        "offset": offset,
    }


@router.post("", status_code=201, summary="Create a referral (optionally send it immediately)")
def create_referral(
    payload: ReferralCreate,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(require_capability("write_referral")),
) -> dict:
    patient = db.scalar(
        select(Patient).options(selectinload(Patient.conditions), selectinload(Patient.medications)).where(Patient.id == payload.patient_id)
    )
    if patient is None:
        raise HTTPException(status_code=404, detail="Patient not found")

    workup = list(payload.workup) or SPECIALTY_WORKUP.get(payload.specialty, [])
    now = dt.datetime.now(dt.timezone.utc)
    referral = Referral(
        patient_id=patient.id,
        encounter_id=payload.encounter_id,
        specialty=payload.specialty,
        persian_specialty=payload.persian_specialty,
        urgency=payload.urgency,
        reason=payload.reason,
        workup=workup,
        target_facility=payload.target_facility,
        notes=payload.notes,
        clinician_id=user.id,
        status="SENT" if payload.send else "DRAFT",
        sent_at=now if payload.send else None,
    )
    db.add(referral)
    db.flush()
    record_for_user(
        db,
        user,
        action="referral.create",
        entity_type="referral",
        entity_id=referral.id,
        detail={"patient_id": patient.id, "specialty": referral.specialty, "urgency": referral.urgency},
        source_ip=request.client.host if request.client else None,
    )

    transaction_id = None
    if payload.send:
        transaction = SyncTransaction(
            patient_id=patient.id,
            kind="REFERRAL",
            summary=[
                f"ارجاع {referral.urgency} به {referral.persian_specialty or referral.specialty} "
                f"برای {patient.persian_name or patient.name}"
            ],
            payload={
                "patient": {"id": patient.id, "national_id": patient.national_id},
                "referral": _referral_dict(referral),
            },
            clinician_name=user.full_name,
            status="QUEUED",
        )
        db.add(transaction)
        db.flush()
        transaction_id = transaction.id
        db.commit()
        sib_bridge.process_transaction(db, transaction)
        db.refresh(transaction)
        transaction_id = transaction.id

    db.commit()
    data = _referral_dict(referral)
    data["sync_transaction_id"] = transaction_id
    return data


@router.get("/{referral_id}", summary="Referral detail")
def get_referral(
    referral_id: str,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
) -> dict:
    referral = db.get(Referral, referral_id)
    if referral is None:
        raise HTTPException(status_code=404, detail="Referral not found")
    return _referral_dict(referral)


@router.patch("/{referral_id}", summary="Update referral status / outcome")
def update_referral(
    referral_id: str,
    payload: ReferralUpdate,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(require_capability("write_referral")),
) -> dict:
    referral = db.get(Referral, referral_id)
    if referral is None:
        raise HTTPException(status_code=404, detail="Referral not found")
    changes = payload.model_dump(exclude_unset=True)
    if changes.get("status") == "SENT" and referral.status == "DRAFT":
        referral.sent_at = dt.datetime.now(dt.timezone.utc)
    for key, value in changes.items():
        setattr(referral, key, value)
    record_for_user(
        db,
        user,
        action="referral.update",
        entity_type="referral",
        entity_id=referral.id,
        detail={"changed": {k: str(v) for k, v in changes.items()}},
        source_ip=request.client.host if request.client else None,
    )
    db.commit()
    return _referral_dict(referral)


@router.get("/{referral_id}/slip", summary="Printable referral slip (clinic + patient + checklist)")
def referral_slip(
    referral_id: str,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
) -> dict:
    referral = db.get(Referral, referral_id)
    if referral is None:
        raise HTTPException(status_code=404, detail="Referral not found")
    patient = db.get(Patient, referral.patient_id)
    encounter = db.get(Encounter, referral.encounter_id) if referral.encounter_id else None
    return {
        "slip_number": referral.id,
        "issued_jalali": to_jalali_str(referral.created_at),
        "urgency": referral.urgency,
        "specialty": referral.specialty,
        "persian_specialty": referral.persian_specialty,
        "target_facility": referral.target_facility,
        "reason": referral.reason,
        "workup_checklist": referral.workup or [],
        "patient": {
            "id": patient.id,
            "name": patient.persian_name or patient.name,
            "national_id": patient.national_id,
            "age": age_from_birth_date(patient.birth_date),
            "gender": patient.gender,
            "household_number": patient.household_number,
            "insurance": patient.insurance_type,
            "phone": patient.phone,
        }
        if patient
        else None,
        "referring_clinician": encounter.clinician.full_name if encounter and encounter.clinician else None,
        "visit": {
            "id": encounter.id,
            "jalali_date": encounter.jalali_date,
            "chief_complaint": encounter.chief_complaint,
            "assessment": encounter.assessment,
            "vitals": encounter.vitals_snapshot,
        }
        if encounter
        else None,
        "status": referral.status,
    }