"""Deterministic clinical rules engine.

This module is the *clinical brain* of Ω-SIB. It is deliberately independent of
any LLM: every output is reproducible, auditable and traceable to a rule, which
is a precondition for using it in patient care. The AI interface
(:mod:`app.services.ai`) uses these functions both as the grounding context for
the language model and as the fallback engine when no model is configured.

Three rule families are implemented:

* :func:`cvd_risk` — IraPEN / WHO-ISH style 10-year cardiovascular risk
  (simplified, transparent scoring; **not** a substitute for the official chart).
* :func:`care_gaps` — national preventive-care and chronic-disease follow-up
  schedule (blood pressure, diabetes monitoring, cancer screening, vaccination).
* :func:`drug_alerts` — interaction / duplication / monitoring safety checks.
* :func:`data_quality_audit` — SIB data-integrity findings.

Every finding carries a *provenance* block with
``type`` (FACT / INFERENCE / SUGGESTION / UNKNOWN), the source, a confidence
estimate and whether clinician confirmation is required.
"""
from __future__ import annotations

import datetime as dt
from collections.abc import Callable, Iterable
from dataclasses import dataclass, field
from typing import Any

from ..models import Patient
from ..utils import (
    age_from_birth_date,
    parse_jalali_str,
    to_jalali_str,
    validate_national_id,
)

# --------------------------------------------------------------------------- #
# Provenance helpers
# --------------------------------------------------------------------------- #
DIAGNOSTIC_PREFIX = "ICD-10"


def provenance(
    ptype: str,
    source_text: str,
    source_system: str,
    confidence: float | None = None,
    requires_confirmation: bool = True,
) -> dict[str, Any]:
    return {
        "type": ptype,
        "sourceText": source_text,
        "sourceSystem": source_system,
        "confidence": confidence,
        "requiresConfirmation": requires_confirmation,
        "timestamp": dt.datetime.now(dt.timezone.utc).isoformat(timespec="seconds"),
    }


def _today() -> dt.date:
    return dt.date.today()


def _months_since(day: dt.date | None, today: dt.date | None = None) -> int | None:
    if day is None:
        return None
    today = today or _today()
    return (today.year - day.year) * 12 + (today.month - day.month) - (1 if today.day < day.day else 0)


# --------------------------------------------------------------------------- #
# Patient inspection helpers
# --------------------------------------------------------------------------- #
def sorted_vitals(patient: Patient) -> list[Any]:
    return sorted(patient.vitals, key=lambda v: v.measured_at, reverse=True)


def latest_vital(patient: Patient) -> Any | None:
    vitals = sorted_vitals(patient)
    return vitals[0] if vitals else None


def active_conditions(patient: Patient) -> list[Any]:
    # ``active`` is a column default that only materialises after a flush, so an
    # unset value in memory means "active".
    return [c for c in patient.conditions if c.active is not False]


def active_medications(patient: Patient) -> list[Any]:
    return [m for m in patient.medications if m.active is not False]


def condition_slugs(patient: Patient) -> set[str]:
    """Normalised condition keys, e.g. ``{'diabetes', 'hypertension'}``."""
    slugs: set[str] = set()
    for cond in active_conditions(patient):
        text = f"{cond.name} {cond.persian_name}".lower()
        if "diabet" in text or "دیابت" in text:
            slugs.add("diabetes")
        if "hypertens" in text or "پرفشاری" in text or "فشار خون" in text:
            slugs.add("hypertension")
        if "lipid" in text or "cholesterol" in text or "چربی" in text or "دیس‌لیپیدمی" in text:
            slugs.add("dyslipidemia")
        if "asthma" in text or "آسم" in text:
            slugs.add("asthma")
        if "copd" in text or "انسدادی" in text:
            slugs.add("copd")
        if "heart failure" in text or "نارسایی قلبی" in text:
            slugs.add("heart_failure")
        if "coronary" in text or "ischemic" in text or "قلبی" in text or "myocardial" in text:
            slugs.add("cad")
        if "thyroid" in text or "تیروئید" in text:
            slugs.add("thyroid")
        if "depress" in text or "افسردگی" in text:
            slugs.add("depression")
        if "pregnan" in text or "بارداری" in text:
            slugs.add("pregnancy")
        if "kidney" in text or "renal" in text or "کلیوی" in text:
            slugs.add("ckd")
    if patient.smoker:
        slugs.add("smoker")
    age = age_from_birth_date(patient.birth_date)
    if age is not None and age >= 60:
        slugs.add("elderly")
    return slugs


