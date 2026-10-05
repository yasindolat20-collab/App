"""Small helpers shared across the backend: Jalali dates, age, ID validation."""
from __future__ import annotations

import datetime as dt

# --------------------------------------------------------------------------- #
# Jalali (Solar Hijri) calendar
# --------------------------------------------------------------------------- #
_G_DAYS_IN_MONTH = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334]


def gregorian_to_jalali(gy: int, gm: int, gd: int) -> tuple[int, int, int]:
    """Convert a Gregorian date to the Jalali (Solar Hijri) calendar."""
    if gy > 1600:
        jy = 979
        gy -= 1600
    else:
        jy = 0
        gy -= 621
    gy2 = gy + 1 if gm > 2 else gy
    days = (
        (365 * gy)
        + ((gy2 + 3) // 4)
        - ((gy2 + 99) // 100)
        + ((gy2 + 399) // 400)
        - 80
        + gd
        + _G_DAYS_IN_MONTH[gm - 1]
    )
    jy += 33 * (days // 12053)
    days %= 12053
    jy += 4 * (days // 1461)
    days %= 1461
    if days > 365:
        jy += (days - 1) // 365
        days = (days - 1) % 365
    if days < 186:
        jm = 1 + days // 31
        jd = 1 + days % 31
    else:
        jm = 7 + (days - 186) // 30
        jd = 1 + (days - 186) % 30
    return jy, jm, jd


def to_jalali_str(value: dt.date | dt.datetime | None) -> str | None:
    """``2026-10-05`` -> ``1405/07/13``."""
    if value is None:
        return None
    return "%04d/%02d/%02d" % gregorian_to_jalali(value.year, value.month, value.day)


def jalali_to_gregorian(jy: int, jm: int, jd: int) -> tuple[int, int, int]:
    """Convert a Jalali (Solar Hijri) date back to the Gregorian calendar."""
    if jy > 979:
        gy = 1600
        jy -= 979
    else:
        gy = 621
    days = (365 * jy) + ((jy // 33) * 8) + (((jy % 33) + 3) // 4) + 78 + jd
    days += (jm - 1) * 31 if jm < 7 else ((jm - 7) * 30) + 186
    gy += 400 * (days // 146097)
    days %= 146097
    if days > 36524:
        days -= 1
        gy += 100 * (days // 36524)
        days %= 36524
        if days >= 365:
            days += 1
    gy += 4 * (days // 1461)
    days %= 1461
    if days > 365:
        gy += (days - 1) // 365
        days = (days - 1) % 365
    gd = days + 1
    leap = (gy % 4 == 0 and gy % 100 != 0) or (gy % 400 == 0)
    month_lengths = [31, 29 if leap else 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
    gm = 1
    for length in month_lengths:
        if gd <= length:
            break
        gd -= length
        gm += 1
    return gy, gm, gd


def parse_jalali_str(value: str | None) -> dt.date | None:
    """Parse ``1405/07/13`` (or ``1405-07-13``) into a Gregorian date."""
    if not value:
        return None
    parts = value.replace("-", "/").split("/")
    if len(parts) < 3:
        return None
    try:
        jy, jm, jd = (int(p) for p in parts[:3])
    except ValueError:
        return None
    gy, gm, gd = jalali_to_gregorian(jy, jm, jd)
    try:
        return dt.date(gy, gm, gd)
    except ValueError:
        return None


def today_jalali() -> str:
    return to_jalali_str(dt.date.today()) or ""


def age_from_birth_date(birth_date: dt.date | None) -> int | None:
    if not birth_date:
        return None
    today = dt.date.today()
    return today.year - birth_date.year - ((today.month, today.day) < (birth_date.month, birth_date.day))


# --------------------------------------------------------------------------- #
# Iranian national ID (کد ملی)
# --------------------------------------------------------------------------- #
def validate_national_id(value: str | None) -> bool:
    """Validate an Iranian 10-digit national ID using its check digit.

    Rules: exactly 10 digits, not all identical, and the weighted sum rule.
    """
    if not value:
        return False
    digits = str(value).strip()
    if len(digits) != 10 or not digits.isdigit():
        return False
    if len(set(digits)) == 1:
        return False
    checksum = sum(int(digits[i]) * (10 - i) for i in range(9))
    remainder = checksum % 11
    check = int(digits[9])
    return check == remainder if remainder < 2 else check == 11 - remainder


# --------------------------------------------------------------------------- #
# Misc
# --------------------------------------------------------------------------- #
def months_between(start: dt.date | None, end: dt.date | None) -> int | None:
    if not start or not end:
        return None
    return (end.year - start.year) * 12 + (end.month - start.month)


def bmi_for(weight_kg: float | None, height_cm: float | None) -> float | None:
    if not weight_kg or not height_cm:
        return None
    height_m = height_cm / 100.0
    if height_m <= 0:
        return None
    return round(weight_kg / (height_m**2), 1)


def parse_cholesterol_to_mmol(value: float | None, unit: str = "mg/dl") -> float | None:
    """Normalise total cholesterol to mmol/L (accepts mg/dL input)."""
    if value is None:
        return None
    if unit.lower().startswith("mg") or value > 20:
        return round(value / 38.67, 2)
    return round(value, 2)


def slugify_persian_fallback(text: str) -> str:
    """Very small helper used by tests / tooling."""
    return "_".join(text.strip().split())
