#!/usr/bin/env python3
"""End-to-end smoke test against a running Ω-SIB API.

    python scripts/smoke_e2e.py [base_url]

Exercises the whole clinical workflow — login, patient search, chart, vitals,
visit commit with the clinical PIN, referral, service request, the AI
draft/execute contract, reporting, the SIB sync queue and the audit trail — and
prints a compact evidence report.
"""
from __future__ import annotations

import json
import sys

import httpx

BASE = sys.argv[1] if len(sys.argv) > 1 else "http://127.0.0.1:8000"
client = httpx.Client(base_url=BASE, timeout=120)
PASS, FAIL = "\033[92m✓\033[0m", "\033[91m✗\033[0m"
failures = 0


def step(label: str, ok: bool, detail: str = "") -> None:
    global failures
    if not ok:
        failures += 1
    print(f" {PASS if ok else FAIL} {label}" + (f"  →  {detail}" if detail else ""))


def show(label: str, payload) -> None:
    text = json.dumps(payload, ensure_ascii=False, indent=2, default=str)
    print(f"\n--- {label} ---\n{text[:1400]}")


print(f"Ω-SIB end-to-end smoke test against {BASE}\n")

# 1 — authentication -------------------------------------------------------
health = client.get("/api/health").json()
print(f"health: {health['status']} · db={health['database']} · ai={health['ai_engine']} · sib={health['sib_adapter']}\n")

login = client.post("/api/auth/login", json={"username": "dr.alavi", "password": "doctor123", "pin": "2468"})
step("login as dr.alavi (family physician)", login.status_code == 200, login.json().get("user", {}).get("role", login.text[:80]))
token = login.json()["access_token"]
client.headers.update({"Authorization": f"Bearer {token}"})

bad = client.post("/api/auth/login", json={"username": "dr.alavi", "password": "wrong"})
step("reject bad credentials", bad.status_code == 401)

me = client.get("/api/auth/me").json()
show("GET /api/auth/me", me)

# 2 — patient panel --------------------------------------------------------
listing = client.get("/api/patients", params={"limit": 10}).json()
step("list patients", listing["total"] >= 4, f"{listing['total']} household files")
show(
    "GET /api/patients",
    [
        {
            "id": p["id"],
            "name": p["persian_name"],
            "national_id": p["national_id"],
            "age": p["age"],
            "risk": p["risk_category"],
            "conditions": p["condition_count"],
            "open_issues": p["open_issue_count"],
            "last_visit": p["last_visit_jalali"],
        }
        for p in listing["items"]
    ],
)

patient_id = listing["items"][0]["id"]
search = client.get("/api/patients", params={"query": listing["items"][0]["national_id"]}).json()
step("search by national ID", search["total"] == 1)

chart = client.get(f"/api/patients/{patient_id}").json()
step("load patient chart", bool(chart["vitals"]) and chart["risk"] is not None and "preventive_care" in chart)
show(
    "GET /api/patients/{id} — clinical brain",
    {
        "risk": chart["risk"],
        "care_gap_summary": chart["care_gap_summary"],
        "suggestions": [
            {"priority": s["priority"], "title": s["title"], "provenance": s["provenance"]["type"]}
            for s in chart["suggestions"][:4]
        ],
        "alerts": [{"severity": a["severity"], "title": a["title"]} for a in chart["alerts"][:3]],
        "quality_issues": [{"severity": i["severity"], "title": i["title"]} for i in chart["quality_issues"][:3]],
    },
)

# 3 — visit → commit → SIB sync -------------------------------------------
visit = client.post(
    "/api/encounters",
    json={
        "patient_id": patient_id,
        "chief_complaint": "Polyuria and mild headache for two weeks",
        "assessment": ["Type 2 Diabetes Mellitus, suboptimal control", "Essential Hypertension, uncontrolled"],
        "plan": ["Reinforce diet and adherence", "Repeat HbA1c in 3 months", "Home blood-pressure log"],
        "prescriptions": [{"drug": "Metformin 500mg", "dose": "500 mg", "frequency": "BD", "duration": "30 days"}],
        "lab_orders": ["HbA1c", "Lipid profile"],
        "vitals": {"bp_systolic": 152, "bp_diastolic": 94, "weight_kg": 75, "height_cm": 158, "fasting_blood_sugar": 158},
        "referral_requested": True,
        "referral_specialty": "Cardiology",
        "follow_up_days": 90,
    },
)
step("create visit draft", visit.status_code == 201, f"encounter {visit.json()['id']} status={visit.json()['status']}")
encounter_id = visit.json()["id"]

no_pin = client.post(f"/api/encounters/{encounter_id}/commit", json={})
step("commit without clinical PIN is refused", no_pin.status_code == 403, no_pin.json()["detail"])

