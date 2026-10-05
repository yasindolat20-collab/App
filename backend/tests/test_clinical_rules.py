"""Unit tests for the deterministic clinical rules engine."""
from __future__ import annotations

import datetime as dt

import pytest

from app.models import Condition, Medication, Patient, PreventiveCareItem, Vital
from app.services import clinical_rules
from app.utils import gregorian_to_jalali, jalali_to_gregorian, parse_jalali_str, validate_national_id


def make_patient(**kwargs) -> Patient:
    patient = Patient(
        id=kwargs.pop("id", "p-test"),
        national_id=kwargs.pop("national_id", "0073829145"),
        name=kwargs.pop("name", "Test Patient"),
        persian_name=kwargs.pop("persian_name", "بیمار آزمایشی"),
        gender=kwargs.pop("gender", "F"),
        birth_date=kwargs.pop("birth_date", dt.date(1968, 4, 12)),
        smoker=kwargs.pop("smoker", False),
        household_number="32-الف-098",
        phone="0912-000-0000",
    )
    for key, value in kwargs.items():
        setattr(patient, key, value)
    return patient


# --------------------------------------------------------------------------- #
# Calendar + identity helpers
# --------------------------------------------------------------------------- #
def test_jalali_round_trip():
    for date in (dt.date(2026, 10, 5), dt.date(1968, 4, 12), dt.date(2000, 1, 1), dt.date(2024, 2, 29)):
        jy, jm, jd = gregorian_to_jalali(date.year, date.month, date.day)
        gy, gm, gd = jalali_to_gregorian(jy, jm, jd)
        assert (gy, gm, gd) == (date.year, date.month, date.day)


def test_jalali_known_value():
    assert gregorian_to_jalali(2026, 10, 5) == (1405, 7, 13)
    assert parse_jalali_str("1405/07/13") == dt.date(2026, 10, 5)


def test_national_id_validation():
    assert validate_national_id("0073829145")
    assert not validate_national_id("0073829146")
    assert not validate_national_id("1111111111")
    assert not validate_national_id("123")


# --------------------------------------------------------------------------- #
# Cardiovascular risk
# --------------------------------------------------------------------------- #
def test_risk_unavailable_without_vitals():
    risk = clinical_rules.cvd_risk(make_patient())
    assert risk["available"] is False
    assert risk["colorCategory"] == "UNKNOWN"
    assert "blood_pressure" in risk["missingInputs"]
    assert risk["provenance"]["type"] == "UNKNOWN"


def test_risk_rises_with_risk_factors():
    low = make_patient()
    low.vitals.append(Vital(bp_systolic=118, bp_diastolic=76, total_cholesterol=4.4, bmi=23.0, measured_at=dt.datetime.now()))

    high = make_patient(id="p-high", smoker=True)
    high.conditions.append(Condition(name="Type 2 Diabetes Mellitus", control_status="UNCONTROLLED"))
    high.vitals.append(Vital(bp_systolic=172, bp_diastolic=98, total_cholesterol=7.4, bmi=33.0, measured_at=dt.datetime.now()))

    low_risk = clinical_rules.cvd_risk(low)
    high_risk = clinical_rules.cvd_risk(high)

    assert low_risk["available"] and high_risk["available"]
    assert high_risk["percentage"] > low_risk["percentage"]
    assert high_risk["colorCategory"] in {"ORANGE", "RED"}
    assert high_risk["provenance"]["type"] == "INFERENCE"
    assert high_risk["provenance"]["requiresConfirmation"] is True


# --------------------------------------------------------------------------- #
# Preventive care schedule
# --------------------------------------------------------------------------- #
def test_care_gaps_are_sex_and_age_aware():
    young_male = make_patient(id="p-m", gender="M", birth_date=dt.date(1996, 1, 1))
    young_male.vitals.append(Vital(bp_systolic=120, bp_diastolic=80, weight_kg=70, height_cm=175, measured_at=dt.datetime.now()))
    gaps = {g["category"]: g for g in clinical_rules.care_gaps(young_male)}
    assert gaps["PAP_SMEAR"]["status"] == "NOT_APPLICABLE"
    assert gaps["MAMMOGRAPHY"]["status"] == "NOT_APPLICABLE"
    assert gaps["COLORECTAL_SCREENING"]["status"] == "NOT_APPLICABLE"


def test_overdue_screening_detected_from_preventive_history():
    patient = make_patient(id="p-f", gender="F", birth_date=dt.date(1975, 5, 5))
    patient.preventive_care.append(
        PreventiveCareItem(
            category="MAMMOGRAPHY",
            persian_category="ماموگرافی",
            status="OVERDUE",
            last_done_jalali="1401/01/01",  # ~4.5 years before 1405
        )
    )
    gaps = {g["category"]: g for g in clinical_rules.care_gaps(patient)}
    assert gaps["MAMMOGRAPHY"]["status"] == "OVERDUE"
    assert gaps["MAMMOGRAPHY"]["lastDoneJalali"] == "1401/01/01"
    assert gaps["MAMMOGRAPHY"]["provenance"]["type"] == "FACT"


