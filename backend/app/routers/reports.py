"""Clinical and administrative reporting."""
from __future__ import annotations

import datetime as dt
from collections import Counter

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from ..database import get_db
from ..models import (
    DataQualityIssue,
    Encounter,
    Patient,
    Referral,
    ServiceRequest,
    SyncTransaction,
    User,
)
from ..security import get_current_user, require_capability
from ..services import clinical_rules
from ..utils import to_jalali_str, validate_national_id

router = APIRouter(prefix="/api/reports", tags=["reports"])


def _load_all(db: Session) -> list[Patient]:
    return list(
        db.scalars(
            select(Patient).options(
                selectinload(Patient.conditions),
                selectinload(Patient.medications),
                selectinload(Patient.vitals),
                selectinload(Patient.encounters),
                selectinload(Patient.preventive_care),
                selectinload(Patient.quality_issues),
                selectinload(Patient.service_requests),
            )
        )
    )


@router.get("/summary", summary="Practice dashboard summary")
def summary(
    db: Session = Depends(get_db),
    _: User = Depends(require_capability("reports")),
) -> dict:
    patients = _load_all(db)
    today = dt.date.today()
    month_start = today.replace(day=1)

    encounters = list(db.scalars(select(Encounter)))
    referrals = list(db.scalars(select(Referral)))
    service_requests = list(db.scalars(select(ServiceRequest).options(selectinload(ServiceRequest.service))))
    transactions = list(db.scalars(select(SyncTransaction)))

    visits_this_month = [e for e in encounters if e.occurred_at.date() >= month_start]
    drafts = [e for e in encounters if e.status == "DRAFT"]

    risk_distribution: Counter[str] = Counter()
    overdue_items: Counter[str] = Counter()
    overdue_patients: set[str] = set()
    for patient in patients:
        risk = clinical_rules.cvd_risk(patient)
        risk_distribution[str(risk.get("colorCategory"))] += 1
        for gap in clinical_rules.care_gaps(patient):
            if gap["status"] == "OVERDUE":
                overdue_items[gap["category"]] += 1
                overdue_patients.add(patient.id)

    diagnosis_counter: Counter[str] = Counter()
    for encounter in encounters:
        for diagnosis in encounter.assessment or []:
            diagnosis_counter[str(diagnosis).strip()] += 1

    return {
        "generated_at": dt.datetime.now(dt.timezone.utc),
        "jalali_date": to_jalali_str(today),
        "patients": {
            "total": len(patients),
            "with_chronic_condition": len([p for p in patients if clinical_rules.active_conditions(p)]),
            "smokers": len([p for p in patients if p.smoker]),
        },
        "visits": {
            "total": len(encounters),
            "this_month": len(visits_this_month),
            "drafts_uncommitted": len(drafts),
            "committed": len([e for e in encounters if e.status == "COMMITTED"]),
        },
        "referrals": {
            "total": len(referrals),
            "open": len([r for r in referrals if r.status in {"DRAFT", "SENT", "ACCEPTED"}]),
            "by_status": dict(Counter(r.status for r in referrals)),
            "by_specialty": dict(Counter(r.specialty for r in referrals)),
        },
        "services": {
            "total": len(service_requests),
            "pending": len([s for s in service_requests if s.status in {"REQUESTED", "SCHEDULED"}]),
            "by_category": dict(
                Counter(s.service.category for s in service_requests if s.service)
            ),
        },
        "sync": {
            "queued": len([t for t in transactions if t.status == "QUEUED"]),
            "synced": len([t for t in transactions if t.status == "SYNCED"]),
            "failed": len([t for t in transactions if t.status == "FAILED"]),
        },
        "risk_distribution": dict(risk_distribution),
        "care_gaps": {
            "overdue_patients": len(overdue_patients),
            "overdue_items_total": sum(overdue_items.values()),
            "top_overdue": [{"category": k, "patients": v} for k, v in overdue_items.most_common(5)],
        },
        "top_diagnoses": [{"diagnosis": k, "count": v} for k, v in diagnosis_counter.most_common(5)],
    }


@router.get("/care-gaps", summary="Care-gap worklist across the panel")
def care_gaps(
    db: Session = Depends(get_db),
    _: User = Depends(require_capability("reports")),
) -> dict:
    patients = _load_all(db)
    rows: list[dict] = []
    for patient in patients:
        for gap in clinical_rules.care_gaps(patient):
            if gap["status"] in {"DUE", "OVERDUE"}:
                rows.append(
                    {
                        "patient_id": patient.id,
                        "patient": patient.persian_name or patient.name,
                        "national_id": patient.national_id,
                        "category": gap["category"],
                        "persian_category": gap["persianCategory"],
                        "status": gap["status"],
                        "last_done_jalali": gap["lastDoneJalali"],
                        "next_due_jalali": gap["nextDueJalali"],
                        "guideline": gap["guideline"],
                    }
                )
    order = {"OVERDUE": 0, "DUE": 1}
    rows.sort(key=lambda r: (order.get(r["status"], 2), r["patient"]))
    return {
        "items": rows,
        "total": len(rows),
        "overdue": len([r for r in rows if r["status"] == "OVERDUE"]),
    }


@router.get("/data-quality", summary="Data-quality report (persisted + live checks)")
def data_quality(
    db: Session = Depends(get_db),
    _: User = Depends(require_capability("reports")),
) -> dict:
    patients = _load_all(db)
    stored = list(db.scalars(select(DataQualityIssue)))

    live_findings: list[dict] = []
    for patient in patients:
        for finding in clinical_rules.data_quality_audit(patient):
            live_findings.append(
                {
                    "patient_id": patient.id,
                    "patient": patient.persian_name or patient.name,
                    "severity": finding["severity"],
                    "type": finding["type"],
                    "title": finding["title"],
                    "suggested_correction": finding["suggestedCorrection"],
                }
            )

    ids = Counter(p.national_id for p in patients)
    duplicates = [{"national_id": nid, "count": count} for nid, count in ids.items() if count > 1]
    invalid = [
        {"patient_id": p.id, "patient": p.persian_name or p.name, "national_id": p.national_id}
        for p in patients
        if not validate_national_id(p.national_id)
    ]

    return {
        "stored_issues": {
            "total": len(stored),
            "open": len([i for i in stored if not i.resolved]),
            "by_severity": dict(Counter(i.severity for i in stored)),
        },
        "live_findings": {
            "total": len(live_findings),
            "by_severity": dict(Counter(f["severity"] for f in live_findings)),
            "items": live_findings[:100],
        },
        "identity": {"duplicate_national_ids": duplicates, "invalid_national_ids": invalid},
        "completeness": {
            "missing_phone": len([p for p in patients if not p.phone]),
            "missing_household_number": len([p for p in patients if not p.household_number]),
            "missing_birth_date": len([p for p in patients if not p.birth_date]),
            "without_any_vitals": len([p for p in patients if not p.vitals]),
        },
    }