"""Patient, vitals, preventive-care and quality endpoints."""
from __future__ import annotations

import pytest


def test_patient_search_and_pagination(client, admin_headers):
    response = client.get("/api/patients?limit=2", headers=admin_headers)
    assert response.status_code == 200
    body = response.json()
    assert body["total"] >= 4
    assert len(body["items"]) == 2
    assert all("national_id" in item for item in body["items"])


def test_patient_search_by_national_id(client, admin_headers):
    listing = client.get("/api/patients", headers=admin_headers).json()
    target = listing["items"][0]
    found = client.get(f"/api/patients?query={target['national_id']}", headers=admin_headers).json()
    assert found["total"] == 1
    assert found["items"][0]["id"] == target["id"]


def test_patient_search_by_persian_name(client, admin_headers):
    found = client.get("/api/patients?query=فاطمه", headers=admin_headers).json()
    assert found["total"] >= 1


def test_patient_detail_contains_clinical_brain(client, admin_headers, first_patient_id):
    body = client.get(f"/api/patients/{first_patient_id}", headers=admin_headers).json()
    for key in (
        "conditions",
        "medications",
        "vitals",
        "encounters",
        "preventive_care",
        "quality_issues",
        "referrals",
        "service_requests",
        "risk",
        "suggestions",
        "alerts",
    ):
        assert key in body, key
    assert body["risk"]["available"] is True
    assert body["preventive_care"]


def test_patient_not_found(client, admin_headers):
    assert client.get("/api/patients/p-unknown", headers=admin_headers).status_code == 404


def test_create_patient_validates_national_id(client, admin_headers):
    bad = client.post(
        "/api/patients",
        headers=admin_headers,
        json={"national_id": "1234567890", "name": "Bad Id", "persian_name": "بد"},
    )
    assert bad.status_code == 422


def test_create_patient_and_record_vitals(client, admin_headers):
    created = client.post(
        "/api/patients",
        headers=admin_headers,
        json={
            "national_id": "1234567891",
            "name": "Hasan Ahmadi",
            "persian_name": "حسن احمدی",
            "gender": "M",
            "birth_date": "1970-03-02",
            "household_number": "44-ب-210",
            "phone": "0913-111-2222",
            "insurance_type": "Rural Health Insurance",
            "smoker": True,
            "conditions": [
                {"name": "Essential Hypertension", "persian_name": "پرفشاری خون", "control_status": "SUBOPTIMAL"}
            ],
            "initial_vitals": {"bp_systolic": 158, "bp_diastolic": 96, "weight_kg": 88, "height_cm": 172},
        },
    )
    assert created.status_code == 201, created.text
    patient = created.json()
    assert patient["vitals"]
    assert patient["vitals"][0]["bmi"] == pytest.approx(29.7, abs=0.2)
    assert patient["risk"]["available"] is True

    duplicate = client.post(
        "/api/patients",
        headers=admin_headers,
        json={"national_id": "1234567891", "name": "Dup", "persian_name": "تکراری"},
    )
    assert duplicate.status_code == 409


def test_vitals_endpoint_and_risk_refresh(client, admin_headers, first_patient_id):
    response = client.post(
        f"/api/patients/{first_patient_id}/vitals",
        headers=admin_headers,
        json={"bp_systolic": 132, "bp_diastolic": 84, "heart_rate": 74, "weight_kg": 72, "height_cm": 158, "hba1c": 7.6},
    )
    assert response.status_code == 201
    body = response.json()
    assert body["jalali_date"]
    assert body["risk"]["available"] is True

    history = client.get(f"/api/patients/{first_patient_id}/vitals", headers=admin_headers).json()
    assert history["total"] >= 2


def test_behvarz_can_record_vitals_but_not_edit_patient(client, behvarz_headers, first_patient_id):
    vitals = client.post(
        f"/api/patients/{first_patient_id}/vitals",
        headers=behvarz_headers,
        json={"bp_systolic": 128, "bp_diastolic": 82},
    )
    assert vitals.status_code == 201

    patch = client.patch(f"/api/patients/{first_patient_id}", headers=behvarz_headers, json={"phone": "0912-999-9999"})
    assert patch.status_code == 403


def test_preventive_care_endpoint(client, admin_headers, first_patient_id):
    body = client.get(f"/api/patients/{first_patient_id}/preventive-care", headers=admin_headers).json()
    assert body["items"]
    assert set(body["summary"].keys()) == {"UP_TO_DATE", "DUE", "OVERDUE", "NOT_APPLICABLE"}
    assert all("guideline" in item for item in body["items"])


def test_quality_issue_lifecycle(client, admin_headers, first_patient_id):
    listed = client.get(f"/api/patients/{first_patient_id}/quality-issues", headers=admin_headers).json()
    assert listed["items"]
    issue_id = listed["items"][0]["id"]

    resolved = client.post(
        f"/api/patients/{first_patient_id}/quality-issues/{issue_id}/resolve", headers=admin_headers
    )
    assert resolved.status_code == 200
    assert resolved.json()["resolved"] is True

    audit = client.post(f"/api/patients/{first_patient_id}/quality-issues/audit", headers=admin_headers).json()
    assert "created" in audit


def test_risk_endpoint(client, admin_headers, first_patient_id):
    risk = client.get(f"/api/patients/{first_patient_id}/risk", headers=admin_headers).json()
    assert risk["provenance"]["sourceSystem"].startswith("IraPEN")
    assert risk["nextAssessmentDueJalali"]


def test_suggestions_endpoint(client, admin_headers, first_patient_id):
    body = client.get(f"/api/patients/{first_patient_id}/suggestions", headers=admin_headers).json()
    assert "items" in body and "alerts" in body