def test_up_to_date_when_recently_done():
    patient = make_patient(id="p-u", gender="F", birth_date=dt.date(1975, 5, 5))
    recent = dt.date.today() - dt.timedelta(days=30)
    patient.preventive_care.append(
        PreventiveCareItem(category="MAMMOGRAPHY", last_done_jalali=__import__("app.utils", fromlist=["x"]).to_jalali_str(recent))
    )
    gaps = {g["category"]: g for g in clinical_rules.care_gaps(patient)}
    assert gaps["MAMMOGRAPHY"]["status"] == "UP_TO_DATE"


def test_diabetes_specific_items_and_overdue_detection():
    patient = make_patient(id="p-dm", gender="M", birth_date=dt.date(1960, 2, 2))
    patient.conditions.append(Condition(name="Type 2 Diabetes Mellitus", control_status="SUBOPTIMAL"))
    patient.preventive_care.append(
        PreventiveCareItem(category="DIABETIC_FOOT_EXAM", last_done_jalali="1403/10/25")
    )
    gaps = {g["category"]: g for g in clinical_rules.care_gaps(patient)}
    assert gaps["DIABETIC_FOOT_EXAM"]["status"] == "OVERDUE"
    assert gaps["URINE_ALBUMIN"]["status"] in {"DUE", "OVERDUE"}
    assert gaps["IRA_PEN_RISK"]["status"] in {"DUE", "OVERDUE"}
    assert gaps["SMOKING_CESSATION"]["status"] == "NOT_APPLICABLE"


def test_smoking_cessation_applies_to_smokers():
    patient = make_patient(id="p-smoke", smoker=True, birth_date=dt.date(1980, 1, 1))
    gaps = {g["category"]: g for g in clinical_rules.care_gaps(patient)}
    assert gaps["SMOKING_CESSATION"]["status"] == "DUE"


def test_schedule_categories_cover_extended_items():
    categories = clinical_rules.schedule_categories()
    assert {"DIABETIC_FOOT_EXAM", "URINE_ALBUMIN", "IRA_PEN_RISK", "SMOKING_CESSATION"} <= categories


# --------------------------------------------------------------------------- #
# Drug safety
# --------------------------------------------------------------------------- #
def test_warfarin_nsaid_interaction_flagged():
    patient = make_patient()
    patient.medications.append(Medication(name="Warfarin 5mg", indication="AF", compliance_reported="REGULAR"))
    patient.medications.append(Medication(name="Ibuprofen 400mg", indication="pain", compliance_reported="REGULAR"))
    alerts = clinical_rules.drug_alerts(patient)
    assert any(a["kind"] == "INTERACTION" and a["severity"] == "HIGH" for a in alerts)


def test_duplicate_class_detected():
    patient = make_patient()
    patient.medications.append(Medication(name="Ibuprofen 400mg", compliance_reported="REGULAR"))
    patient.medications.append(Medication(name="Naproxen 250mg", compliance_reported="REGULAR"))
    alerts = clinical_rules.drug_alerts(patient)
    assert any(a["kind"] == "DUPLICATE_THERAPY" for a in alerts)


def test_metformin_with_pending_contrast_imaging():
    patient = make_patient()
    patient.medications.append(Medication(name="Metformin 500mg", compliance_reported="REGULAR"))
    alerts = clinical_rules.drug_alerts(patient, pending_service_codes=["IMG-CT"])
    assert any(a["kind"] == "MONITORING" for a in alerts)


def test_adherence_alert_from_household_file():
    patient = make_patient()
    patient.medications.append(Medication(name="Atorvastatin 20mg", compliance_reported="IRREGULAR"))
    alerts = clinical_rules.drug_alerts(patient)
    assert any(a["kind"] == "ADHERENCE" and a["provenance"]["type"] == "FACT" for a in alerts)


# --------------------------------------------------------------------------- #
# Data quality
# --------------------------------------------------------------------------- #
def test_quality_audit_flags_invalid_id_and_impossible_bp():
    patient = make_patient(id="p-dq", national_id="1234567890")
    patient.vitals.append(Vital(bp_systolic=80, bp_diastolic=120, measured_at=dt.datetime.now()))
    findings = clinical_rules.data_quality_audit(patient)
    titles = " ".join(f["title"] for f in findings)
    assert "National ID" in titles
    assert "Impossible blood-pressure" in titles
    severities = {f["severity"] for f in findings}
    assert "CRITICAL" in severities


def test_suggestions_prioritise_uncontrolled_conditions():
    patient = make_patient(id="p-sug")
    patient.conditions.append(
        Condition(name="Essential Hypertension", persian_name="پرفشاری خون", control_status="UNCONTROLLED")
    )
    suggestions = clinical_rules.suggestions(patient)
    assert suggestions
    assert suggestions[0]["priority"] in {"HIGH", "MEDIUM"}
    assert all("provenance" in s for s in suggestions)


def test_patient_brief_is_serialisable():
    patient = make_patient(id="p-brief")
    patient.conditions.append(Condition(name="Type 2 Diabetes Mellitus", control_status="SUBOPTIMAL"))
    patient.vitals.append(Vital(bp_systolic=140, bp_diastolic=88, hba1c=8.1, measured_at=dt.datetime.now()))
    brief = clinical_rules.patient_brief(patient)
    import json

    json.dumps(brief, default=str)  # must not raise
    assert brief["age"] is not None
    assert brief["risk"]["available"] is True
    assert brief["care_gaps"]
