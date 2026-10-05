"""Ω-SIB relational model.

The schema mirrors the SIB (سامانه یکپارچه بهداشت) domain: a household file
(پرونده خانوار) owns patients, patients own encounters (ویزیت), preventive-care
items, quality issues, referrals (ارجاع) and service requests (خدمات).

Every clinical write also produces an append-only :class:`AuditLog` row created
by :mod:`app.audit`.
"""
from __future__ import annotations

import datetime as dt
import uuid

from sqlalchemy import (
    Boolean,
    Date,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    JSON,
    String,
    Text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .database import Base


def utcnow() -> dt.datetime:
    return dt.datetime.now(dt.timezone.utc)


def new_id(prefix: str) -> str:
    return f"{prefix}-{uuid.uuid4().hex[:10]}"


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    username: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    full_name: Mapped[str] = mapped_column(String(120))
    role: Mapped[str] = mapped_column(String(32), default="family_physician")
    medical_council_no: Mapped[str | None] = mapped_column(String(32), nullable=True)  # کد نظام پزشکی
    password_hash: Mapped[str] = mapped_column(String(128))
    pin_hash: Mapped[str | None] = mapped_column(String(128), nullable=True)  # امضای الکترونیک بالینی
    facility: Mapped[str | None] = mapped_column(String(160), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[dt.datetime] = mapped_column(DateTime, default=utcnow)

    encounters: Mapped[list["Encounter"]] = relationship(back_populates="clinician")


class Patient(Base):
    __tablename__ = "patients"

    id: Mapped[str] = mapped_column(String(24), primary_key=True, default=lambda: new_id("p"))
    national_id: Mapped[str] = mapped_column(String(10), unique=True, index=True)  # کد ملی
    name: Mapped[str] = mapped_column(String(120))
    persian_name: Mapped[str] = mapped_column(String(120))
    gender: Mapped[str] = mapped_column(String(1), default="F")  # F | M
    birth_date: Mapped[dt.date | None] = mapped_column(Date, nullable=True)
    birth_date_jalali: Mapped[str | None] = mapped_column(String(12), nullable=True)
    household_number: Mapped[str | None] = mapped_column(String(32), nullable=True)  # پرونده خانوار
    health_center: Mapped[str | None] = mapped_column(String(160), nullable=True)  # مرکز جامع سلامت
    health_house: Mapped[str | None] = mapped_column(String(160), nullable=True)  # خانه بهداشت
    assigned_behvarz: Mapped[str | None] = mapped_column(String(120), nullable=True)  # بهورز
    phone: Mapped[str | None] = mapped_column(String(24), nullable=True)
    insurance_type: Mapped[str | None] = mapped_column(String(80), nullable=True)
    blood_type: Mapped[str | None] = mapped_column(String(4), nullable=True)
    smoker: Mapped[bool] = mapped_column(Boolean, default=False)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[dt.datetime] = mapped_column(DateTime, default=utcnow)
    updated_at: Mapped[dt.datetime] = mapped_column(DateTime, default=utcnow, onupdate=utcnow)

    conditions: Mapped[list["Condition"]] = relationship(
        back_populates="patient", cascade="all, delete-orphan"
    )
    medications: Mapped[list["Medication"]] = relationship(
        back_populates="patient", cascade="all, delete-orphan"
    )
    vitals: Mapped[list["Vital"]] = relationship(
        back_populates="patient", cascade="all, delete-orphan"
    )
    encounters: Mapped[list["Encounter"]] = relationship(
        back_populates="patient", cascade="all, delete-orphan"
    )
    preventive_care: Mapped[list["PreventiveCareItem"]] = relationship(
        back_populates="patient", cascade="all, delete-orphan"
    )
    quality_issues: Mapped[list["DataQualityIssue"]] = relationship(
        back_populates="patient", cascade="all, delete-orphan"
    )
    referrals: Mapped[list["Referral"]] = relationship(
        back_populates="patient", cascade="all, delete-orphan"
    )
    service_requests: Mapped[list["ServiceRequest"]] = relationship(
        back_populates="patient", cascade="all, delete-orphan"
    )


class Condition(Base):
    __tablename__ = "conditions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    patient_id: Mapped[str] = mapped_column(ForeignKey("patients.id", ondelete="CASCADE"), index=True)
    name: Mapped[str] = mapped_column(String(120))
    persian_name: Mapped[str] = mapped_column(String(120), default="")
    since_jalali: Mapped[str | None] = mapped_column(String(12), nullable=True)
    control_status: Mapped[str] = mapped_column(String(16), default="SUBOPTIMAL")  # OPTIMAL|SUBOPTIMAL|UNCONTROLLED
    active: Mapped[bool] = mapped_column(Boolean, default=True)

    patient: Mapped[Patient] = relationship(back_populates="conditions")


class Medication(Base):
    __tablename__ = "medications"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    patient_id: Mapped[str] = mapped_column(ForeignKey("patients.id", ondelete="CASCADE"), index=True)
    name: Mapped[str] = mapped_column(String(120))
    dosage: Mapped[str | None] = mapped_column(String(80), nullable=True)
    frequency: Mapped[str | None] = mapped_column(String(80), nullable=True)
    compliance_reported: Mapped[str] = mapped_column(String(16), default="UNKNOWN")  # REGULAR|IRREGULAR|UNKNOWN
    indication: Mapped[str | None] = mapped_column(String(160), nullable=True)
    start_date_jalali: Mapped[str | None] = mapped_column(String(12), nullable=True)
    last_dispensed_jalali: Mapped[str | None] = mapped_column(String(12), nullable=True)
    refills_count: Mapped[int | None] = mapped_column(Integer, nullable=True)
    monitoring_notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    prescribed_by: Mapped[str | None] = mapped_column(String(120), nullable=True)
    active: Mapped[bool] = mapped_column(Boolean, default=True)

    patient: Mapped[Patient] = relationship(back_populates="medications")


class Vital(Base):
    __tablename__ = "vitals"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    patient_id: Mapped[str] = mapped_column(ForeignKey("patients.id", ondelete="CASCADE"), index=True)
    measured_at: Mapped[dt.datetime] = mapped_column(DateTime, default=utcnow, index=True)
    jalali_date: Mapped[str | None] = mapped_column(String(12), nullable=True)
    bp_systolic: Mapped[int | None] = mapped_column(Integer, nullable=True)
    bp_diastolic: Mapped[int | None] = mapped_column(Integer, nullable=True)
    heart_rate: Mapped[int | None] = mapped_column(Integer, nullable=True)
    weight_kg: Mapped[float | None] = mapped_column(Float, nullable=True)
    height_cm: Mapped[float | None] = mapped_column(Float, nullable=True)
    bmi: Mapped[float | None] = mapped_column(Float, nullable=True)
    fasting_blood_sugar: Mapped[float | None] = mapped_column(Float, nullable=True)
    hba1c: Mapped[float | None] = mapped_column(Float, nullable=True)
    total_cholesterol: Mapped[float | None] = mapped_column(Float, nullable=True)
    measured_by: Mapped[str | None] = mapped_column(String(120), nullable=True)
    recorded_in: Mapped[str | None] = mapped_column(String(120), nullable=True)  # SIB module name

    patient: Mapped[Patient] = relationship(back_populates="vitals")


class Encounter(Base):
    """A visit (ویزیت) recorded by a physician, Behvarz or midwife."""

    __tablename__ = "encounters"

    id: Mapped[str] = mapped_column(String(24), primary_key=True, default=lambda: new_id("enc"))
    patient_id: Mapped[str] = mapped_column(ForeignKey("patients.id", ondelete="CASCADE"), index=True)
    clinician_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    occurred_at: Mapped[dt.datetime] = mapped_column(DateTime, default=utcnow, index=True)
    jalali_date: Mapped[str | None] = mapped_column(String(12), nullable=True)
    facility: Mapped[str | None] = mapped_column(String(160), nullable=True)
    clinician_role: Mapped[str] = mapped_column(String(32), default="Family Physician")
    chief_complaint: Mapped[str | None] = mapped_column(Text, nullable=True)  # شرح حال / شکایت اصلی
    subjective: Mapped[str | None] = mapped_column(Text, nullable=True)
    objective: Mapped[str | None] = mapped_column(Text, nullable=True)
    physical_findings: Mapped[str | None] = mapped_column(Text, nullable=True)
    assessment: Mapped[list] = mapped_column(JSON, default=list)  # list[str] diagnoses
    icd_codes: Mapped[list] = mapped_column(JSON, default=list)
    plan: Mapped[list] = mapped_column(JSON, default=list)  # list[str] actions / follow-up
    prescriptions: Mapped[list] = mapped_column(JSON, default=list)  # [{drug,dose,frequency,duration}]
    lab_orders: Mapped[list] = mapped_column(JSON, default=list)  # list[str]
    vitals_snapshot: Mapped[dict] = mapped_column(JSON, default=dict)
    referral_requested: Mapped[bool] = mapped_column(Boolean, default=False)
    referral_specialty: Mapped[str | None] = mapped_column(String(120), nullable=True)
    follow_up_days: Mapped[int | None] = mapped_column(Integer, nullable=True)
    sib_module: Mapped[str] = mapped_column(String(120), default="SIB v2.4 / Form-302")
    status: Mapped[str] = mapped_column(String(16), default="DRAFT")  # DRAFT | COMMITTED
    committed_at: Mapped[dt.datetime | None] = mapped_column(DateTime, nullable=True)
    sib_transaction_id: Mapped[str | None] = mapped_column(String(24), nullable=True)
    created_at: Mapped[dt.datetime] = mapped_column(DateTime, default=utcnow)

    patient: Mapped[Patient] = relationship(back_populates="encounters")
    clinician: Mapped[User | None] = relationship(back_populates="encounters")


class PreventiveCareItem(Base):
    __tablename__ = "preventive_care"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    patient_id: Mapped[str] = mapped_column(ForeignKey("patients.id", ondelete="CASCADE"), index=True)
    category: Mapped[str] = mapped_column(String(80))  # e.g. BLOOD_PRESSURE
    persian_category: Mapped[str] = mapped_column(String(120), default="")
    status: Mapped[str] = mapped_column(String(16), default="DUE")  # UP_TO_DATE|DUE|OVERDUE|NOT_APPLICABLE
    last_done_jalali: Mapped[str | None] = mapped_column(String(12), nullable=True)
    next_due_jalali: Mapped[str | None] = mapped_column(String(12), nullable=True)
    interval_months: Mapped[int | None] = mapped_column(Integer, nullable=True)
    details: Mapped[str | None] = mapped_column(Text, nullable=True)
    guideline: Mapped[str | None] = mapped_column(String(200), nullable=True)

    patient: Mapped[Patient] = relationship(back_populates="preventive_care")


class DataQualityIssue(Base):
    __tablename__ = "data_quality_issues"

    id: Mapped[str] = mapped_column(String(24), primary_key=True, default=lambda: new_id("dq"))
    patient_id: Mapped[str] = mapped_column(ForeignKey("patients.id", ondelete="CASCADE"), index=True)
    severity: Mapped[str] = mapped_column(String(16), default="WARNING")  # CRITICAL|WARNING|NOTICE
    type: Mapped[str] = mapped_column(String(32), default="MISSING_FIELD")
    title: Mapped[str] = mapped_column(String(200))
    description: Mapped[str] = mapped_column(Text, default="")
    sib_location: Mapped[str | None] = mapped_column(String(160), nullable=True)
    suggested_correction: Mapped[str | None] = mapped_column(Text, nullable=True)
    resolved: Mapped[bool] = mapped_column(Boolean, default=False)
    resolved_at: Mapped[dt.datetime | None] = mapped_column(DateTime, nullable=True)
    resolved_by: Mapped[str | None] = mapped_column(String(120), nullable=True)

    patient: Mapped[Patient] = relationship(back_populates="quality_issues")


class Referral(Base):
    __tablename__ = "referrals"

    id: Mapped[str] = mapped_column(String(24), primary_key=True, default=lambda: new_id("ref"))
    patient_id: Mapped[str] = mapped_column(ForeignKey("patients.id", ondelete="CASCADE"), index=True)
    encounter_id: Mapped[str | None] = mapped_column(ForeignKey("encounters.id"), nullable=True)
    specialty: Mapped[str] = mapped_column(String(120))  # e.g. Cardiology
    persian_specialty: Mapped[str] = mapped_column(String(120), default="")
    urgency: Mapped[str] = mapped_column(String(16), default="ROUTINE")  # ROUTINE|URGENT|EMERGENCY
    reason: Mapped[str] = mapped_column(Text, default="")
    workup: Mapped[list] = mapped_column(JSON, default=list)  # required pre-referral workup
    target_facility: Mapped[str | None] = mapped_column(String(160), nullable=True)
    status: Mapped[str] = mapped_column(String(16), default="DRAFT")  # DRAFT|SENT|ACCEPTED|COMPLETED|REJECTED
    clinician_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    created_at: Mapped[dt.datetime] = mapped_column(DateTime, default=utcnow)
    sent_at: Mapped[dt.datetime | None] = mapped_column(DateTime, nullable=True)
    outcome: Mapped[str | None] = mapped_column(Text, nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    patient: Mapped[Patient] = relationship(back_populates="referrals")


class ServiceCatalogItem(Base):
    __tablename__ = "service_catalog"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    code: Mapped[str] = mapped_column(String(32), unique=True, index=True)
    name: Mapped[str] = mapped_column(String(160))
    persian_name: Mapped[str] = mapped_column(String(160), default="")
    category: Mapped[str] = mapped_column(String(32), default="LAB")  # LAB|IMAGING|PROCEDURE|CONSULT|SCREENING
    turnaround_days: Mapped[int] = mapped_column(Integer, default=1)
    requires_fasting: Mapped[bool] = mapped_column(Boolean, default=False)
    instructions: Mapped[str | None] = mapped_column(Text, nullable=True)
    active: Mapped[bool] = mapped_column(Boolean, default=True)


class ServiceRequest(Base):
    __tablename__ = "service_requests"

    id: Mapped[str] = mapped_column(String(24), primary_key=True, default=lambda: new_id("srv"))
    patient_id: Mapped[str] = mapped_column(ForeignKey("patients.id", ondelete="CASCADE"), index=True)
    encounter_id: Mapped[str | None] = mapped_column(ForeignKey("encounters.id"), nullable=True)
    service_id: Mapped[int] = mapped_column(ForeignKey("service_catalog.id"))
    status: Mapped[str] = mapped_column(String(16), default="REQUESTED")  # REQUESTED|SCHEDULED|RESULTED|CANCELLED
    requested_at: Mapped[dt.datetime] = mapped_column(DateTime, default=utcnow)
    scheduled_for: Mapped[dt.datetime | None] = mapped_column(DateTime, nullable=True)
    result_summary: Mapped[str | None] = mapped_column(Text, nullable=True)
    resulted_at: Mapped[dt.datetime | None] = mapped_column(DateTime, nullable=True)
    requested_by: Mapped[str | None] = mapped_column(String(120), nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    patient: Mapped[Patient] = relationship(back_populates="service_requests")
    service: Mapped[ServiceCatalogItem] = relationship()


class SyncTransaction(Base):
    """A queued SIB write, mirroring the SIB offline sync buffer."""

    __tablename__ = "sync_transactions"

    id: Mapped[str] = mapped_column(String(24), primary_key=True, default=lambda: new_id("tx"))
    patient_id: Mapped[str | None] = mapped_column(ForeignKey("patients.id", ondelete="CASCADE"), nullable=True, index=True)
    encounter_id: Mapped[str | None] = mapped_column(ForeignKey("encounters.id"), nullable=True)
    kind: Mapped[str] = mapped_column(String(32), default="ENCOUNTER")  # ENCOUNTER|VITALS|REFERRAL|SERVICE
    summary: Mapped[list] = mapped_column(JSON, default=list)  # list[str] human readable changes
    payload: Mapped[dict] = mapped_column(JSON, default=dict)
    clinician_name: Mapped[str | None] = mapped_column(String(120), nullable=True)
    pin_confirmed: Mapped[bool] = mapped_column(Boolean, default=False)
    status: Mapped[str] = mapped_column(String(16), default="QUEUED")  # QUEUED|SYNCING|SYNCED|FAILED
    retry_count: Mapped[int] = mapped_column(Integer, default=0)
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[dt.datetime] = mapped_column(DateTime, default=utcnow, index=True)
    synced_at: Mapped[dt.datetime | None] = mapped_column(DateTime, nullable=True)


class AuditLog(Base):
    """Append-only record of every state change and AI-executed action."""

    __tablename__ = "audit_logs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    at: Mapped[dt.datetime] = mapped_column(DateTime, default=utcnow, index=True)
    actor: Mapped[str] = mapped_column(String(120), default="system")
    actor_role: Mapped[str | None] = mapped_column(String(32), nullable=True)
    action: Mapped[str] = mapped_column(String(64))
    entity_type: Mapped[str | None] = mapped_column(String(64), nullable=True)
    entity_id: Mapped[str | None] = mapped_column(String(64), nullable=True)
    detail: Mapped[dict] = mapped_column(JSON, default=dict)
    source_ip: Mapped[str | None] = mapped_column(String(64), nullable=True)


class AiMessage(Base):
    """Persisted Ω-Chat transcript, including proposed drafts and provenance."""

    __tablename__ = "ai_messages"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    session_id: Mapped[str] = mapped_column(String(48), index=True)
    patient_id: Mapped[str | None] = mapped_column(String(24), nullable=True)
    role: Mapped[str] = mapped_column(String(16), default="user")  # user|assistant|system
    content: Mapped[str] = mapped_column(Text, default="")
    intent: Mapped[str | None] = mapped_column(String(48), nullable=True)
    payload: Mapped[dict] = mapped_column(JSON, default=dict)
    engine: Mapped[str | None] = mapped_column(String(32), nullable=True)  # llm:<model> | rules
    created_at: Mapped[dt.datetime] = mapped_column(DateTime, default=utcnow, index=True)