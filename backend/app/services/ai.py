"""Ω-Chat: the AI interface of Ω-SIB.

Design principles
-----------------
1. **Grounded.** The language model never invents the clinical facts: the
   request carries a compact patient brief built by the deterministic rules
   engine (:func:`app.services.clinical_rules.patient_brief`).
2. **Draft → confirm → execute.** The model may only *propose* a structured
   plan of actions. Nothing is written to the database until the clinician
   confirms the plan through ``POST /api/ai/execute``; every executed action is
   audited.
3. **Degrades gracefully.** Without an API key the assistant answers from the
   deterministic rules engine only (``engine="rules"``), so the product is fully
   usable offline / air-gapped.

Any OpenAI-compatible chat-completions endpoint works. Configure
``AI_BASE_URL`` / ``AI_API_KEY`` / ``AI_MODEL``.
"""
from __future__ import annotations

import datetime as dt
import json
import re
from typing import Any

import httpx

from ..config import settings

# --------------------------------------------------------------------------- #
# Action vocabulary — the only things the assistant may propose
# --------------------------------------------------------------------------- #
ACTION_CATALOG: dict[str, dict[str, Any]] = {
    "REGISTER_VITALS": {
        "description": "Record a new vital-signs set for the patient.",
        "params": {
            "bp_systolic": "int",
            "bp_diastolic": "int",
            "heart_rate": "int",
            "weight_kg": "number",
            "height_cm": "number",
            "fasting_blood_sugar": "number",
            "hba1c": "number",
            "total_cholesterol": "number",
        },
        "write": True,
    },
    "CREATE_ENCOUNTER": {
        "description": "Create a draft visit note for the patient.",
        "params": {
            "chief_complaint": "string",
            "assessment": "list[string]",
            "plan": "list[string]",
            "follow_up_days": "int",
        },
        "write": True,
    },
    "CREATE_REFERRAL": {
        "description": "Create a referral slip to a specialty.",
        "params": {
            "specialty": "string",
            "persian_specialty": "string",
            "urgency": "ROUTINE|URGENT|EMERGENCY",
            "reason": "string",
            "workup": "list[string]",
            "send": "bool",
        },
        "write": True,
    },
    "REQUEST_SERVICE": {
        "description": "Request a catalogue service (lab / imaging / screening).",
        "params": {"service_code": "string", "notes": "string"},
        "write": True,
    },
    "RESOLVE_QUALITY_ISSUE": {
        "description": "Mark a data-quality finding as resolved.",
        "params": {"issue_id": "string"},
        "write": True,
    },
    "SYNC_FLUSH": {
        "description": "Flush the pending SIB sync queue.",
        "params": {},
        "write": True,
    },
    "SUMMARIZE_PATIENT": {
        "description": "Read-only: summarise the patient record.",
        "params": {},
        "write": False,
    },
    "GET_RISK": {
        "description": "Read-only: return the cardiovascular risk estimate.",
        "params": {},
        "write": False,
    },
    "SEARCH_PATIENTS": {
        "description": "Read-only: search patients by name or national ID.",
        "params": {"query": "string"},
        "write": False,
    },
}

READ_ONLY_ACTIONS = {k for k, v in ACTION_CATALOG.items() if not v["write"]}

PERSIAN_DIGITS = str.maketrans("۰۱۲۳۴۵۶۷۸۹٠١٢٣٤٥٦٧٨٩", "01234567890123456789")

SYSTEM_PROMPT = """You are Ω-SIB Assistant (دستیار هوشمند سیب), a clinical decision-support assistant \
embedded in the Ω-SIB system used by family physicians in Iran.

Rules you must follow:
1. Work strictly from the structured patient brief you are given. Never invent \
vital signs, laboratory values, diagnoses, or medication names. If a value is \
absent, say it is absent.
2. Answer in the same language as the clinician's message (Persian → Persian, \
English → English). Be concise and clinically precise; use Persian medical \
terminology when answering in Persian.
3. You propose actions only through the action catalogue. Every proposed action \
is a DRAFT: the clinician reviews and confirms it before anything is written.
4. Distinguish clearly between facts taken from the record, inferences drawn \
from them, and suggestions you add. The `provenance` block carries this.
5. Never state a definitive diagnosis or a definitive prescription. You may \
suggest, with rationale, and mark it as requiring confirmation.
6. Respect Iranian national programmes (IraPEN cardiovascular risk, national \
screening intervals, Behvarz household-file workflow).

Return JSON only, matching the supplied schema."""