# --------------------------------------------------------------------------- #
# 1. Cardiovascular risk (IraPEN / WHO-ISH style, simplified)
# --------------------------------------------------------------------------- #
def cvd_risk(patient: Patient) -> dict[str, Any]:
    """Estimate the 10-year cardiovascular risk category.

    Implemented as an explicit, additive point score over the classical risk
    factors so that every step can be shown to the clinician. It is a
    *decision-support estimate* and must never replace the official IraPEN risk
    chart or clinical judgement.
    """
    slugs = condition_slugs(patient)
    vital = latest_vital(patient)
    age = age_from_birth_date(patient.birth_date)
    sex = (patient.gender or "F").upper()

    missing: list[str] = []
    if age is None:
        missing.append("date_of_birth")
    if vital is None or vital.bp_systolic is None:
        missing.append("blood_pressure")
    if vital is None or vital.total_cholesterol is None:
        missing.append("total_cholesterol")

    if age is None or vital is None or vital.bp_systolic is None:
        return {
            "available": False,
            "percentage": None,
            "colorCategory": "UNKNOWN",
            "missingInputs": missing,
            "components": {},
            "calculatedDateJalali": to_jalali_str(_today()),
            "nextAssessmentDueJalali": None,
            "provenance": provenance(
                "UNKNOWN",
                "Insufficient data to estimate cardiovascular risk (missing: "
                + ", ".join(missing)
                + ").",
                "IraPEN / WHO-ISH risk chart (simplified implementation)",
                confidence=0.0,
            ),
        }

    sbp = vital.bp_systolic
    cholesterol_mmol = None
    if vital.total_cholesterol is not None:
        cholesterol_mmol = (
            vital.total_cholesterol / 38.67 if vital.total_cholesterol > 20 else vital.total_cholesterol
        )

    components: dict[str, float] = {}
    score = 0.0

    age_points = max(0.0, (age - (40 if sex == "M" else 45))) * 0.55
    components["age"] = round(age_points, 2)
    score += age_points

    sbp_points = max(0.0, (sbp - 120) / 10.0) * (0.65 if sex == "M" else 0.55)
    components["systolic_bp"] = round(sbp_points, 2)
    score += sbp_points

    if patient.smoker:
        smoke_points = 3.6 if sex == "M" else 4.6
        components["smoking"] = smoke_points
        score += smoke_points

    if "diabetes" in slugs:
        components["diabetes"] = 4.2
        score += 4.2

    if cholesterol_mmol is not None:
        chol_points = max(0.0, cholesterol_mmol - 5.0) * 2.2
        components["total_cholesterol"] = round(chol_points, 2)
        score += chol_points

    if vital.bmi and vital.bmi >= 30:
        components["obesity"] = 1.2
        score += 1.2

    if "cad" in slugs or "heart_failure" in slugs:
        components["established_cvd"] = 8.0
        score += 8.0

    percentage = max(1.0, min(round(score, 1), 45.0))
    if percentage < 10:
        category = "GREEN"
    elif percentage < 20:
        category = "YELLOW"
    elif percentage < 30:
        category = "ORANGE"
    else:
        category = "RED"

    next_due_months = 12 if category in {"GREEN", "YELLOW"} else 6
    today = _today()
    gy, gm, gd = today.year, today.month, today.day
    shift = next_due_months
    gm += shift
    while gm > 12:
        gm -= 12
        gy += 1
    try:
        next_due = dt.date(gy, gm, min(gd, 28))
    except ValueError:  # pragma: no cover - defensive
        next_due = today

    confidence = 0.65 if cholesterol_mmol is not None else 0.45
    return {
        "available": True,
        "percentage": percentage,
        "colorCategory": category,
        "missingInputs": missing,
        "components": components,
        "calculatedDateJalali": to_jalali_str(today),
        "nextAssessmentDueJalali": to_jalali_str(next_due),
        "provenance": provenance(
            "INFERENCE",
            "Additive risk score derived from age, sex, systolic blood pressure, "
            "smoking, diabetes, total cholesterol and BMI. Mapping to the official "
            "IraPEN colour bands is approximate.",
            "IraPEN / WHO-ISH risk chart (simplified implementation)",
            confidence=confidence,
        ),
    }


# --------------------------------------------------------------------------- #
# 2. Preventive care / chronic follow-up schedule
# --------------------------------------------------------------------------- #
@dataclass
class CareGapSpec:
    category: str
    persian_category: str
    guideline: str
    interval_months: Callable[[Patient, set[str]], int]
    applies: Callable[[Patient, set[str], int | None], bool]
    source: str  # "vitals" | "preventive" | "birth"
    vital_field: str | None = None
    details: Callable[[Patient, set[str], int | None], str] = lambda *_: ""
    tags: list[str] = field(default_factory=list)


def _interval_fixed(months: int) -> Callable[[Patient, set[str]], int]:
    return lambda _p, _s: months


def schedule_categories() -> set[str]:
    """Every category owned by the Ω-SIB preventive-care schedule."""
    return {spec.category for spec in CARE_SCHEDULE}


def _no_interval(_p: Patient, _s: set[str]) -> int:
    return 120


