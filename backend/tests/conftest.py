"""Test fixtures.

The suite runs fully offline: the AI credentials are removed from the
environment so the deterministic rules engine answers Ω-Chat, and the SIB bridge
uses its local simulator adapter.
"""
from __future__ import annotations

import os
import tempfile
from pathlib import Path

import pytest

_TMP = Path(tempfile.mkdtemp(prefix="omega-sib-tests-"))
os.environ["DATABASE_URL"] = f"sqlite:///{_TMP / 'test.db'}"
os.environ["SECRET_KEY"] = "test-secret-key"
os.environ["SEED_DEMO_DATA"] = "true"
os.environ["SIB_ADAPTER"] = "simulator"
os.environ["SIB_SIMULATED_FAILURE_RATE"] = "0"
for key in ("AI_API_KEY", "OPENAI_API_KEY", "AI_BASE_URL", "OPENAI_API_BASE", "OPENAI_BASE_URL"):
    os.environ.pop(key, None)

from fastapi.testclient import TestClient  # noqa: E402

from app.main import app  # noqa: E402


@pytest.fixture(scope="session")
def client() -> TestClient:
    with TestClient(app) as test_client:
        yield test_client


def _login(client: TestClient, username: str, password: str, pin: str | None = None) -> dict:
    payload = {"username": username, "password": password}
    if pin:
        payload["pin"] = pin
    response = client.post("/api/auth/login", json=payload)
    assert response.status_code == 200, response.text
    return {"Authorization": f"Bearer {response.json()['access_token']}"}


@pytest.fixture(scope="session")
def admin_headers(client: TestClient) -> dict:
    return _login(client, "admin", "admin123")


@pytest.fixture(scope="session")
def doctor_headers(client: TestClient) -> dict:
    return _login(client, "dr.alavi", "doctor123")


@pytest.fixture(scope="session")
def behvarz_headers(client: TestClient) -> dict:
    return _login(client, "behvarz.karimi", "behvarz123")


@pytest.fixture(scope="session")
def first_patient_id(client: TestClient, admin_headers: dict) -> str:
    response = client.get("/api/patients", headers=admin_headers)
    assert response.status_code == 200
    items = response.json()["items"]
    assert items, "seed data should provide at least one patient"
    return items[0]["id"]