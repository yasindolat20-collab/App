"""Pydantic request/response models (the public API contract)."""
from __future__ import annotations

import datetime as dt
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field


class ORMModel(BaseModel):
    model_config = ConfigDict(from_attributes=True)


# --------------------------------------------------------------------------- #
# Auth
# --------------------------------------------------------------------------- #
class LoginRequest(BaseModel):
    username: str
    password: str
    pin: str | None = Field(default=None, description="Clinical e-signature PIN (optional)")


class UserOut(ORMModel):
    id: int
    username: str
    full_name: str
    role: str
    medical_council_no: str | None = None
    facility: str | None = None


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in_minutes: int
    user: UserOut


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str = Field(min_length=6)
    new_pin: str | None = Field(default=None, min_length=4, max_length=8)


# --------------------------------------------------------------------------- #
# Patients
# --------------------------------------------------------------------------- #
class ConditionOut(ORMModel):
    id: int
    name: str
    persian_name: str = ""
    since_jalali: str | None = None
    control_status: str
    active: bool


class MedicationOut(ORMModel):
    id: int
    name: str
    dosage: str | None = None
    frequency: str | None = None
    compliance_reported: str
    indication: str | None = None
    last_dispensed_jalali: str | None = None
    refills_count: int | None = None
    monitoring_notes: str | None = None
    prescribed_by: str | None = None
    active: bool


class VitalIn(BaseModel):
    bp_systolic: int | None = None
    bp_diastolic: int | None = None
    heart_rate: int | None = None
    weight_kg: float | None = None
    height_cm: float | None = None
    fasting_blood_sugar: float | None = None
    hba1c: float | None = None
    total_cholesterol: float | None = None
    measured_by: str | None = None
    recorded_in: str | None = None
    measured_at: dt.datetime | None = None


class VitalOut(ORMModel):
    id: int
    measured_at: dt.datetime
    jalali_date: str | None = None
    bp_systolic: int | None = None
    bp_diastolic: int | None = None
    heart_rate: int | None = None
    weight_kg: float | None = None
    height_cm: float | None = None
    bmi: float | None = None
    fasting_blood_sugar: float | None = None
    hba1c: float | None = None
    total_cholesterol: float | None = None
    measured_by: str | None = None
    recorded_in: str | None = None


class EncounterOut(ORMModel):
    id: str
    patient_id: str
    occurred_at: dt.datetime
    jalali_date: str | None = None
    facility: str | None = None
    clinician_role: str
    chief_complaint: str | None = None
    subjective: str | None = None
    objective: str | None = None
    physical_findings: str | None = None
    assessment: list[Any] = []
    icd_codes: list[Any] = []
    plan: list[Any] = []
    prescriptions: list[Any] = []
    lab_orders: list[Any] = []
    vitals_snapshot: dict[str, Any] = {}
    referral_requested: bool = False
    referral_specialty: str | None = None
    follow_up_days: int | None = None
    sib_module: str
    status: str
    committed_at: dt.datetime | None = None
    sib_transaction_id: str | None = None
    created_at: dt.datetime


class PreventiveCareOut(ORMModel):
    id: int
    category: str
    persian_category: str = ""
    status: str
    last_done_jalali: str | None = None
    next_due_jalali: str | None = None
    interval_months: int | None = None
    details: str | None = None
    guideline: str | None = None


class QualityIssueOut(ORMModel):
    id: str
    severity: str
    type: str
    title: str
    description: str
    sib_location: str | None = None
    suggested_correction: str | None = None
    resolved: bool
    resolved_at: dt.datetime | None = None
    resolved_by: str | None = None


class ReferralOut(ORMModel):
    id: str
    patient_id: str
    encounter_id: str | None = None
    specialty: str
    persian_specialty: str = ""
    urgency: str
    reason: str
    workup: list[Any] = []
    target_facility: str | None = None
    status: str
    created_at: dt.datetime
    sent_at: dt.datetime | None = None
    outcome: str | None = None
    notes: str | None = None


class ServiceRequestOut(ORMModel):
    id: str
    patient_id: str
    encounter_id: str | None = None
    service_id: int
    status: str
    requested_at: dt.datetime
    scheduled_for: dt.datetime | None = None
    result_summary: str | None = None
    resulted_at: dt.datetime | None = None
    requested_by: str | None = None
    notes: str | None = None
    service_name: str | None = None
    service_persian_name: str | None = None


class PatientSummary(ORMModel):
    id: str
    national_id: str
    name: str
    persian_name: str
    gender: str
    age: int | None = None
    birth_date_jalali: str | None = None
    household_number: str | None = None
    health_center: str | None = None
    health_house: str | None = None
    assigned_behvarz: str | None = None
    phone: str | None = None
    insurance_type: str | None = None
    blood_type: str | None = None
    smoker: bool = False
    last_visit_jalali: str | None = None
    last_visit_at: dt.datetime | None = None
    condition_count: int = 0
    open_issue_count: int = 0
    risk_category: str | None = None


class PatientDetail(PatientSummary):
    conditions: list[ConditionOut] = []
    medications: list[MedicationOut] = []
    vitals: list[VitalOut] = []
    encounters: list[EncounterOut] = []
    preventive_care: list[PreventiveCareOut] = []
    quality_issues: list[QualityIssueOut] = []
    referrals: list[ReferralOut] = []
    service_requests: list[ServiceRequestOut] = []
    risk: dict[str, Any] | None = None
    suggestions: list[dict[str, Any]] = []
    alerts: list[dict[str, Any]] = []