#: JSON schema handed to the model for structured output.
PLAN_SCHEMA: dict[str, Any] = {
    "type": "object",
    "properties": {
        "reply": {
            "type": "string",
            "description": "Answer to the clinician, in their language.",
        },
        "intent": {
            "type": "string",
            "description": "Short machine-readable intent label, e.g. REGISTER_VITALS, "
            "CREATE_REFERRAL, SUMMARIZE_PATIENT, CLINICAL_QUESTION.",
        },
        "summary": {
            "type": "string",
            "description": "One-line summary of the proposed plan.",
        },
        "actions": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "type": {"type": "string", "enum": sorted(ACTION_CATALOG.keys())},
                    "description": {"type": "string"},
                    # Strict structured output forbids free-form objects, so the
                    # parameters travel as a JSON string and are parsed here.
                    "params_json": {
                        "type": "string",
                        "description": "JSON object literal with the action parameters, "
                        "e.g. {\"bp_systolic\": 150, \"bp_diastolic\": 95}",
                    },
                },
                "required": ["type", "description", "params_json"],
                "additionalProperties": False,
            },
        },
        "provenance": {
            "type": "object",
            "properties": {
                "type": {"type": "string", "enum": ["FACT", "INFERENCE", "SUGGESTION", "UNKNOWN"]},
                "sourceText": {"type": "string"},
                "confidence": {"type": "number"},
            },
            "required": ["type", "sourceText", "confidence"],
            "additionalProperties": False,
        },
    },
    "required": ["reply", "intent", "summary", "actions", "provenance"],
    "additionalProperties": False,
}


# --------------------------------------------------------------------------- #
# Helpers
# --------------------------------------------------------------------------- #
def normalise_digits(text: str) -> str:
    return (text or "").translate(PERSIAN_DIGITS)


def _now_iso() -> str:
    return dt.datetime.now(dt.timezone.utc).isoformat(timespec="seconds")


def _provenance(ptype: str, source: str, system: str, confidence: float) -> dict[str, Any]:
    return {
        "type": ptype,
        "sourceText": source,
        "sourceSystem": system,
        "confidence": confidence,
        "requiresConfirmation": True,
        "timestamp": _now_iso(),
    }


# --------------------------------------------------------------------------- #
# Offline / fallback engine (deterministic)
# --------------------------------------------------------------------------- #
_INTENT_PATTERNS: list[tuple[str, list[str]]] = [
    ("SYNC_FLUSH", ["همگام", "سینک", "ارسال به سیب", "sync", "flush"]),
    ("CREATE_REFERRAL", ["ارجاع", "ارجاعیه", "referral", "refer to", "متخصص"]),
    ("REQUEST_SERVICE", ["آزمایش", "خدمات", "درخواست", "رادیولوژی", "سونوگرافی", "نوار قلب", "lab", "test order", "imaging", "x-ray", "ct ", "mri"]),
    ("REGISTER_VITALS", ["فشار خون", "قند خون", "وزن", "قد", "ضربان", "علائم حیاتی", "vitals", "blood pressure", "glucose", "weight", "bmi", "hba1c"]),
    ("GET_RISK", ["خطر قلبی", "ریسک", "risk", "ira pen", "irapen", "قلبی عروقی"]),
    ("RESOLVE_QUALITY_ISSUE", ["نقص اطلاعات", "کیفیت داده", "data quality", "نقص پرونده"]),
    ("SEARCH_PATIENTS", ["جستجو", "پیدا کن", "search patient", "find patient"]),
    ("CREATE_ENCOUNTER", ["ویزیت", "معاینه", "شرح حال", "ثبت ویزیت", "visit", "encounter", "note"]),
    ("SUMMARIZE_PATIENT", ["خلاصه", "وضعیت بیمار", "مرور", "summar", "overview", "review"]),
]