CARE_SCHEDULE: list[CareGapSpec] = [
    CareGapSpec(
        category="BLOOD_PRESSURE",
        persian_category="کنترل فشار خون",
        guideline="IraPEN / national hypertension programme (6-monthly when hypertensive)",
        interval_months=lambda _p, s: 6 if "hypertension" in s else 12,
        applies=lambda _p, _s, _a: True,
        source="vitals",
        vital_field="bp_systolic",
    ),
    CareGapSpec(
        category="FASTING_BLOOD_SUGAR",
        persian_category="قند خون ناشتا",
        guideline="National diabetes programme (3–6 monthly for known diabetes)",
        interval_months=lambda _p, s: (3 if "uncontrolled_diabetes" in s else 6) if "diabetes" in s else 12,
        applies=lambda _p, _s, _a: True,
        source="vitals",
        vital_field="fasting_blood_sugar",
    ),
    CareGapSpec(
        category="HBA1C",
        persian_category="هموگلوبین A1C",
        guideline="National diabetes programme (3–6 monthly for known diabetes)",
        interval_months=lambda _p, s: 3 if "uncontrolled_diabetes" in s else 6,
        applies=lambda _p, s, _a: "diabetes" in s,
        source="vitals",
        vital_field="hba1c",
        details=lambda _p, _s, _a: "HbA1c is only tracked for patients with diabetes.",
    ),
    CareGapSpec(
        category="LIPID_PROFILE",
        persian_category="پروفایل چربی خون",
        guideline="IraPEN / primary prevention of cardiovascular disease",
        interval_months=_interval_fixed(12),
        applies=lambda _p, s, a: bool(
            {"diabetes", "hypertension", "dyslipidemia", "cad"} & s or _p.smoker or (a or 0) >= 40
        ),
        source="vitals",
        vital_field="total_cholesterol",
    ),
    CareGapSpec(
        category="BMI_WEIGHT",
        persian_category="وزن و شاخص توده بدنی",
        guideline="National nutrition programme (annual anthropometry)",
        interval_months=_interval_fixed(12),
        applies=lambda _p, _s, _a: True,
        source="vitals",
        vital_field="weight_kg",
    ),
    CareGapSpec(
        category="PAP_SMEAR",
        persian_category="پاپ اسمیر (غربالگری سرطان دهانه رحم)",
        guideline="National cervical cancer screening programme (women 30–65, every 3 years)",
        interval_months=_interval_fixed(36),
        applies=lambda p, _s, a: (p.gender or "").upper() == "F" and a is not None and 30 <= a <= 65,
        source="preventive",
    ),
    CareGapSpec(
        category="MAMMOGRAPHY",
        persian_category="ماموگرافی (غربالگری سرطان پستان)",
        guideline="National breast cancer screening programme (women 40–69, every 2 years)",
        interval_months=_interval_fixed(24),
        applies=lambda p, _s, a: (p.gender or "").upper() == "F" and a is not None and 40 <= a <= 69,
        source="preventive",
    ),
    CareGapSpec(
        category="COLORECTAL_SCREENING",
        persian_category="غربالگری سرطان کولورکتال",
        guideline="National colorectal cancer screening programme (50–70, every 2 years)",
        interval_months=_interval_fixed(24),
        applies=lambda _p, _s, a: a is not None and 50 <= a <= 70,
        source="preventive",
    ),
    CareGapSpec(
        category="DEPRESSION_SCREEN",
        persian_category="غربالگری افسردگی",
        guideline="National mental health programme (annual PHQ-2 / PHQ-9)",
        interval_months=_interval_fixed(12),
        applies=lambda _p, _s, _a: True,
        source="preventive",
    ),
    CareGapSpec(
        category="DENTAL_EXAM",
        persian_category="معاینه دندانپزشکی",
        guideline="National oral health programme (annual visit)",
        interval_months=_interval_fixed(12),
        applies=lambda _p, _s, _a: True,
        source="preventive",
    ),
    CareGapSpec(
        category="INFLUENZA_VACCINE",
        persian_category="واکسن آنفلوانزا",
        guideline="National immunization programme (annual for ≥60 or chronic disease)",
        interval_months=_interval_fixed(12),
        applies=lambda _p, s, a: ("elderly" in s) or bool(
            {"diabetes", "copd", "asthma", "heart_failure", "ckd"} & s
        ) or (a or 0) >= 60,
        source="preventive",
    ),
    CareGapSpec(
        category="DIABETIC_FOOT_EXAM",
        persian_category="معاینه پای دیابتی (مونوفیلامان)",
        guideline="National diabetes programme (annual foot examination with monofilament)",
        interval_months=_interval_fixed(12),
        applies=lambda _p, s, _a: "diabetes" in s,
        source="preventive",
    ),
    CareGapSpec(
        category="URINE_ALBUMIN",
        persian_category="آلبومین به کراتینین ادرار (نفروپاتی دیابتی)",
        guideline="National diabetes programme (annual urine albumin-to-creatinine ratio)",
        interval_months=_interval_fixed(12),
        applies=lambda _p, s, _a: "diabetes" in s or "hypertension" in s,
        source="preventive",
    ),
    CareGapSpec(
        category="IRA_PEN_RISK",
        persian_category="خطرسنجی قلبی‌عروقی ایراپن",
        guideline="IraPEN risk assessment (annual for adults 40+, 6-monthly when high risk)",
        interval_months=_interval_fixed(12),
        applies=lambda _p, _s, a: a is not None and a >= 40,
        source="preventive",
    ),
    CareGapSpec(
        category="SMOKING_CESSATION",
        persian_category="مشاوره ترک سیگار",
        guideline="National tobacco-control programme (offer counselling at least annually)",
        interval_months=_interval_fixed(12),
        applies=lambda p, _s, _a: bool(p.smoker),
        source="preventive",
    ),
    CareGapSpec(
        category="TETANUS_VACCINE",
        persian_category="واکسن کزاز",
        guideline="National immunization programme (booster every 10 years)",
        interval_months=_interval_fixed(120),
        applies=lambda _p, _s, _a: True,
        source="preventive",
    ),
    CareGapSpec(
        category="MEDICATION_REVIEW",
        persian_category="بازنگری دارویی",
        guideline="Rational prescribing review (6-monthly when ≥4 chronic drugs)",
        interval_months=lambda p, _s: 6 if len(active_medications(p)) >= 4 else 12,
        applies=lambda p, _s, _a: len(active_medications(p)) > 0,
        source="preventive",
    ),
]


