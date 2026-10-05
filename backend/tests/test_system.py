"""Health, metadata and authentication."""
from __future__ import annotations


def test_health(client):
    response = client.get("/api/health")
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "ok"
    assert body["ai_engine"] in {"rules", "llm"}
    assert body["sib_adapter"] == "simulator"


def test_meta_lists_all_modules(client):
    body = client.get("/api/meta").json()
    keys = {module["key"] for module in body["modules"]}
    assert {"patients", "visits", "services", "referrals", "reports", "ai", "settings"} <= keys
    assert body["product"] == "Ω-SIB"


def test_openapi_available(client):
    schema = client.get("/openapi.json").json()
    assert "/api/patients" in schema["paths"]
    assert "/api/ai/chat" in schema["paths"]


def test_login_success_and_me(client, admin_headers):
    me = client.get("/api/auth/me", headers=admin_headers)
    assert me.status_code == 200
    assert me.json()["role"] == "admin"


def test_login_rejects_bad_password(client):
    response = client.post("/api/auth/login", json={"username": "admin", "password": "nope"})
    assert response.status_code == 401


def test_protected_route_requires_token(client):
    assert client.get("/api/patients").status_code == 401


def test_capability_matrix(client, admin_headers):
    body = client.get("/api/auth/capabilities", headers=admin_headers).json()
    assert "family_physician" in body["capabilities"]
    assert "commit_sib" in body["capabilities"]["family_physician"]
    assert "commit_sib" not in body["capabilities"]["behvarz"]


def test_behvarz_cannot_commit_visit(client, behvarz_headers):
    # Behvarz may read and record vitals but never commit a visit to SIB.
    response = client.post("/api/encounters/does-not-exist/commit", json={}, headers=behvarz_headers)
    assert response.status_code == 403


def test_audit_trail_records_login(client, admin_headers):
    body = client.get("/api/audit?action=auth.login", headers=admin_headers).json()
    assert body["total"] >= 1
    assert body["items"][0]["action"] == "auth.login"
