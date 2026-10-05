"""Visit → commit → SIB sync, referrals, services and reporting."""
from __future__ import annotations


def _create_visit(client, headers, patient_id, commit=False, pin=None):
    payload = {
        "patient_id": patient_id,
        "chief_complaint": "Mild headache and polyuria for two weeks",
        "assessment": ["Type 2 Diabetes Mellitus, suboptimal control"],
        "plan": ["Reinforce diet", "Repeat HbA1c in 3 months"],
        "prescriptions": [{"drug": "Metformin 500mg", "dose": "500 mg", "frequency": "BD", "duration": "30 days"}],
        "lab_orders": ["HbA1c", "Lipid profile"],
        "vitals": {"bp_systolic": 146, "bp_diastolic": 90, "weight_kg": 74, "height_cm": 158},
        "follow_up_days": 90,
        "commit": commit,
    }
    if pin:
        payload["pin"] = pin
    return client.post("/api/encounters", headers=headers, json=payload)


def test_visit_draft_then_commit_with_pin(client, doctor_headers, first_patient_id):
    created = _create_visit(client, doctor_headers, first_patient_id)
    assert created.status_code == 201, created.text
    encounter = created.json()
    assert encounter["status"] == "DRAFT"
    assert encounter["vitals_snapshot"]["bp_systolic"] == 146

    missing_pin = client.post(f"/api/encounters/{encounter['id']}/commit", headers=doctor_headers, json={})
    assert missing_pin.status_code == 403
    assert "PIN" in missing_pin.json()["detail"]

    committed = client.post(
        f"/api/encounters/{encounter['id']}/commit",
        headers=doctor_headers,
        json={"pin": "2468"},
    )
    assert committed.status_code == 200, committed.text
    body = committed.json()
    assert body["synced"] is True
    assert body["encounter"]["status"] == "COMMITTED"
    assert body["transaction"]["status"] == "SYNCED"
    assert body["transaction"]["summary"]

    again = client.post(f"/api/encounters/{encounter['id']}/commit", headers=doctor_headers, json={"pin": "2468"})
    assert again.status_code == 409


def test_commit_immediately_flag(client, admin_headers, first_patient_id):
    response = _create_visit(client, admin_headers, first_patient_id, commit=True)
    assert response.status_code == 200
    assert response.json()["encounter"]["status"] == "COMMITTED"


def test_visit_listing_and_detail(client, admin_headers, first_patient_id):
    listing = client.get(f"/api/encounters?patient_id={first_patient_id}", headers=admin_headers).json()
    assert listing["total"] >= 1
    encounter_id = listing["items"][0]["id"]
    detail = client.get(f"/api/encounters/{encounter_id}", headers=admin_headers).json()
    assert detail["id"] == encounter_id
    assert detail["patient"]["id"] == first_patient_id


def test_sync_queue_and_flush(client, admin_headers):
    queue = client.get("/api/sync/queue", headers=admin_headers).json()
    assert queue["adapter"] == "simulator"
    assert set(queue["counts"].keys()) == {"queued", "failed", "synced"}

    flush = client.post("/api/sync/flush", headers=admin_headers)
    assert flush.status_code == 200
    assert "synced" in flush.json()

    status = client.get("/api/sync/status", headers=admin_headers).json()
    assert status["configured_adapter"] == "simulator"


def test_referral_creation_with_default_workup_and_slip(client, doctor_headers, first_patient_id):
    created = client.post(
        "/api/referrals",
        headers=doctor_headers,
        json={
            "patient_id": first_patient_id,
            "specialty": "Cardiology",
            "persian_specialty": "قلب و عروق",
            "urgency": "URGENT",
            "reason": "Chest pain on exertion, needs cardiology assessment",
            "send": True,
        },
    )
    assert created.status_code == 201, created.text
    referral = created.json()
    assert referral["status"] == "SENT"
    assert referral["workup"], "specialty default workup checklist should be attached"
    assert referral["sync_transaction_id"]

    slip = client.get(f"/api/referrals/{referral['id']}/slip", headers=doctor_headers).json()
    assert slip["slip_number"] == referral["id"]
    assert slip["patient"]["national_id"]
    assert slip["workup_checklist"]

    updated = client.patch(
        f"/api/referrals/{referral['id']}", headers=doctor_headers, json={"status": "COMPLETED", "outcome": "PCI performed"}
    )
    assert updated.json()["status"] == "COMPLETED"


def test_referral_tracking_list(client, admin_headers):
    body = client.get("/api/referrals?status=COMPLETED", headers=admin_headers).json()
    assert body["total"] >= 1
    assert all(item["status"] == "COMPLETED" for item in body["items"])


def test_service_catalog_and_request(client, doctor_headers, first_patient_id):
    catalog = client.get("/api/services", headers=doctor_headers).json()
    codes = {item["code"] for item in catalog}
    assert {"LAB-HBA1C", "IMG-ECG", "SCR-PAP"} <= codes

    requested = client.post(
        "/api/service-requests",
        headers=doctor_headers,
        json={"patient_id": first_patient_id, "service_code": "LAB-HBA1C", "notes": "3-monthly monitoring"},
    )
    assert requested.status_code == 201, requested.text
    body = requested.json()
    assert body["status"] == "REQUESTED"
    assert body["service_persian_name"]
    assert body["sync_transaction_id"]

    updated = client.patch(
        f"/api/service-requests/{body['id']}",
        headers=doctor_headers,
        json={"status": "RESULTED", "result_summary": "HbA1c 7.4%"},
    )
    assert updated.json()["status"] == "RESULTED"
    assert updated.json()["resulted_at"]

    unknown = client.post(
        "/api/service-requests",
        headers=doctor_headers,
        json={"patient_id": first_patient_id, "service_code": "NOPE-1"},
    )
    assert unknown.status_code == 404


def test_reports_summary_care_gaps_and_quality(client, admin_headers):
    summary = client.get("/api/reports/summary", headers=admin_headers).json()
    assert summary["patients"]["total"] >= 4
    assert summary["visits"]["total"] >= 1
    assert "risk_distribution" in summary
    assert summary["care_gaps"]["overdue_items_total"] >= 0

    gaps = client.get("/api/reports/care-gaps", headers=admin_headers).json()
    assert "items" in gaps

    quality = client.get("/api/reports/data-quality", headers=admin_headers).json()
    assert "stored_issues" in quality and "live_findings" in quality
    assert quality["identity"]["invalid_national_ids"] == []


def test_reports_require_capability(client, behvarz_headers):
    assert client.get("/api/reports/summary", headers=behvarz_headers).status_code == 403
