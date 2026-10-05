"""Seed Ω-SIB with the bootstrap users, the national service catalogue and a
demonstration panel of Persian patients.

Usage::

    python -m app.seed            # idempotent: only fills empty tables
    python -m app.seed --reset    # drop and recreate everything

The demonstration panel lives in ``app/data/seed_patients.json``. It is derived
from the clinical dataset of the original Ω-SIB prototype (household files,
chronic conditions, medication profiles, vitals history, visit notes and
SIB data-quality findings). Iranian national-ID check digits were recomputed for
the demo records so that the identity validator accepts them.
"""
from __future__ import annotations

import argparse
import datetime as dt
import json
import logging
from pathlib import Path
from typing import Any

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from .config import settings
from .database import Base, SessionLocal, engine, init_db
from .models import (
    Condition,
    DataQualityIssue,
    Encounter,
    Medication,
    Patient,
    PreventiveCareItem,
    ServiceCatalogItem,
    User,
    Vital,
)
from .security import hash_secret
from .utils import to_jalali_str

logger = logging.getLogger("omega-sib.seed")

DATA_DIR = Path(__file__).resolve().parent / "data"
PATIENTS_FILE = DATA_DIR / "seed_patients.json"

# --------------------------------------------------------------------------- #
# Users
# --------------------------------------------------------------------------- #
BOOTSTRAP_USERS: list[dict[str, Any]] = [
    {
        "username": settings.bootstrap_admin_username,
        "password": settings.bootstrap_admin_password,
        "full_name": settings.bootstrap_admin_name,
        "role": "admin",
        "medical_council_no": "IR-MD-000000",
        "facility": "Ω-SIB Reference Implementation",
        "pin": None,
    },
    {
        "username": "dr.alavi",
        "password": "doctor123",
        "full_name": "Dr. N. Alavi",
        "role": "family_physician",
        "medical_council_no": "IR-MD-145872",
        "facility": "Deh Namak Rural Comprehensive Health Center",
        "pin": "2468",
    },
    {
        "username": "behvarz.karimi",
        "password": "behvarz123",
        "full_name": "Maryam Karimi",
        "role": "behvarz",
        "medical_council_no": None,
        "facility": "Khorram-Deh Health House",
        "pin": None,
    },
    {
        "username": "midwife.hoseini",
        "password": "midwife123",
        "full_name": "Somayeh Hoseini",
        "role": "midwife",
        "medical_council_no": "IR-MW-778231",
        "facility": "Deh Namak Rural Comprehensive Health Center",
        "pin": None,
    },
]

