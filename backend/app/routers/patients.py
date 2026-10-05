"""Patient endpoints: search, chart, vitals, preventive care, quality issues."""
from __future__ import annotations

import datetime as dt

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy import or_, select
from sqlalchemy.orm import Session, selectinload

from ..audit import record_for_user
from ..database import get_db
from ..models import Condition, DataQualityIssue, Medication, Patient, User, Vital
from ..schemas import (
    PatientCreate,
    PatientListResponse,
    PatientUpdate,
    VitalIn,
)
from ..security import get_current_user, require_capability
from ..serializers import encounter_to_dict, patient_detail, patient_summary
from ..services import clinical_rules
from ..utils import bmi_for, to_jalali_str, validate_national_id

router = APIRouter(prefix="/api/patients", tags=["patients"])


def _load(db: Session, patient_id: str) -> Patient:
    patient = db.scalar(
        select(Patient)
        .options(
            selectinload(Patient.conditions),
            selectinload(Patient.medications),
            selectinload(Patient.vitals),
            selectinload(Patient.encounters),
            selectinload(Patient.preventive_care),
            selectinload(Patient.quality_issues),
            selectinload(Patient.referrals),
            selectinload(Patient.service_requests),
        )
        .where(Patient.id == patient_id)
    )
    if patient is None:
        raise HTTPException(status_code=404, detail=f"Patient '{patient_id}' not found")
    return patient


def _search(db: Session, query: str) -> list[Patient]:
    stmt = select(Patient).options(
        selectinload(Patient.conditions),
        selectinload(Patient.encounters),
        selectinload(Patient.quality_issues),
    )
    if query:
        pattern = f"%{query.strip()}%"
        stmt = stmt.where(
            or_(
                Patient.name.ilike(pattern),
                Patient.persian_name.ilike(pattern),
                Patient.national_id.like(pattern),
                Patient.phone.ilike(pattern),
                Patient.household_number.ilike(pattern),
            )
        )
    return list(db.scalars(stmt.order_by(Patient.persian_name)))