def _with_uncontrolled_diabetes(patient: Patient, slugs: set[str]) -> set[str]:
    enriched = set(slugs)
    if "diabetes" in enriched:
        for cond in active_conditions(patient):
            text = f"{cond.name} {cond.persian_name}".lower()
            if ("diabet" in text or "دیابت" in text) and cond.control_status in {
                "UNCONTROLLED",
                "SUBOPTIMAL",
            }:
                enriched.add("uncontrolled_diabetes")
    return enriched


def _last_done_for(patient: Patient, spec: CareGapSpec) -> dt.date | None:
    if spec.source == "vitals":
        for vital in sorted_vitals(patient):
            if spec.vital_field and getattr(vital, spec.vital_field, None) is not None:
                return vital.measured_at.date() if isinstance(vital.measured_at, dt.datetime) else None
        return None
    for row in patient.preventive_care:
        if row.category == spec.category and row.last_done_jalali:
            return parse_jalali_str(row.last_done_jalali)
    return None


def _add_months(day: dt.date, months: int) -> dt.date:
    year = day.year + (day.month - 1 + months) // 12
    month = (day.month - 1 + months) % 12 + 1
    return dt.date(year, month, min(day.day, 28))


def care_gaps(patient: Patient) -> list[dict[str, Any]]:
    """Return the full preventive-care / chronic follow-up status list."""
    slugs = _with_uncontrolled_diabetes(patient, condition_slugs(patient))
    age = age_from_birth_date(patient.birth_date)
    today = _today()
    results: list[dict[str, Any]] = []

    for spec in CARE_SCHEDULE:
        applicable = spec.applies(patient, slugs, age)
        if not applicable:
            results.append(
                {
                    "category": spec.category,
                    "persianCategory": spec.persian_category,
                    "status": "NOT_APPLICABLE",
                    "lastDoneJalali": None,
                    "nextDueJalali": None,
                    "intervalMonths": None,
                    "details": spec.details(patient, slugs, age)
                    or "Not indicated for this patient (age/sex/conditions).",
                    "guideline": spec.guideline,
                    "provenance": provenance(
                        "INFERENCE",
                        "Rule not applicable for this patient profile.",
                        "Ω-SIB preventive-care schedule",
                        confidence=0.9,
                        requires_confirmation=False,
                    ),
                }
            )
            continue

        interval = spec.interval_months(patient, slugs)
        last_done = _last_done_for(patient, spec)
        next_due = _add_months(last_done, interval) if last_done else None

        if next_due is None:
            status = "DUE"
        elif next_due > today + dt.timedelta(days=30):
            status = "UP_TO_DATE"
        elif next_due >= today - dt.timedelta(days=30):
            status = "DUE"
        else:
            status = "OVERDUE"

        if status == "UP_TO_DATE":
            detail = f"Completed {to_jalali_str(last_done)}; next due {to_jalali_str(next_due)}."
        elif last_done is None:
            detail = "No record found in SIB for this item — verify with the household file."
        else:
            months_late = _months_since(next_due, today) or 0
            detail = (
                f"Last done {to_jalali_str(last_done)}; due {to_jalali_str(next_due)} "
                f"({months_late} month(s) overdue)."
            )

        results.append(
            {
                "category": spec.category,
                "persianCategory": spec.persian_category,
                "status": status,
                "lastDoneJalali": to_jalali_str(last_done) if last_done else None,
                "nextDueJalali": to_jalali_str(next_due) if next_due else None,
                "intervalMonths": interval,
                "details": detail,
                "guideline": spec.guideline,
                "provenance": provenance(
                    "FACT" if last_done else "INFERENCE",
                    f"Interval {interval} months from the last recorded date.",
                    "Ω-SIB preventive-care schedule (national programmes)",
                    confidence=0.8,
                ),
            }
        )
    return results


def refresh_preventive_care(patient: Patient) -> list[dict[str, Any]]:
    """Compute live care gaps and upsert the cached ``preventive_care`` rows."""
    gaps = care_gaps(patient)
    index = {row.category: row for row in patient.preventive_care}
    for gap in gaps:
        row = index.get(gap["category"])
        if row is None:
            from ..models import PreventiveCareItem

            row = PreventiveCareItem(patient_id=patient.id, category=gap["category"])
            patient.preventive_care.append(row)
            index[gap["category"]] = row
        row.persian_category = gap["persianCategory"]
        row.status = gap["status"]
        row.last_done_jalali = gap["lastDoneJalali"]
        row.next_due_jalali = gap["nextDueJalali"]
        row.interval_months = gap["intervalMonths"]
        row.details = gap["details"]
        row.guideline = gap["guideline"]
    return gaps