# --------------------------------------------------------------------------- #
# Service catalogue (خدمات)
# --------------------------------------------------------------------------- #
SERVICES: list[dict[str, Any]] = [
    {"code": "LAB-CBC", "name": "Complete blood count", "persian_name": "شمارش کامل سلول‌های خون (CBC)", "category": "LAB", "turnaround_days": 1},
    {"code": "LAB-FBS", "name": "Fasting blood sugar", "persian_name": "قند خون ناشتا", "category": "LAB", "turnaround_days": 1, "requires_fasting": True, "instructions": "۸ ساعت ناشتا باشید."},
    {"code": "LAB-HBA1C", "name": "HbA1c", "persian_name": "هموگلوبین A1C", "category": "LAB", "turnaround_days": 2},
    {"code": "LAB-LIPID", "name": "Lipid profile", "persian_name": "پروفایل چربی خون", "category": "LAB", "turnaround_days": 1, "requires_fasting": True, "instructions": "۱۲ ساعت ناشتا باشید."},
    {"code": "LAB-LFT", "name": "Liver function tests", "persian_name": "آزمون‌های عملکرد کبد", "category": "LAB", "turnaround_days": 1},
    {"code": "LAB-KFT", "name": "Renal function tests", "persian_name": "آزمون‌های عملکرد کلیه (کراتینین، اوره)", "category": "LAB", "turnaround_days": 1},
    {"code": "LAB-TSH", "name": "Thyroid stimulating hormone", "persian_name": "هورمون محرک تیروئید (TSH)", "category": "LAB", "turnaround_days": 2},
    {"code": "LAB-ACR", "name": "Urine albumin-to-creatinine ratio", "persian_name": "نسبت آلبومین به کراتینین ادرار", "category": "LAB", "turnaround_days": 2},
    {"code": "LAB-URINE", "name": "Urinalysis", "persian_name": "تجزیه ادرار", "category": "LAB", "turnaround_days": 1},
    {"code": "IMG-ECG", "name": "12-lead ECG", "persian_name": "نوار قلب ۱۲ لید", "category": "IMAGING", "turnaround_days": 0},
    {"code": "IMG-CHEST-XRAY", "name": "Chest radiograph", "persian_name": "گرافی قفسه سینه", "category": "IMAGING", "turnaround_days": 1},
    {"code": "IMG-ULTRASOUND-ABDOMEN", "name": "Abdominal ultrasound", "persian_name": "سونوگرافی شکم و لگن", "category": "IMAGING", "turnaround_days": 2, "requires_fasting": True},
    {"code": "IMG-MAMMOGRAPHY", "name": "Mammography", "persian_name": "ماموگرافی", "category": "IMAGING", "turnaround_days": 3},
    {"code": "IMG-CT", "name": "CT scan", "persian_name": "سی‌تی اسکن", "category": "IMAGING", "turnaround_days": 3},
    {"code": "IMG-ECHO", "name": "Echocardiography", "persian_name": "اکوکاردیوگرافی", "category": "IMAGING", "turnaround_days": 3},
    {"code": "SCR-PAP", "name": "Pap smear", "persian_name": "پاپ اسمیر", "category": "SCREENING", "turnaround_days": 3},
    {"code": "SCR-FOBT", "name": "Faecal occult blood test", "persian_name": "تست خون مخفی مدفوع (FIT)", "category": "SCREENING", "turnaround_days": 3},
    {"code": "SCR-DEPRESSION", "name": "Depression screening (PHQ-2/9)", "persian_name": "غربالگری افسردگی (PHQ)", "category": "SCREENING", "turnaround_days": 0},
    {"code": "SCR-FOOT-EXAM", "name": "Diabetic foot examination", "persian_name": "معاینه پای دیابتی با مونوفیلامان", "category": "PROCEDURE", "turnaround_days": 0},
    {"code": "SCR-DENTAL", "name": "Dental examination", "persian_name": "معاینه دندانپزشکی", "category": "CONSULT", "turnaround_days": 0},
    {"code": "VAC-INFLUENZA", "name": "Influenza vaccination", "persian_name": "واکسن آنفلوانزا", "category": "PROCEDURE", "turnaround_days": 0},
    {"code": "VAC-TETANUS", "name": "Tetanus booster", "persian_name": "واکسن کزاز", "category": "PROCEDURE", "turnaround_days": 0},
    {"code": "CON-DIET", "name": "Nutrition counselling", "persian_name": "مشاوره تغذیه", "category": "CONSULT", "turnaround_days": 0},
    {"code": "CON-SMOKING-CESSATION", "name": "Smoking cessation counselling", "persian_name": "مشاوره ترک سیگار", "category": "CONSULT", "turnaround_days": 0},
]

#: Maps the descriptive categories of the legacy prototype onto the schedule keys
#: used by :mod:`app.services.clinical_rules`.
PREVENTIVE_CATEGORY_MAP: list[tuple[str, str]] = [
    ("pap", "PAP_SMEAR"),
    ("cervical", "PAP_SMEAR"),
    ("mammogra", "MAMMOGRAPHY"),
    ("breast", "MAMMOGRAPHY"),
    ("colorectal", "COLORECTAL_SCREENING"),
    ("fit test", "COLORECTAL_SCREENING"),
    ("dental", "DENTAL_EXAM"),
    ("oral", "DENTAL_EXAM"),
    ("depress", "DEPRESSION_SCREEN"),
    ("mental", "DEPRESSION_SCREEN"),
    ("influenza", "INFLUENZA_VACCINE"),
    ("tetanus", "TETANUS_VACCINE"),
    ("diabetic foot", "DIABETIC_FOOT_EXAM"),
    ("foot examination", "DIABETIC_FOOT_EXAM"),
    ("microalbuminuria", "URINE_ALBUMIN"),
    ("nephropathy", "URINE_ALBUMIN"),
    ("irapen", "IRA_PEN_RISK"),
    ("cardiovascular risk", "IRA_PEN_RISK"),
    ("smoking cessation", "SMOKING_CESSATION"),
    ("tobacco", "SMOKING_CESSATION"),
]