def _extract_number(text: str, patterns: list[str]) -> float | None:
    for pattern in patterns:
        match = re.search(pattern, text, flags=re.IGNORECASE)
        if match:
            try:
                return float(match.group(1))
            except (TypeError, ValueError):
                continue
    return None


def rule_based_plan(message: str, brief: dict[str, Any] | None) -> dict[str, Any]:
    """Deterministic assistant used when no LLM is configured (or on failure)."""
    text = normalise_digits(message or "")
    lowered = text.lower()

    intent = "CLINICAL_QUESTION"
    for candidate, keywords in _INTENT_PATTERNS:
        if any(keyword in lowered for keyword in keywords):
            intent = candidate
            break

    actions: list[dict[str, Any]] = []
    lines: list[str] = []

    bp = re.search(r"\b(\d{2,3})\s*(?:/|بر|روی|on|over)\s*(\d{2,3})\b", text)
    glucose = _extract_number(text, [r"(?:قند|fbs|glucose)\D{0,12}(\d{2,4})"])
    hba1c = _extract_number(text, [r"(?:hba1c|هماگلوبین|آ1سی)\D{0,12}(\d{1,2}(?:\.\d)?)"])
    weight = _extract_number(text, [r"(?:وزن|weight)\D{0,12}(\d{2,3}(?:\.\d)?)"])
    height = _extract_number(text, [r"(?:قد|height)\D{0,12}(\d{2,3})"])
    hr = _extract_number(text, [r"(?:ضربان|pulse|hr)\D{0,12}(\d{2,3})"])

    if intent == "REGISTER_VITALS" or bp or glucose is not None or hba1c is not None:
        params: dict[str, Any] = {}
        if bp:
            params["bp_systolic"] = int(bp.group(1))
            params["bp_diastolic"] = int(bp.group(2))
        if glucose is not None:
            params["fasting_blood_sugar"] = glucose
        if hba1c is not None:
            params["hba1c"] = hba1c
        if weight is not None:
            params["weight_kg"] = weight
        if height is not None:
            params["height_cm"] = height
        if hr is not None:
            params["heart_rate"] = int(hr)
        if params:
            intent = "REGISTER_VITALS"
            actions.append(
                {
                    "type": "REGISTER_VITALS",
                    "description": "ثبت علائم حیاتی جدید در پرونده / record a new vitals set",
                    "params": params,
                    "provenance": _provenance(
                        "INFERENCE",
                        "Values parsed from the clinician's message text.",
                        "Ω-SIB offline parser",
                        0.8,
                    ),
                }
            )
            lines.append("علائم حیاتی زیر از پیام شما استخراج شد و آماده ثبت است.")
        else:
            lines.append("مقادیر علائم حیاتی در متن پیام پیدا نشد؛ لطفاً مقادیر را به‌صورت صریح وارد کنید.")

    elif intent == "CREATE_REFERRAL":
        specialty = "Cardiology"
        if "قلب" in text or "cardio" in lowered:
            specialty = "Cardiology"
        elif "غدد" in text or "endocrin" in lowered:
            specialty = "Endocrinology"
        elif "چشم" in text or "ophthal" in lowered:
            specialty = "Ophthalmology"
        elif "ارتوپد" in text or "ortho" in lowered:
            specialty = "Orthopedics"
        elif "روان" in text or "psych" in lowered:
            specialty = "Psychiatry"
        urgency = "URGENT" if ("فوری" in text or "urgent" in lowered) else "ROUTINE"
        actions.append(
            {
                "type": "CREATE_REFERRAL",
                "description": f"Create a {urgency.lower()} referral draft to {specialty}",
                "params": {"specialty": specialty, "urgency": urgency, "reason": message.strip()},
                "provenance": _provenance(
                    "SUGGESTION",
                    "Specialty inferred from the message keywords.",
                    "Ω-SIB offline parser",
                    0.6,
                ),
            }
        )
        lines.append("پیش‌نویس ارجاعیه ساخته شد؛ پس از بازبینی، تأیید و ارسال کنید.")

    elif intent == "REQUEST_SERVICE":
        code = "LAB-CBC"
        mapping = [
            ("قند", "LAB-FBS"), ("fbs", "LAB-FBS"), ("hba1c", "LAB-HBA1C"),
            ("چربی", "LAB-LIPID"), ("lipid", "LAB-LIPID"), ("کبد", "LAB-LFT"),
            ("کلیه", "LAB-KFT"), ("creatinine", "LAB-KFT"), ("tsh", "LAB-TSH"),
            ("نوار قلب", "IMG-ECG"), ("ecg", "IMG-ECG"), ("قلب", "IMG-ECG"),
            ("مثانه", "IMG-ULTRASOUND-ABDOMEN"), ("سونوگرافی", "IMG-ULTRASOUND-ABDOMEN"),
            ("سینه", "IMG-MAMMOGRAPHY"), ("ماموگرافی", "IMG-MAMMOGRAPHY"),
            ("ct", "IMG-CT"), ("سی تی", "IMG-CT"),
        ]
        for keyword, candidate in mapping:
            if keyword in lowered:
                code = candidate
                break
        actions.append(
            {
                "type": "REQUEST_SERVICE",
                "description": f"Request service {code}",
                "params": {"service_code": code},
                "provenance": _provenance(
                    "SUGGESTION",
                    "Service chosen from catalogue keywords in the message.",
                    "Ω-SIB offline parser",
                    0.6,
                ),
            }
        )
        lines.append(f"درخواست خدمت {code} آماده ثبت است.")

    elif intent == "SYNC_FLUSH":
        actions.append(
            {
                "type": "SYNC_FLUSH",
                "description": "Flush the queued SIB transactions",
                "params": {},
                "provenance": _provenance("FACT", "Explicit clinician request.", "Ω-SIB", 0.95),
            }
        )
        lines.append("صف ارسال به سیب تخلیه خواهد شد.")

    elif intent == "CREATE_ENCOUNTER":
        actions.append(
            {
                "type": "CREATE_ENCOUNTER",
                "description": "Create a draft visit note from the message",
                "params": {"chief_complaint": message.strip(), "assessment": [], "plan": []},
                "provenance": _provenance("FACT", "Text provided by the clinician.", "Ω-SIB", 0.85),
            }
        )
        lines.append("پیش‌نویس ویزیت آماده شد؛ تشخیص و اقدامات را بازبینی کنید.")

    # Read-only context every answer can rely on.
    if brief:
        risk = brief.get("risk") or {}
        if intent in {"GET_RISK", "SUMMARIZE_PATIENT", "CLINICAL_QUESTION"} and risk.get("available"):
            actions.append(
                {
                    "type": "GET_RISK",
                    "description": "Attach the computed cardiovascular risk estimate",
                    "params": {},
                    "provenance": risk.get("provenance", _provenance("INFERENCE", "rules engine", "Ω-SIB", 0.6)),
                }
            )
        if intent == "SUMMARIZE_PATIENT":
            actions.append(
                {
                    "type": "SUMMARIZE_PATIENT",
                    "description": "Attach the patient summary",
                    "params": {},
                    "provenance": _provenance("FACT", "Record content read from Ω-SIB.", "Ω-SIB", 0.9),
                }
            )

    reply_lines: list[str] = []
    if brief:
        name = brief.get("name", "")
        conditions = "، ".join(c["persian"] or c["name"] for c in brief.get("conditions", [])) or "بدون بیماری مزمن ثبت‌شده"
        risk = brief.get("risk") or {}
        risk_text = (
            f"خطر قلبی‌عروقی تقریبی {risk.get('percentage')}% ({risk.get('colorCategory')})"
            if risk.get("available")
            else "برآورد خطر قلبی‌عروقی ممکن نیست (داده کافی نیست)"
        )
        gaps = brief.get("care_gaps") or []
        gap_text = "، ".join(f"{g['item']} ({g['status']})" for g in gaps) or "مورد سررسیده‌ای ثبت نشد"
        reply_lines.append(f"بیمار: {name} — {brief.get('age')} ساله — بیماری‌های فعال: {conditions}")
        reply_lines.append(f"آخرین علائم حیاتی: {brief.get('latest_vitals')}")
        reply_lines.append(f"{risk_text}")
        reply_lines.append(f"اقدامات سررسیده: {gap_text}")
        alerts = brief.get("drug_alerts") or []
        if alerts:
            reply_lines.append("هشدارهای دارویی: " + "؛ ".join(a["title"] for a in alerts[:3]))
        if brief.get("open_data_issues"):
            reply_lines.append(
                "نقص‌های اطلاعاتی باز: " + "؛ ".join(i["title"] for i in brief["open_data_issues"][:3])
            )
    reply_lines.extend(lines)
    if not lines:
        reply_lines.append(
            "پرسش شما ثبت شد. برای ثبت داده یا انجام اقدام، مقدار یا درخواست را صریح بنویسید "
            "(مثال: «فشار خون ۱۵۰ روی ۹۵ ثبت کن»)."
        )

    has_write_action = any(a["type"] not in READ_ONLY_ACTIONS for a in actions)

    return {
        "reply": "\n".join(reply_lines),
        "intent": intent,
        "summary": lines[0] if lines else "اطلاعات پرونده ارائه شد / patient context provided",
        "actions": actions,
        "provenance": _provenance(
            "SUGGESTION",
            "Generated by the deterministic Ω-SIB rules engine (no language model configured).",
            "Ω-SIB rules engine (offline)",
            0.7,
        ),
        "engine": "rules",
        "requires_confirmation": has_write_action,
    }


