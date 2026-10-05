"""Ω-Chat: draft planning and confirmed execution (offline rules engine)."""
from __future__ import annotations


def test_ai_status_offline_engine(client, admin_headers):
    body = client.get("/api/ai/status", headers=admin_headers).json()
    assert body["engine"] == "rules"
    assert body["llm_configured"] is False
    assert "REGISTER_VITALS" in body["action_catalogue"]


def test_chat_returns_grounded_draft_with_provenance(client, admin_headers, first_patient_id):
    response = client.post(
        "/api/ai/chat",
        headers=admin_headers,
        json={"message": "خلاصه وضعیت این بیمار را بده", "patient_id": first_patient_id},
    )
    assert response.status_code == 200, response.text
    body = response.json()
    assert body["session_id"]
    assert body["intent"] in {"SUMMARIZE_PATIENT", "CLINICAL_QUESTION", "GET_RISK"}
    assert body["provenance"]["type"] in {"SUGGESTION", "INFERENCE", "FACT"}
    assert body["evidence"], "the answer must cite grounded evidence"
    assert "risk" in {item["kind"] for item in body["evidence"]}


def test_chat_parses_persian_digits_into_a_draft_action(client, admin_headers, first_patient_id):
    response = client.post(
        "/api/ai/chat",
        headers=admin_headers,
        json={"message": "فشار خون ۱۵۰ روی ۹۵ و قند ناشتا ۱۴۲ را ثبت کن", "patient_id": first_patient_id},
    )
    body = response.json()
    assert body["intent"] == "REGISTER_VITALS"
    assert body["requires_confirmation"] is True
    action = body["draft_plan"]["actions"][0]
    assert action["type"] == "REGISTER_VITALS"
    assert action["params"]["bp_systolic"] == 150
    assert action["params"]["bp_diastolic"] == 95
    assert action["params"]["fasting_blood_sugar"] == 142

    # Nothing is written until the clinician confirms.
    vitals_before = client.get(f"/api/patients/{first_patient_id}/vitals", headers=admin_headers).json()["total"]

    executed = client.post(
        "/api/ai/execute",
        headers=admin_headers,
        json={"patient_id": first_patient_id, "session_id": body["session_id"], "actions": [action]},
    )
    assert executed.status_code == 200, executed.text
    result = executed.json()
    assert result["executed"] == 1
    assert result["audit_id"]
    assert result["results"][0]["data"]["sync"] == "SYNCED"

    vitals_after = client.get(f"/api/patients/{first_patient_id}/vitals", headers=admin_headers).json()["total"]
    assert vitals_after == vitals_before + 1


def test_chat_proposes_referral_draft(client, admin_headers, first_patient_id):
    body = client.post(
        "/api/ai/chat",
        headers=admin_headers,
        json={"message": "برای این بیمار ارجاع فوری به قلب لازم است", "patient_id": first_patient_id},
    ).json()
    assert body["intent"] == "CREATE_REFERRAL"
    action = body["draft_plan"]["actions"][0]
    assert action["params"]["specialty"] == "Cardiology"
    assert action["params"]["urgency"] == "URGENT"

    executed = client.post(
        "/api/ai/execute",
        headers=admin_headers,
        json={"patient_id": first_patient_id, "actions": [action]},
    ).json()
    assert executed["executed"] == 1
    referral_id = executed["results"][0]["data"]["referral_id"]
    assert client.get(f"/api/referrals/{referral_id}", headers=admin_headers).json()["status"] == "DRAFT"


def test_execute_is_audited(client, admin_headers, first_patient_id):
    client.post(
        "/api/ai/execute",
        headers=admin_headers,
        json={"patient_id": first_patient_id, "actions": [{"type": "GET_RISK", "description": "risk", "params": {}}]},
    )
    audit = client.get("/api/audit?action=ai.execute", headers=admin_headers).json()
    assert audit["total"] >= 1
    assert audit["items"][0]["actor"] == "admin"


def test_unknown_action_is_rejected_without_writing(client, admin_headers, first_patient_id):
    body = client.post(
        "/api/ai/execute",
        headers=admin_headers,
        json={"patient_id": first_patient_id, "actions": [{"type": "DROP_TABLE", "params": {}}]},
    ).json()
    assert body["executed"] == 0
    assert body["results"][0]["ok"] is False


def test_action_requiring_patient_without_context(client, admin_headers):
    body = client.post(
        "/api/ai/execute",
        headers=admin_headers,
        json={"actions": [{"type": "REGISTER_VITALS", "params": {"bp_systolic": 130}}]},
    ).json()
    assert body["executed"] == 0
    assert "patient context" in body["results"][0]["message"]


def test_chat_history_persisted(client, admin_headers, first_patient_id):
    session = client.post(
        "/api/ai/chat",
        headers=admin_headers,
        json={"message": "سلام", "patient_id": first_patient_id},
    ).json()["session_id"]
    history = client.get(f"/api/ai/history?session_id={session}", headers=admin_headers).json()
    assert len(history["items"]) == 2
    assert history["items"][0]["role"] == "user"
    assert history["items"][1]["role"] == "assistant"


def test_ai_execute_requires_capability(client, behvarz_headers, first_patient_id):
    response = client.post(
        "/api/ai/execute",
        headers=behvarz_headers,
        json={"patient_id": first_patient_id, "actions": [{"type": "GET_RISK", "params": {}}]},
    )
    assert response.status_code == 403