@router.get("", response_model=PatientListResponse, summary="Search / list patients")
def list_patients(
    query: str = Query("", description="Name, national ID, phone or household number"),
    limit: int = Query(25, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
) -> PatientListResponse:
    matches = _search(db, query)
    total = len(matches)
    page = matches[offset : offset + limit]
    items = []
    for patient in page:
        risk = clinical_rules.cvd_risk(patient)
        items.append(patient_summary(patient, risk_category=risk.get("colorCategory")))
    return PatientListResponse(items=items, total=total, limit=limit, offset=offset)


@router.post("", status_code=201, summary="Register a new patient in the household file")
def create_patient(
    payload: PatientCreate,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(require_capability("write_visit")),
) -> dict:
    if not validate_national_id(payload.national_id):
        raise HTTPException(status_code=422, detail="National ID fails the Iranian check-digit rule")
    if db.scalar(select(Patient).where(Patient.national_id == payload.national_id)):
        raise HTTPException(status_code=409, detail="A patient with this national ID already exists")

    patient = Patient(
        national_id=payload.national_id,
        name=payload.name,
        persian_name=payload.persian_name or payload.name,
        gender=payload.gender,
        birth_date=payload.birth_date,
        birth_date_jalali=to_jalali_str(payload.birth_date),
        household_number=payload.household_number,
        health_center=payload.health_center,
        health_house=payload.health_house,
        assigned_behvarz=payload.assigned_behvarz,
        phone=payload.phone,
        insurance_type=payload.insurance_type,
        blood_type=payload.blood_type,
        smoker=payload.smoker,
        notes=payload.notes,
    )
    for condition in payload.conditions:
        patient.conditions.append(
            Condition(
                name=condition.get("name", ""),
                persian_name=condition.get("persian_name", ""),
                since_jalali=condition.get("since_jalali"),
                control_status=condition.get("control_status", "SUBOPTIMAL"),
            )
        )
    for medication in payload.medications:
        patient.medications.append(
            Medication(
                name=medication.get("name", ""),
                dosage=medication.get("dosage"),
                frequency=medication.get("frequency"),
                compliance_reported=medication.get("compliance_reported", "UNKNOWN"),
                indication=medication.get("indication"),
            )
        )
    db.add(patient)
    db.flush()

    if payload.initial_vitals:
        _add_vitals(db, patient, payload.initial_vitals, user)

    record_for_user(
        db,
        user,
        action="patient.create",
        entity_type="patient",
        entity_id=patient.id,
        detail={"national_id": patient.national_id, "name": patient.persian_name},
        source_ip=request.client.host if request.client else None,
    )
    db.commit()
    return patient_detail(_load(db, patient.id))


@router.get("/{patient_id}", summary="Full patient chart (chart, risk, suggestions, alerts)")
def get_patient(
    patient_id: str,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
) -> dict:
    patient = _load(db, patient_id)
    detail = patient_detail(patient)
    db.commit()  # persist the refreshed preventive-care cache
    return detail


@router.patch("/{patient_id}", summary="Update demographic / administrative fields")
def update_patient(
    patient_id: str,
    payload: PatientUpdate,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(require_capability("write_visit")),
) -> dict:
    patient = _load(db, patient_id)
    changes = payload.model_dump(exclude_unset=True)
    for key, value in changes.items():
        setattr(patient, key, value)
    record_for_user(
        db,
        user,
        action="patient.update",
        entity_type="patient",
        entity_id=patient.id,
        detail={"changed": sorted(changes.keys())},
        source_ip=request.client.host if request.client else None,
    )
    db.commit()
    return patient_detail(_load(db, patient_id))


# --------------------------------------------------------------------------- #
# Vitals
# --------------------------------------------------------------------------- #
def _add_vitals(db: Session, patient: Patient, payload: VitalIn, user: User | None) -> Vital:
    measured_at = payload.measured_at or dt.datetime.now(dt.timezone.utc)
    vital = Vital(
        patient_id=patient.id,
        measured_at=measured_at,
        jalali_date=to_jalali_str(measured_at),
        bp_systolic=payload.bp_systolic,
        bp_diastolic=payload.bp_diastolic,
        heart_rate=payload.heart_rate,
        weight_kg=payload.weight_kg,
        height_cm=payload.height_cm,
        bmi=bmi_for(payload.weight_kg, payload.height_cm),
        fasting_blood_sugar=payload.fasting_blood_sugar,
        hba1c=payload.hba1c,
        total_cholesterol=payload.total_cholesterol,
        measured_by=payload.measured_by or (user.full_name if user else None),
        recorded_in=payload.recorded_in or "Ω-SIB vitals module",
    )
    db.add(vital)
    db.flush()
    return vital


@router.get("/{patient_id}/vitals", summary="Vitals history (most recent first)")
def list_vitals(
    patient_id: str,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
) -> dict:
    patient = _load(db, patient_id)
    rows = sorted(patient.vitals, key=lambda v: v.measured_at, reverse=True)
    return {
        "items": [
            {
                "id": v.id,
                "measured_at": v.measured_at,
                "jalali_date": v.jalali_date,
                "bp_systolic": v.bp_systolic,
                "bp_diastolic": v.bp_diastolic,
                "heart_rate": v.heart_rate,
                "weight_kg": v.weight_kg,
                "height_cm": v.height_cm,
                "bmi": v.bmi,
                "fasting_blood_sugar": v.fasting_blood_sugar,
                "hba1c": v.hba1c,
                "total_cholesterol": v.total_cholesterol,
                "measured_by": v.measured_by,
                "recorded_in": v.recorded_in,
            }
            for v in rows
        ],
        "total": len(rows),
    }


@router.post("/{patient_id}/vitals", status_code=201, summary="Record a vitals set")
def create_vitals(
    patient_id: str,
    payload: VitalIn,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(require_capability("write_vitals")),
) -> dict:
    patient = _load(db, patient_id)
    vital = _add_vitals(db, patient, payload, user)
    record_for_user(
        db,
        user,
        action="vitals.create",
        entity_type="vital",
        entity_id=vital.id,
        detail={"patient_id": patient.id, "bp": f"{vital.bp_systolic}/{vital.bp_diastolic}"},
        source_ip=request.client.host if request.client else None,
    )
    db.commit()
    return {
        "id": vital.id,
        "jalali_date": vital.jalali_date,
        "bmi": vital.bmi,
        "risk": clinical_rules.cvd_risk(_load(db, patient_id)),
    }


# --------------------------------------------------------------------------- #
# Preventive care / quality / risk / suggestions
# --------------------------------------------------------------------------- #
@router.get("/{patient_id}/preventive-care", summary="Preventive-care and chronic follow-up status")
def get_preventive_care(
    patient_id: str,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
) -> dict:
    patient = _load(db, patient_id)
    gaps = clinical_rules.refresh_preventive_care(patient)
    db.commit()
    return {"items": gaps, "summary": clinical_rules.care_gap_summary(gaps)}


@router.get("/{patient_id}/quality-issues", summary="Data-quality findings for the patient")
def get_quality_issues(
    patient_id: str,
    include_resolved: bool = False,
    db: Session = Depends(get_db),
    user: User = Depends(require_capability("read")),
) -> dict:
    patient = _load(db, patient_id)
    issues = [i for i in patient.quality_issues if include_resolved or not i.resolved]
    if not issues and not include_resolved:
        # First call for a patient whose chart has never been audited: run the
        # deterministic audit and persist the findings.
        for finding in clinical_rules.data_quality_audit(patient):
            patient.quality_issues.append(
                DataQualityIssue(
                    severity=finding["severity"],
                    type=finding["type"],
                    title=finding["title"],
                    description=finding["description"],
                    sib_location=finding["sibLocation"],
                    suggested_correction=finding["suggestedCorrection"],
                )
            )
        db.commit()
        issues = [i for i in patient.quality_issues if not i.resolved]
    return {
        "items": [
            {
                "id": i.id,
                "severity": i.severity,
                "type": i.type,
                "title": i.title,
                "description": i.description,
                "sib_location": i.sib_location,
                "suggested_correction": i.suggested_correction,
                "resolved": i.resolved,
                "resolved_at": i.resolved_at,
                "resolved_by": i.resolved_by,
            }
            for i in issues
        ],
        "total": len(issues),
    }


@router.post("/{patient_id}/quality-issues/audit", summary="Re-run the deterministic data-quality audit")
def run_quality_audit(
    patient_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(require_capability("write_visit")),
) -> dict:
    patient = _load(db, patient_id)
    existing = {(i.title, i.type) for i in patient.quality_issues}
    created = 0
    for finding in clinical_rules.data_quality_audit(patient):
        if (finding["title"], finding["type"]) in existing:
            continue
        patient.quality_issues.append(
            DataQualityIssue(
                severity=finding["severity"],
                type=finding["type"],
                title=finding["title"],
                description=finding["description"],
                sib_location=finding["sibLocation"],
                suggested_correction=finding["suggestedCorrection"],
            )
        )
        created += 1
    record_for_user(
        db,
        user,
        action="quality.audit",
        entity_type="patient",
        entity_id=patient.id,
        detail={"new_findings": created},
    )
    db.commit()
    return {"created": created, "total": len(patient.quality_issues)}


@router.post("/{patient_id}/quality-issues/{issue_id}/resolve", summary="Resolve a data-quality finding")
def resolve_quality_issue(
    patient_id: str,
    issue_id: str,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(require_capability("write_visit")),
) -> dict:
    issue = db.get(DataQualityIssue, issue_id)
    if issue is None or issue.patient_id != patient_id:
        raise HTTPException(status_code=404, detail="Quality issue not found for this patient")
    issue.resolved = True
    issue.resolved_at = dt.datetime.now(dt.timezone.utc)
    issue.resolved_by = user.full_name
    record_for_user(
        db,
        user,
        action="quality.resolve",
        entity_type="quality_issue",
        entity_id=issue.id,
        detail={"title": issue.title},
        source_ip=request.client.host if request.client else None,
    )
    db.commit()
    return {"id": issue.id, "resolved": True, "resolved_by": issue.resolved_by}


@router.get("/{patient_id}/risk", summary="Cardiovascular risk estimate (IraPEN style, simplified)")
def get_risk(
    patient_id: str,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
) -> dict:
    return clinical_rules.cvd_risk(_load(db, patient_id))


@router.get("/{patient_id}/suggestions", summary="Priority-ordered clinical suggestions")
def get_suggestions(
    patient_id: str,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
) -> dict:
    patient = _load(db, patient_id)
    pending_codes = [r.service.code for r in patient.service_requests if r.service and r.status in {"REQUESTED", "SCHEDULED"}]
    return {
        "items": clinical_rules.suggestions(patient, pending_codes),
        "alerts": clinical_rules.drug_alerts(patient, pending_codes),
    }


@router.get("/{patient_id}/encounters", summary="Visit history for a patient")
def get_patient_encounters(
    patient_id: str,
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
) -> dict:
    patient = _load(db, patient_id)
    rows = sorted(patient.encounters, key=lambda e: e.occurred_at, reverse=True)[:limit]
    return {"items": [encounter_to_dict(e) for e in rows], "total": len(patient.encounters)}