class PatientCreate(BaseModel):
    national_id: str = Field(min_length=10, max_length=10)
    name: str
    persian_name: str = ""
    gender: Literal["F", "M"] = "F"
    birth_date: dt.date | None = None
    household_number: str | None = None
    health_center: str | None = None
    health_house: str | None = None
    assigned_behvarz: str | None = None
    phone: str | None = None
    insurance_type: str | None = None
    blood_type: str | None = None
    smoker: bool = False
    notes: str | None = None
    conditions: list[dict[str, Any]] = []
    medications: list[dict[str, Any]] = []
    initial_vitals: VitalIn | None = None


class PatientUpdate(BaseModel):
    phone: str | None = None
    household_number: str | None = None
    health_center: str | None = None
    health_house: str | None = None
    assigned_behvarz: str | None = None
    insurance_type: str | None = None
    blood_type: str | None = None
    smoker: bool | None = None
    notes: str | None = None


class PatientListResponse(BaseModel):
    items: list[PatientSummary]
    total: int
    limit: int
    offset: int


# --------------------------------------------------------------------------- #
# Encounters
# --------------------------------------------------------------------------- #
class EncounterCreate(BaseModel):
    patient_id: str
    chief_complaint: str | None = None
    subjective: str | None = None
    objective: str | None = None
    physical_findings: str | None = None
    assessment: list[str] = []
    icd_codes: list[str] = []
    plan: list[str] = []
    prescriptions: list[dict[str, Any]] = []
    lab_orders: list[str] = []
    referral_requested: bool = False
    referral_specialty: str | None = None
    follow_up_days: int | None = None
    clinician_role: str = "Family Physician"
    facility: str | None = None
    vitals: VitalIn | None = None
    commit: bool = False
    pin: str | None = None


class CommitRequest(BaseModel):
    pin: str | None = None
    summary_override: list[str] | None = None


# --------------------------------------------------------------------------- #
# Referrals / services
# --------------------------------------------------------------------------- #
class ReferralCreate(BaseModel):
    patient_id: str
    encounter_id: str | None = None
    specialty: str
    persian_specialty: str = ""
    urgency: Literal["ROUTINE", "URGENT", "EMERGENCY"] = "ROUTINE"
    reason: str = ""
    workup: list[str] = []
    target_facility: str | None = None
    notes: str | None = None
    send: bool = False


class ReferralUpdate(BaseModel):
    status: Literal["DRAFT", "SENT", "ACCEPTED", "COMPLETED", "REJECTED"] | None = None
    outcome: str | None = None
    notes: str | None = None
    target_facility: str | None = None


class ServiceCatalogOut(ORMModel):
    id: int
    code: str
    name: str
    persian_name: str = ""
    category: str
    turnaround_days: int
    requires_fasting: bool
    instructions: str | None = None
    active: bool


class ServiceRequestCreate(BaseModel):
    patient_id: str
    service_code: str
    encounter_id: str | None = None
    notes: str | None = None


class ServiceRequestUpdate(BaseModel):
    status: Literal["REQUESTED", "SCHEDULED", "RESULTED", "CANCELLED"] | None = None
    result_summary: str | None = None
    scheduled_for: dt.datetime | None = None
    notes: str | None = None


# --------------------------------------------------------------------------- #
# Sync / audit
# --------------------------------------------------------------------------- #
class SyncTransactionOut(ORMModel):
    id: str
    patient_id: str | None = None
    encounter_id: str | None = None
    kind: str
    summary: list[Any] = []
    payload: dict[str, Any] = {}
    clinician_name: str | None = None
    pin_confirmed: bool
    status: str
    retry_count: int
    error_message: str | None = None
    created_at: dt.datetime
    synced_at: dt.datetime | None = None


class AuditLogOut(ORMModel):
    id: int
    at: dt.datetime
    actor: str
    actor_role: str | None = None
    action: str
    entity_type: str | None = None
    entity_id: str | None = None
    detail: dict[str, Any] = {}
    source_ip: str | None = None


# --------------------------------------------------------------------------- #
# AI interface
# --------------------------------------------------------------------------- #
class ChatRequest(BaseModel):
    message: str
    patient_id: str | None = None
    session_id: str | None = None
    history: list[dict[str, str]] = []


class AiAction(BaseModel):
    type: str
    description: str = ""
    params: dict[str, Any] = {}
    provenance: dict[str, Any] = {}


class DraftPlan(BaseModel):
    summary: str = ""
    actions: list[AiAction] = []


class ChatResponse(BaseModel):
    session_id: str
    reply: str
    intent: str
    engine: str
    draft_plan: DraftPlan
    provenance: dict[str, Any]
    requires_confirmation: bool = True
    patient_id: str | None = None
    evidence: list[dict[str, Any]] = []


class ExecuteRequest(BaseModel):
    patient_id: str | None = None
    session_id: str | None = None
    actions: list[AiAction]
    pin: str | None = None


class ExecuteResult(BaseModel):
    executed: int
    results: list[dict[str, Any]]
    audit_id: int | None = None