def care_gap_summary(gaps: Iterable[dict[str, Any]]) -> dict[str, int]:
    counts = {"UP_TO_DATE": 0, "DUE": 0, "OVERDUE": 0, "NOT_APPLICABLE": 0}
    for gap in gaps:
        counts[gap["status"]] = counts.get(gap["status"], 0) + 1
    return counts


# --------------------------------------------------------------------------- #
# 3. Drug safety checks
# --------------------------------------------------------------------------- #
def _norm(text: str) -> str:
    return (text or "").lower().replace("‌", " ")


#: (class_a, class_b, severity, message, recommendation)
def _classes_of(name: str) -> set[str]:
    text = _norm(name)
    classes: set[str] = set()
    if any(k in text for k in ("warfarin", "وارفارین", "acenocoumarol")):
        classes.add("anticoagulant")
    if any(k in text for k in ("ibuprofen", "naproxen", "diclofenac", "ایبوپروفن", "دیکلوفناک", "نابروکسن", "indomethacin")):
        classes.add("nsaid")
    if any(k in text for k in ("aspirin", "asa", "آسپرین", "اسید استیل")):
        classes.add("aspirin")
    if any(k in text for k in ("enalapril", "lisinopril", "captopril", "ramipril", "losartan", "valsartan", "آنالاپریل", "لوزارتان", "والزارتان", "کاپتوپریل")):
        classes.add("ras_blocker")
    if any(k in text for k in ("spironolactone", "triamterene", "اسپیرونولاکتون", "پتاسیم")):
        classes.add("potassium_sparing")
    if any(k in text for k in ("metformin", "متفورمین")):
        classes.add("biguanide")
    if any(k in text for k in ("gliclazide", "glibenclamide", "insulin", "گلیکلازید", "انسولین")):
        classes.add("glucose_lowering")
    if any(k in text for k in ("prednisolone", "prednisone", "dexamethasone", "کورتون", "پردنیزولون", "دگزامتازون")):
        classes.add("corticosteroid")
    if any(k in text for k in ("digoxin", "دیگوکسین")):
        classes.add("digoxin")
    if any(k in text for k in ("amiodarone", "آمیودارون")):
        classes.add("amiodarone")
    if any(k in text for k in ("sertraline", "fluoxetine", "citalopram", "فلوکستین", "سرترالین")):
        classes.add("ssri")
    if any(k in text for k in ("sumatriptan", "سوماتریپتان")):
        classes.add("triptan")
    if any(k in text for k in ("atorvastatin", "simvastatin", "rosuvastatin", "آتورواستاتین", "سیمواستاتین", "لوواستاتین")):
        classes.add("statin")
    if any(k in text for k in ("gemfibrozil", "فنوفیبرات", "جم فیبروزیل")):
        classes.add("fibrate")
    if any(k in text for k in ("metronidazole", "fluconazole", "مترونیدازول", "فلوکونازول")):
        classes.add("cyp_inhibitor")
    if any(k in text for k in ("verapamil", "وراپامیل", "diltiazem", "دیلتیازم")):
        classes.add("non_dhp_ccb")
    if any(k in text for k in ("propranolol", "metoprolol", "bisoprolol", "آتنولول", "متوپرولول", "بیزوپرولول")):
        classes.add("beta_blocker")
    if any(k in text for k in ("hydrochlorothiazide", "hctz", "هیدروکلروتیازید")):
        classes.add("thiazide")
    return classes


INTERACTION_RULES: list[tuple[set[str], set[str], str, str, str]] = [
    (
        {"anticoagulant"},
        {"nsaid"},
        "HIGH",
        "NSAID added to an anticoagulant markedly increases gastrointestinal bleeding risk.",
        "Prefer paracetamol for analgesia, or add gastroprotection if an NSAID is unavoidable.",
    ),
    (
        {"anticoagulant"},
        {"cyp_inhibitor"},
        "HIGH",
        "CYP inhibitor may raise INR and bleeding risk.",
        "Recheck INR within 3–5 days and adjust the anticoagulant dose.",
    ),
    (
        {"ras_blocker"},
        {"potassium_sparing"},
        "HIGH",
        "Combined renin–angiotensin blockade and potassium-sparing diuretic can cause hyperkalaemia.",
        "Check serum potassium and creatinine within 1–2 weeks.",
    ),
    (
        {"statin"},
        {"fibrate"},
        "MEDIUM",
        "Statin + fibrate increases the risk of myopathy/rhabdomyolysis.",
        "Use the lowest effective dose and counsel on muscle symptoms.",
    ),
    (
        {"ssri"},
        {"nsaid"},
        "MEDIUM",
        "SSRI + NSAID increases upper gastrointestinal bleeding risk.",
        "Consider gastroprotection or an alternative analgesic.",
    ),
    (
        {"ssri"},
        {"triptan"},
        "MEDIUM",
        "SSRI + triptan may precipitate serotonin syndrome.",
        "Counsel on agitation, tremor and hyperthermia; consider alternatives.",
    ),
    (
        {"digoxin"},
        {"amiodarone"},
        "HIGH",
        "Amiodarone raises digoxin levels (P-glycoprotein inhibition).",
        "Halve the digoxin dose and check the level.",
    ),
    (
        {"beta_blocker"},
        {"non_dhp_ccb"},
        "HIGH",
        "Beta-blocker + non-dihydropyridine calcium channel blocker risks bradycardia/heart block.",
        "Monitor heart rate and consider an alternative antihypertensive.",
    ),
    (
        {"corticosteroid"},
        {"nsaid"},
        "MEDIUM",
        "Corticosteroid + NSAID increases peptic ulcer risk.",
        "Add a proton-pump inhibitor when the combination is required.",
    ),
    (
        {"corticosteroid"},
        {"glucose_lowering"},
        "MEDIUM",
        "Corticosteroids raise blood glucose and may destabilise diabetes control.",
        "Intensify glucose monitoring during steroid therapy.",
    ),
]