commit = client.post(f"/api/encounters/{encounter_id}/commit", json={"pin": "2468"})
body = commit.json()
step("commit visit with PIN → SIB sync", commit.status_code == 200 and body["synced"], f"tx {body['transaction']['id']} → {body['transaction']['status']}")
show("POST /api/encounters/{id}/commit", {"encounter_status": body["encounter"]["status"], "transaction": body["transaction"]})

# 4 — referral + service ---------------------------------------------------
referral = client.post(
    "/api/referrals",
    json={
        "patient_id": patient_id,
        "specialty": "Cardiology",
        "persian_specialty": "قلب و عروق",
        "urgency": "URGENT",
        "reason": "Uncontrolled hypertension with diabetes — cardiology assessment",
        "send": True,
    },
).json()
step("create + send referral", referral["status"] == "SENT", f"{referral['id']} · {len(referral['workup'])} workup items")
slip = client.get(f"/api/referrals/{referral['id']}/slip").json()
show("GET /api/referrals/{id}/slip", {"slip_number": slip["slip_number"], "patient": slip["patient"], "workup": slip["workup_checklist"]})

service = client.post(
    "/api/service-requests",
    json={"patient_id": patient_id, "service_code": "LAB-HBA1C", "notes": "3-monthly monitoring"},
).json()
step("request a service", service["status"] == "REQUESTED", f"{service['service_persian_name']} · tx {service['sync_transaction_id']}")

# 5 — AI interface ---------------------------------------------------------
status = client.get("/api/ai/status").json()
print(f"\nΩ-Chat engine: {status['engine']}")
chat = client.post(
    "/api/ai/chat",
    json={
        "message": "وضعیت این بیمار را خلاصه کن و فشار خون ۱۵۰ روی ۹۵ را ثبت کن",
        "patient_id": patient_id,
    },
).json()
step("AI chat returns a grounded draft", bool(chat["draft_plan"]["actions"]) and chat["requires_confirmation"], f"intent={chat['intent']} engine={chat['engine']}")
show(
    "POST /api/ai/chat",
    {
        "reply": chat["reply"],
        "intent": chat["intent"],
        "provenance": chat["provenance"],
        "evidence": [e["label"] for e in chat["evidence"][:4]],
        "draft_plan": chat["draft_plan"],
    },
)

execute = client.post(
    "/api/ai/execute",
    json={"patient_id": patient_id, "session_id": chat["session_id"], "actions": chat["draft_plan"]["actions"]},
).json()
step("AI execute performs the confirmed actions", execute["executed"] >= 1, f"audit_id={execute['audit_id']}")
show("POST /api/ai/execute", execute["results"])

# 6 — reporting, queue, audit ---------------------------------------------
report = client.get("/api/reports/summary").json()
show("GET /api/reports/summary", {
    "patients": report["patients"],
    "visits": report["visits"],
    "referrals": report["referrals"],
    "services": report["services"],
    "sync": report["sync"],
    "risk_distribution": report["risk_distribution"],
    "care_gaps": report["care_gaps"],
})

gaps = client.get("/api/reports/care-gaps").json()
step("care-gap worklist", gaps["total"] > 0, f"{gaps['total']} items ({gaps['overdue']} overdue)")

quality = client.get("/api/reports/data-quality").json()
step("data-quality report", "live_findings" in quality, f"{quality['live_findings']['total']} live findings, {quality['stored_issues']['total']} stored")

queue = client.get("/api/sync/queue").json()
step("SIB sync queue", queue["counts"]["synced"] > 0, json.dumps(queue["counts"]))
show("GET /api/sync/queue (latest)", queue["items"][0])

audit = client.get("/api/audit", params={"limit": 12}).json()
step("audit trail", audit["total"] > 0, f"{audit['total']} rows returned")
show("GET /api/audit", [{"at": r["at"], "actor": r["actor"], "action": r["action"], "entity": f"{r['entity_type']}:{r['entity_id']}"} for r in audit["items"][:8]])

# 7 — RBAC -----------------------------------------------------------------
behvarz = httpx.Client(base_url=BASE, timeout=60)
token_b = behvarz.post("/api/auth/login", json={"username": "behvarz.karimi", "password": "behvarz123"}).json()["access_token"]
behvarz.headers.update({"Authorization": f"Bearer {token_b}"})
step("Behvarz can read the panel", behvarz.get("/api/patients").status_code == 200)
step("Behvarz cannot commit visits", behvarz.post(f"/api/encounters/{encounter_id}/commit", json={}).status_code == 403)
step("Behvarz cannot open reports", behvarz.get("/api/reports/summary").status_code == 403)

print(f"\n{'=' * 62}\n{'ALL CHECKS PASSED' if failures == 0 else f'{failures} CHECK(S) FAILED'}\n{'=' * 62}")
sys.exit(1 if failures else 0)
