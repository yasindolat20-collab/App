"""Response shaping shared by several routers."""
from __future__ import annotations

from typing import Any

from .models import Encounter, Patient, ServiceRequest
from .services import clinical_rules
from .utils import age_from_birth_date, to_jalali_str


def encounter_to_dict(encounter: Encounter) -> dict[str, Any]:
    return {
        "id": encounter.id,
        "patient_id": encounter.patient_id,
        "occurred_at": encounter.occurred_at,
        "jalali_date": encounter.jalali_date or to_jalali_str(encounter.occurred_at),
        "facility": encounter.facility,
        "clinician_role": encounter.clinician_role,
        "chief_complaint": encounter.chief_complaint,
        "subjective": encounter.subjective,
        "objective": encounter.objective,
        "physical_findings": encounter.physical_findings,
        "assessment": encounter.assessment or [],
        "icd_codes": encounter.icd_codes or [],
        "plan": encounter.plan or [],
        "prescriptions": encounter.prescriptions or [],
        "lab_orders": encounter.lab_orders or [],
        "vitals_snapshot": encounter.vitals_snapshot or {},
        "referral_requested": encounter.referral_requested,
        "referral_specialty": encounter.referral_specialty,
        "follow_up_days": encounter.follow_up_days,
        "sib_module": encounter.sib_module,
        "status": encounter.status,
        "committed_at": encounter.committed_at,
        "sib_transaction_id": encounter.sib_transaction_id,
        "created_at": encounter.created_at,
    }


def service_request_to_dict(request: ServiceRequest) -> dict[str, Any]:
    service = request.service
    return {
        "id": request.id,
        "patient_id": request.patient_id,
        "encounter_id": request.encounter_id,
        "service_id": request.service_id,
        "status": request.status,
        "requested_at": request.requested_at,
        "scheduled_for": request.scheduled_for,
        "result_summary": request.result_summary,
        "resulted_at": request.resulted_at,
        "requested_by": request.requested_by,
        "notes": request.notes,
        "service_name": service.name if service else None,
        "service_persian_name": service.persian_name if service else None,
    }


def patient_summary(patient: Patient, risk_category: str | None = None) -> dict[str, Any]:
    encounters = sorted(patient.encounters, key=lambda e: e.occurred_at, reverse=True)
    last = encounters[0] if encounters else None
    return {
        "id": patient.id,
        "national_id": patient.national_id,
        "name": patient.name,
        "persian_name": patient.persian_name,
        "gender": patient.gender,
        "age": age_from_birth_date(patient.birth_date),
        "birth_date_jalali": patient.birth_date_jalali,
        "household_number": patient.household_number,
        "health_center": patient.health_center,
        "health_house": patient.health_house,
        "assigned_behvarz": patient.assigned_behvarz,
        "phone": patient.phone,
        "insurance_type": patient.insurance_type,
        "blood_type": patient.blood_type,
        "smoker": patient.smoker,
        "last_visit_jalali": last.jalali_date if last else None,
        "last_visit_at": last.occurred_at if last else None,
        "condition_count": len(clinical_rules.active_conditions(patient)),
        "open_issue_count": len([i for i in patient.quality_issues if not i.resolved]),
        "risk_category": risk_category,
    }


def patient_detail(patient: Patient) -> dict[str, Any]:
    """Full chart: everything the clinician screen needs in one round-trip."""
    risk = clinical_rules.cvd_risk(patient)
    pending_codes = [
        req.service.code for req in patient.service_requests if req.status in {"REQUESTED", "SCHEDULED"} and req.service
    ]
    gaps = clinical_rules.refresh_preventive_care(patient)
    data = patient_summary(patient, risk_category=risk.get("colorCategory"))
    data.update(
        {
            "conditions": [
                {
                    "id": c.id,
                    "name": c.name,
                    "persian_name": c.persian_name,
                    "since_jalali": c.since_jalali,
                    "control_status": c.control_status,
                    "active": c.active,
                }
                for c in patient.conditions
            ],
            "medications": [
                {
                    "id": m.id,
                    "name": m.name,
                    "dosage": m.dosage,
                    "frequency": m.frequency,
                    "compliance_reported": m.compliance_reported,
                    "indication": m.indication,
                    "last_dispensed_jalali": m.last_dispensed_jalali,
                    "refills_count": m.refills_count,
                    "monitoring_notes": m.monitoring_notes,
                    "prescribed_by": m.prescribed_by,
                    "active": m.active,
                }
                for m in patient.medications
            ],
            "vitals": [
                {
                    "id": v.id,
                    "measured_at": v.measured_at,
                    "jalali_date": v.jalali_date or to_jalali_str(v.measured_at),
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
                for v in sorted(patient.vitals, key=lambda v: v.measured_at, reverse=True)
            ],
            "encounters": [
                encounter_to_dict(e)
                for e in sorted(patient.encounters, key=lambda e: e.occurred_at, reverse=True)
            ],
            "preventive_care": [
                {
                    "id": row.id,
                    "category": row.category,
                    "persian_category": row.persian_category,
                    "status": row.status,
                    "last_done_jalali": row.last_done_jalali,
                    "next_due_jalali": row.next_due_jalali,
                    "interval_months": row.interval_months,
                    "details": row.details,
                    "guideline": row.guideline,
                    "source": "schedule"
                    if row.category in clinical_rules.schedule_categories()
                    else "recorded",
                }
                for row in sorted(patient.preventive_care, key=lambda r: r.category)
            ],
            "quality_issues": [
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
                for i in patient.quality_issues
            ],
            "referrals": [
                {
                    "id": r.id,
                    "patient_id": r.patient_id,
                    "encounter_id": r.encounter_id,
                    "specialty": r.specialty,
                    "persian_specialty": r.persian_specialty,
                    "urgency": r.urgency,
                    "reason": r.reason,
                    "workup": r.workup or [],
                    "target_facility": r.target_facility,
                    "status": r.status,
                    "created_at": r.created_at,
                    "sent_at": r.sent_at,
                    "outcome": r.outcome,
                    "notes": r.notes,
                }
                for r in sorted(patient.referrals, key=lambda r: r.created_at, reverse=True)
            ],
            "service_requests": [
                service_request_to_dict(r)
                for r in sorted(patient.service_requests, key=lambda r: r.requested_at, reverse=True)
            ],
            "risk": risk,
            "suggestions": clinical_rules.suggestions(patient, pending_codes),
            "alerts": clinical_rules.drug_alerts(patient, pending_codes),
            "care_gap_summary": clinical_rules.care_gap_summary(gaps),
        }
    )
    return data