CONTRAST_CAUTION = {
    "biguanide": (
        "MEDIUM",
        "Metformin should be paused around iodinated-contrast imaging.",
        "Hold metformin at the time of the study and restart after renal function is confirmed stable.",
    )
}


def drug_alerts(patient: Patient, pending_service_codes: Iterable[str] = ()) -> list[dict[str, Any]]:
    meds = active_medications(patient)
    classes: dict[str, list[str]] = {}
    for med in meds:
        for cls in _classes_of(med.name):
            classes.setdefault(cls, []).append(med.name)

    alerts: list[dict[str, Any]] = []

    for cls_a, cls_b, severity, message, recommendation in INTERACTION_RULES:
        a_present = sorted({name for cls in cls_a & set(classes) for name in classes[cls]})
        b_present = sorted({name for cls in cls_b & set(classes) for name in classes[cls]})
        if a_present and b_present:
            alerts.append(
                {
                    "id": f"interaction-{cls_a}-{cls_b}",
                    "severity": severity,
                    "kind": "INTERACTION",
                    "title": f"Potential interaction: {'/'.join(a_present)} + {'/'.join(b_present)}",
                    "message": message,
                    "recommendation": recommendation,
                    "provenance": provenance(
                        "SUGGESTION",
                        "Rule-based drug-interaction screen over the active medication list.",
                        "Ω-SIB drug-safety rules",
                        confidence=0.7,
                    ),
                }
            )

    duplicate = {cls: names for cls, names in classes.items() if len(names) > 1 and cls in {"nsaid", "ras_blocker", "ssri", "statin"}}
    for cls, names in duplicate.items():
        alerts.append(
            {
                "id": f"duplicate-{cls}",
                "severity": "MEDIUM",
                "kind": "DUPLICATE_THERAPY",
                "title": f"Duplicate therapy within the same class ({cls}): {', '.join(names)}",
                "message": "Two drugs from the same class are active simultaneously.",
                "recommendation": "Confirm this is intentional; otherwise deprescribe one agent.",
                "provenance": provenance(
                    "SUGGESTION",
                    "Duplicate-therapy detection over the active medication list.",
                    "Ω-SIB drug-safety rules",
                    confidence=0.75,
                ),
            }
        )

    contrast_pending = [code for code in pending_service_codes if code.upper().startswith(("CT", "IMG-CT"))]
    if contrast_pending and classes.get("biguanide"):
        severity, message, recommendation = CONTRAST_CAUTION["biguanide"]
        alerts.append(
            {
                "id": "interaction-biguanide-contrast",
                "severity": severity,
                "kind": "MONITORING",
                "title": f"Metformin ({', '.join(classes['biguanide'])}) with pending contrast imaging",
                "message": message,
                "recommendation": recommendation,
                "provenance": provenance(
                    "SUGGESTION",
                    "Cross-check between the active medication list and pending imaging requests.",
                    "Ω-SIB drug-safety rules",
                    confidence=0.6,
                ),
            }
        )

    for med in meds:
        if med.compliance_reported == "IRREGULAR":
            alerts.append(
                {
                    "id": f"adherence-{med.id}",
                    "severity": "LOW",
                    "kind": "ADHERENCE",
                    "title": f"Reported irregular adherence: {med.name}",
                    "message": "The household file records irregular use of this medicine.",
                    "recommendation": "Reinforce adherence, simplify the regimen, or use a fixed-dose combination.",
                    "provenance": provenance(
                        "FACT",
                        "Recorded in the medication profile of the household file.",
                        "SIB medication profile",
                        confidence=0.9,
                    ),
                }
            )

    order = {"HIGH": 0, "MEDIUM": 1, "LOW": 2}
    alerts.sort(key=lambda a: order.get(a["severity"], 3))
    return alerts