def seed_users(db: Session) -> int:
    created = 0
    for spec in BOOTSTRAP_USERS:
        if db.scalar(select(User).where(User.username == spec["username"])):
            continue
        db.add(
            User(
                username=spec["username"],
                full_name=spec["full_name"],
                role=spec["role"],
                medical_council_no=spec["medical_council_no"],
                facility=spec["facility"],
                password_hash=hash_secret(spec["password"]),
                pin_hash=hash_secret(spec["pin"]) if spec["pin"] else None,
            )
        )
        created += 1
    db.commit()
    return created


def seed_services(db: Session) -> int:
    created = 0
    for spec in SERVICES:
        if db.scalar(select(ServiceCatalogItem).where(ServiceCatalogItem.code == spec["code"])):
            continue
        db.add(ServiceCatalogItem(**spec))
        created += 1
    db.commit()
    return created


def _parse_date(value: str | None) -> dt.date | None:
    if not value:
        return None
    try:
        return dt.date.fromisoformat(value[:10])
    except ValueError:
        return None


def _parse_dt(value: str | None) -> dt.datetime | None:
    day = _parse_date(value)
    if day is None:
        return None
    return dt.datetime(day.year, day.month, day.day, 9, 30, tzinfo=dt.timezone.utc)


def seed_patients(db: Session) -> int:
    if not PATIENTS_FILE.exists():
        logger.warning("Seed file %s not found — skipping demo patients", PATIENTS_FILE)
        return 0
    records = json.loads(PATIENTS_FILE.read_text(encoding="utf-8"))
    created = 0
    for record in records:
        national_id = str(record.get("nationalId", "")).strip()
        if not national_id or db.scalar(select(Patient).where(Patient.national_id == national_id)):
            continue
        birth_date = _parse_date(record.get("birthDate"))
        patient = Patient(
            national_id=national_id,
            name=record.get("name", ""),
            persian_name=record.get("persianName", ""),
            gender=record.get("gender", "F"),
            birth_date=birth_date,
            birth_date_jalali=record.get("birthDateJalali") or to_jalali_str(birth_date),
            household_number=record.get("householdNumber"),
            health_center=record.get("healthCenter"),
            health_house=record.get("healthHouse"),
            assigned_behvarz=record.get("assignedBehvarz"),
            phone=record.get("phone"),
            insurance_type=record.get("insuranceType"),
            blood_type=record.get("bloodType"),
            smoker=bool(record.get("smoker", False)),
            notes=json.dumps(record.get("rawSibPayloadSnippet", {}), ensure_ascii=False)[:2000] or None,
        )
        db.add(patient)
        db.flush()

        for condition in record.get("chronicConditions", []):
            patient.conditions.append(
                Condition(
                    name=condition.get("name", ""),
                    persian_name=condition.get("persianName", ""),
                    since_jalali=condition.get("sinceJalali"),
                    control_status=condition.get("controlStatus", "SUBOPTIMAL"),
                )
            )

        for medication in record.get("currentMedications", []):
            patient.medications.append(
                Medication(
                    name=medication.get("name", ""),
                    dosage=medication.get("dosage"),
                    frequency=medication.get("frequency"),
                    compliance_reported=medication.get("complianceReported", "UNKNOWN"),
                    indication=medication.get("indication"),
                    start_date_jalali=medication.get("startDateJalali"),
                    last_dispensed_jalali=medication.get("lastDispensedJalali"),
                    refills_count=medication.get("refillsCount"),
                    monitoring_notes=medication.get("monitoringNotes"),
                    prescribed_by=medication.get("prescribedBy"),
                )
            )

        for vital in record.get("vitalsHistory", []):
            measured_at = _parse_dt(vital.get("date")) or dt.datetime.now(dt.timezone.utc)
            patient.vitals.append(
                Vital(
                    measured_at=measured_at,
                    jalali_date=vital.get("jalaliDate") or to_jalali_str(measured_at),
                    bp_systolic=vital.get("bloodPressureSys"),
                    bp_diastolic=vital.get("bloodPressureDia"),
                    heart_rate=vital.get("heartRate"),
                    weight_kg=vital.get("weightKg"),
                    height_cm=vital.get("heightCm"),
                    bmi=vital.get("bmi"),
                    fasting_blood_sugar=vital.get("fastingBloodSugar"),
                    hba1c=vital.get("hba1c"),
                    measured_by=vital.get("measuredBy"),
                    recorded_in=vital.get("recordedIn"),
                )
            )

        for encounter in record.get("encounters", []):
            occurred_at = _parse_dt(encounter.get("date")) or dt.datetime.now(dt.timezone.utc)
            diagnosis = encounter.get("diagnosis")
            icd_code = encounter.get("icdCode")
            patient.encounters.append(
                Encounter(
                    occurred_at=occurred_at,
                    jalali_date=encounter.get("jalaliDate") or to_jalali_str(occurred_at),
                    facility=encounter.get("facility"),
                    clinician_role=encounter.get("role", "Family Physician"),
                    chief_complaint=encounter.get("complaint"),
                    assessment=[diagnosis] if diagnosis else [],
                    icd_codes=[icd_code] if icd_code else [],
                    plan=list(encounter.get("actionsTaken") or []),
                    vitals_snapshot=encounter.get("vitals") or {},
                    sib_module=encounter.get("sibModule") or "SIB v2.4 / Form-302",
                    status="COMMITTED",
                    committed_at=occurred_at,
                )
            )

        for preventive in record.get("preventiveCare", []):
            raw_category = str(preventive.get("category", ""))
            lowered = raw_category.lower()
            mapped = next(
                (target for keyword, target in PREVENTIVE_CATEGORY_MAP if keyword in lowered),
                raw_category.split("(")[0].strip()[:80] or "GENERAL",
            )
            patient.preventive_care.append(
                PreventiveCareItem(
                    category=mapped,
                    persian_category=preventive.get("persianCategory", ""),
                    status=preventive.get("status", "DUE"),
                    last_done_jalali=preventive.get("lastDoneJalali"),
                    next_due_jalali=preventive.get("nextDueJalali"),
                    details=preventive.get("details"),
                    guideline=(preventive.get("provenance") or {}).get("sourceSystem"),
                )
            )

        for issue in record.get("dataQualityIssues", []):
            patient.quality_issues.append(
                DataQualityIssue(
                    severity=issue.get("severity", "WARNING"),
                    type=issue.get("type", "MISSING_FIELD"),
                    title=issue.get("title", ""),
                    description=issue.get("description", ""),
                    sib_location=issue.get("sibLocation"),
                    suggested_correction=issue.get("suggestedCorrection"),
                )
            )

        created += 1
    db.commit()
    return created


def ensure_seed() -> dict[str, int]:
    """Idempotent seeding used at application start-up."""
    init_db()
    with SessionLocal() as db:
        result = {
            "users": seed_users(db),
            "services": seed_services(db),
            "patients": seed_patients(db),
        }
    if any(result.values()):
        logger.info("Seeded Ω-SIB: %s", result)
    return result


def reset_database() -> None:
    Base.metadata.drop_all(bind=engine)
    init_db()


def main() -> None:  # pragma: no cover - CLI
    parser = argparse.ArgumentParser(description="Seed the Ω-SIB database")
    parser.add_argument("--reset", action="store_true", help="drop all tables before seeding")
    args = parser.parse_args()
    logging.basicConfig(level=logging.INFO)
    if args.reset:
        reset_database()
        logger.info("Database reset")
    result = ensure_seed()
    with SessionLocal() as db:
        logger.info(
            "Totals → users=%s services=%s patients=%s",
            db.scalar(select(func.count()).select_from(User)),
            db.scalar(select(func.count()).select_from(ServiceCatalogItem)),
            db.scalar(select(func.count()).select_from(Patient)),
        )
    logger.info("Seed result: %s", result)


if __name__ == "__main__":  # pragma: no cover
    main()