# --------------------------------------------------------------------------- #
# LLM engine
# --------------------------------------------------------------------------- #
def _token_param(model: str) -> dict[str, Any]:
    model_lower = model.lower()
    if model_lower.startswith(("gpt-", "o1", "o3", "o4")):
        # GPT-5 class models spend output budget on hidden reasoning; cap it so the
        # structured answer is never truncated.
        return {
            "max_completion_tokens": settings.ai_max_output_tokens,
            "reasoning": {"effort": "minimal"},
        }
    if model_lower.startswith("gemini"):
        return {"max_tokens": settings.ai_max_output_tokens}
    return {"max_tokens": settings.ai_max_output_tokens}


def call_llm(messages: list[dict[str, Any]], *, schema: dict[str, Any] | None = None) -> dict[str, Any]:
    """Call the configured OpenAI-compatible endpoint. Raises on transport error."""
    url = settings.ai_base_url.rstrip("/")
    if not url.endswith("/chat/completions"):
        url = f"{url}/chat/completions"
    payload: dict[str, Any] = {
        "model": settings.ai_model,
        "messages": messages,
        "temperature": 0.2,
        **_token_param(settings.ai_model),
    }
    if schema:
        payload["response_format"] = {
            "type": "json_schema",
            "json_schema": {"name": "omega_sib_plan", "strict": True, "schema": schema},
        }
    headers = {
        "Authorization": f"Bearer {settings.ai_api_key}",
        "Content-Type": "application/json",
    }
    with httpx.Client(timeout=settings.ai_timeout_seconds) as client:
        response = client.post(url, json=payload, headers=headers)
        response.raise_for_status()
        return response.json()