# --------------------------------------------------------------------------- #
# 4. Data-quality audit
# --------------------------------------------------------------------------- #
def data_quality_audit(patient: Patient) -> list[dict[str, Any]]:
    findings: list[dict[str, Any]] = []
    today = _today()

    def add(severity: str, qtype: str, title: str, description: str, location: str, correction: str, source: str = "SIB record", ptype: str = "FACT", confidence: float = 0.9):
        findings.append(
            {
                "severity": severity,
                "type": qtype,
                "title": title,
                "description": description,
                "sibLocation": location,
                "suggestedCorrection": correction,
                "provenance": provenance(ptype, source, "SIB v2.4 audit", confidence=confidence),
            }
        )

    if not validate_national_id(patient.national_id):
        add(
            "CRITICAL",
            "INVALID_IDENTIFIER",
            "National ID fails its check digit",
            f"Recorded value {patient.national_id} does not satisfy the Iranian national-ID check-digit rule.",
            "Demographics → National ID",
            "Re-read the national card and correct the number; identity matching downstream depends on it.",
            ptype="INFERENCE",
            confidence=0.95,
        )
    if not patient.phone:
        add(
            "WARNING",
            "MISSING_FIELD",
            "Mobile phone number missing",
            "Follow-up calls and appointment reminders cannot be sent.",
            "Demographics → Contact",
            "Capture the mobile number at the next contact.",
        )
    if not patient.household_number:
        add(
            "WARNING",
            "MISSING_FIELD",
            "Household file number missing",
            "The patient cannot be linked to a household file (پرونده خانوار).",
            "Household file → Identifier",
            "Link the patient to the correct household file in SIB.",
        )
    if not patient.birth_date:
        add(
            "CRITICAL",
            "MISSING_FIELD",
            "Date of birth missing",
            "Age-dependent screening rules and risk scoring cannot run.",
            "Demographics → Birth date",
            "Enter the birth date (and Jalali equivalent).",
        )

    vitals = sorted_vitals(patient)
    if not vitals:
        add(
            "WARNING",
            "MISSING_FIELD",
            "No vital signs recorded",
            "No blood pressure, weight or glucose measurement exists in the record.",
            "Vitals → Measurement history",
            "Record a full vitals set at the next contact.",
        )
    else:
        months = _months_since(vitals[0].measured_at.date(), today)
        if months is not None and months > 12:
            add(
                "WARNING",
                "OUTDATED_SCREENING",
                f"Vitals are {months} months old",
                "Risk stratification relies on recent blood pressure and anthropometry.",
                "Vitals → Last measurement",
                "Repeat blood pressure, weight and height at the next visit.",
            )

    for vital in vitals[:5]:
        if vital.bp_systolic and vital.bp_diastolic and vital.bp_systolic <= vital.bp_diastolic:
            add(
                "CRITICAL",
                "CONTRADICTION",
                "Impossible blood-pressure pair",
                f"Recorded as {vital.bp_systolic}/{vital.bp_diastolic} mmHg on {to_jalali_str(vital.measured_at)}.",
                "Vitals → Blood pressure",
                "Re-measure and correct the entry; systolic must exceed diastolic.",
            )
        if vital.heart_rate and (vital.heart_rate < 30 or vital.heart_rate > 220):
            add(
                "WARNING",
                "CONTRADICTION",
                "Implausible heart rate",
                f"Recorded {vital.heart_rate} bpm — outside the plausible range.",
                "Vitals → Pulse",
                "Verify the entry against the paper/Behvarz record.",
            )
        if vital.weight_kg and vital.height_cm and vital.bmi and (vital.bmi < 10 or vital.bmi > 70):
            add(
                "WARNING",
                "CONTRADICTION",
                "Extreme body-mass index",
                f"Computed BMI is {vital.bmi} kg/m² from {vital.weight_kg} kg / {vital.height_cm} cm.",
                "Vitals → Anthropometry",
                "Re-measure height and weight.",
            )

    for med in active_medications(patient):
        if not med.indication:
            add(
                "NOTICE",
                "MISSING_FIELD",
                f"Medication without documented indication: {med.name}",
                "Rational-prescribing review requires an indication for every chronic medicine.",
                "Medication profile → Indication",
                "Add the indication (diagnosis or symptom) for this medicine.",
            )
        if med.name and "metformin" in med.name.lower():
            has_monitoring = any(v.hba1c is not None for v in vitals) or any(
                v.fasting_blood_sugar is not None for v in vitals
            )
            if not has_monitoring:
                add(
                    "WARNING",
                    "OUTDATED_SCREENING",
                    "Metformin without recent glycaemic monitoring",
                    "No HbA1c or fasting glucose result is present in the record.",
                    "Medication profile → Monitoring",
                    "Order HbA1c (or fasting glucose) to confirm safe ongoing therapy.",
                    ptype="INFERENCE",
                    confidence=0.8,
                )

    open_draft = [
        e for e in patient.encounters if e.status == "DRAFT" and _months_since(e.occurred_at.date(), today) not in (None, 0)
    ]
    for enc in open_draft:
        add(
            "NOTICE",
            "OUTDATED_SCREENING",
            f"Uncommitted draft visit from {enc.jalali_date or to_jalali_str(enc.occurred_at)}",
            "The visit was captured but never committed to SIB, so the national record is incomplete.",
            "Visits → Draft queue",
            "Review the draft and commit it, or discard it.",
            ptype="FACT",
            confidence=0.95,
        )

    order = {"CRITICAL": 0, "WARNING": 1, "NOTICE": 2}
    findings.sort(key=lambda f: order.get(f["severity"], 3))
    return findings