def _content_of(response: dict[str, Any]) -> str:
    choices = response.get("choices") or []
    if not choices:
        return ""
    message = choices[0].get("message") or {}
    content = message.get("content")
    if isinstance(content, list):  # some providers return content parts
        return "".join(part.get("text", "") for part in content if isinstance(part, dict))
    return content or ""


def llm_plan(message: str, brief: dict[str, Any] | None, history: list[dict[str, str]] | None = None) -> dict[str, Any]:
    """Ask the configured model for a structured plan (raises on failure)."""
    context = json.dumps(brief, ensure_ascii=False, default=str) if brief else "{}"
    messages: list[dict[str, Any]] = [{"role": "system", "content": SYSTEM_PROMPT}]
    for turn in (history or [])[-6:]:
        role = turn.get("role") if isinstance(turn, dict) else None
        content = turn.get("content") if isinstance(turn, dict) else None
        if role in {"user", "assistant"} and content:
            messages.append({"role": role, "content": str(content)})
    messages.append(
        {
            "role": "user",
            "content": (
                "STRUCTURED PATIENT BRIEF (source of truth):\n"
                f"{context}\n\n"
                "ACTION CATALOGUE (the only allowed action types):\n"
                f"{json.dumps({k: v['params'] for k, v in ACTION_CATALOG.items()}, ensure_ascii=False)}\n\n"
                f"CLINICIAN MESSAGE:\n{message}"
            ),
        }
    )
    response = call_llm(messages, schema=PLAN_SCHEMA)
    raw = _content_of(response)
    if not raw or not raw.strip():
        choice = (response.get("choices") or [{}])[0]
        raise RuntimeError(
            "the model returned an empty completion "
            f"(finish_reason={choice.get('finish_reason')}); "
            "consider raising AI_MAX_OUTPUT_TOKENS or lowering reasoning effort"
        )
    data = json.loads(raw)
    actions = []
    for action in data.get("actions", []) or []:
        if action.get("type") in ACTION_CATALOG:
            raw_params = action.pop("params_json", None) or action.pop("params", None)
            if isinstance(raw_params, str):
                try:
                    params = json.loads(raw_params) if raw_params.strip() else {}
                except json.JSONDecodeError:
                    params = {}
            elif isinstance(raw_params, dict):
                params = raw_params
            else:
                params = {}
            action["params"] = params if isinstance(params, dict) else {}
            action["provenance"] = {
                "type": "SUGGESTION",
                "sourceText": "Proposed by the language model from the structured patient brief.",
                "sourceSystem": f"LLM:{settings.ai_model}",
                "confidence": 0.6,
                "requiresConfirmation": True,
                "timestamp": _now_iso(),
            }
            actions.append(action)
    has_write_action = any(a["type"] not in READ_ONLY_ACTIONS for a in actions)
    provenance = data.get("provenance") or {}
    provenance.update(
        {
            "sourceSystem": f"LLM:{settings.ai_model}",
            "requiresConfirmation": has_write_action,
            "timestamp": _now_iso(),
        }
    )
    return {
        "reply": data.get("reply") or "",
        "intent": data.get("intent") or "CLINICAL_QUESTION",
        "summary": data.get("summary") or "",
        "actions": actions,
        "provenance": provenance,
        "engine": f"llm:{settings.ai_model}",
        "requires_confirmation": has_write_action,
    }


def build_plan(message: str, brief: dict[str, Any] | None, history: list[dict[str, str]] | None = None) -> dict[str, Any]:
    """Top-level entry point: LLM when configured, deterministic rules otherwise."""
    if settings.ai_enabled:
        try:
            plan = llm_plan(message, brief, history)
            if plan.get("reply"):
                return plan
        except Exception as exc:  # noqa: BLE001 - fall back rather than fail the clinician
            fallback = rule_based_plan(message, brief)
            fallback["reply"] = (
                f"[LLM unavailable: {type(exc).__name__}] شبیه‌ساز قوانین بالینی پاسخ می‌دهد.\n\n"
                + fallback["reply"]
            )
            return fallback
    return rule_based_plan(message, brief)


def engine_name() -> str:
    return f"llm:{settings.ai_model}" if settings.ai_enabled else "rules"