# --------------------------------------------------------------------------- #
# 5. Combined suggestions for the clinician
# --------------------------------------------------------------------------- #
def suggestions(patient: Patient, pending_service_codes: Iterable[str] = ()) -> list[dict[str, Any]]:
    """Priority-ordered clinical suggestions assembled from all rule families."""
    out: list[dict[str, Any]] = []
    slugs = condition_slugs(patient)

    risk = cvd_risk(patient)
    if risk["available"] and risk["colorCategory"] in {"ORANGE", "RED"}:
        out.append(
            {
                "id": "risk-high",
                "priority": "HIGH" if risk["colorCategory"] == "RED" else "MEDIUM",
                "actionType": "PREVENTIVE_SCREENING",
                "title": f"Elevated 10-year cardiovascular risk (~{risk['percentage']}%, {risk['colorCategory']})",
                "rationale": "Intensive risk-factor management and more frequent follow-up are indicated.",
                "draftValue": "order lipid profile; reinforce lifestyle; review antihypertensive therapy",
                "provenance": risk["provenance"],
            }
        )

    for cond in active_conditions(patient):
        if cond.control_status == "UNCONTROLLED":
            out.append(
                {
                    "id": f"control-{cond.id}",
                    "priority": "HIGH",
                    "actionType": "MEDICATION_ADJUSTMENT",
                    "title": f"{cond.name} is documented as uncontrolled",
                    "rationale": f"Recorded control status for {cond.persian_name or cond.name} is UNCONTROLLED.",
                    "draftValue": "intensify therapy and schedule an early review (2–4 weeks)",
                    "provenance": provenance(
                        "FACT",
                        "Control status field of the chronic-condition record.",
                        "SIB chronic-care module",
                        confidence=0.9,
                    ),
                }
            )

    for gap in care_gaps(patient):
        if gap["status"] == "OVERDUE":
            out.append(
                {
                    "id": f"gap-{gap['category']}",
                    "priority": "MEDIUM",
                    "actionType": "PREVENTIVE_SCREENING",
                    "title": f"Overdue: {gap['persianCategory']}",
                    "rationale": gap["details"],
                    "draftValue": gap["guideline"],
                    "provenance": gap["provenance"],
                }
            )

    for alert in drug_alerts(patient, pending_service_codes):
        if alert["severity"] in {"HIGH", "MEDIUM"}:
            out.append(
                {
                    "id": alert["id"],
                    "priority": "HIGH" if alert["severity"] == "HIGH" else "MEDIUM",
                    "actionType": "MEDICATION_ADJUSTMENT",
                    "title": alert["title"],
                    "rationale": alert["message"],
                    "draftValue": alert["recommendation"],
                    "provenance": alert["provenance"],
                }
            )

    if "diabetes" in slugs and not any(o["id"] == "gap-HBA1C" for o in out):
        out.append(
            {
                "id": "diabetes-hba1c",
                "priority": "ROUTINE",
                "actionType": "LAB_ORDER",
                "title": "Confirm glycaemic control with HbA1c",
                "rationale": "Diabetes follow-up relies on periodic HbA1c measurement.",
                "draftValue": "order HbA1c",
                "provenance": provenance(
                    "SUGGESTION",
                    "National diabetes programme follow-up interval.",
                    "Ω-SIB clinical rules",
                    confidence=0.75,
                ),
            }
        )

    order = {"HIGH": 0, "MEDIUM": 1, "ROUTINE": 2}
    out.sort(key=lambda s: order.get(s["priority"], 3))
    return out


def patient_brief(patient: Patient) -> dict[str, Any]:
    """Compact, LLM-friendly summary of a patient (grounding context)."""
    vital = latest_vital(patient)
    gaps = care_gaps(patient)
    return {
        "patient_id": patient.id,
        "name": patient.persian_name or patient.name,
        "age": age_from_birth_date(patient.birth_date),
        "gender": patient.gender,
        "national_id": patient.national_id,
        "household_number": patient.household_number,
        "insurance": patient.insurance_type,
        "smoker": patient.smoker,
        "conditions": [
            {
                "name": c.name,
                "persian": c.persian_name,
                "since": c.since_jalali,
                "control": c.control_status,
            }
            for c in active_conditions(patient)
        ],
        "medications": [
            {"name": m.name, "dose": m.dosage, "frequency": m.frequency, "adherence": m.compliance_reported}
            for m in active_medications(patient)
        ],
        "latest_vitals": (
            {
                "date": to_jalali_str(vital.measured_at),
                "bp": f"{vital.bp_systolic}/{vital.bp_diastolic}",
                "heart_rate": vital.heart_rate,
                "bmi": vital.bmi,
                "fasting_glucose": vital.fasting_blood_sugar,
                "hba1c": vital.hba1c,
                "total_cholesterol": vital.total_cholesterol,
            }
            if vital
            else None
        ),
        "recent_encounters": [
            {
                "date": to_jalali_str(e.occurred_at),
                "complaint": e.chief_complaint,
                "diagnoses": e.assessment,
                "status": e.status,
            }
            for e in sorted(patient.encounters, key=lambda e: e.occurred_at, reverse=True)[:5]
        ],
        "care_gaps": [
            {"item": g["persianCategory"], "status": g["status"], "detail": g["details"]}
            for g in gaps
            if g["status"] in {"DUE", "OVERDUE"}
        ],
        "open_data_issues": [
            {"severity": i.severity, "title": i.title} for i in patient.quality_issues if not i.resolved
        ],
        "risk": cvd_risk(patient),
        "drug_alerts": drug_alerts(patient),
    }
