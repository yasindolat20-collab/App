"""SIB bridge: the adapter layer that talks to the national system.

Ω-SIB never writes to SIB directly. Every clinical write produces a
:class:`~app.models.SyncTransaction` in the queue; the adapter pushes it and
records ``SYNCED`` / ``FAILED``. This mirrors the SIB offline buffer that
Behvarz and family physicians already work with, and it keeps the product
usable when the national network is unavailable.

Two adapters ship today:

* ``simulator`` (default) — local, deterministic, no external calls. Useful for
  development, demos and tests.
* ``http`` — POSTs the transaction to a real SIB gateway
  (``SIB_ADAPTER_URL`` + ``SIB_ADAPTER_TOKEN``).
"""
from __future__ import annotations

import datetime as dt
import hashlib
from abc import ABC, abstractmethod
from typing import Any

import httpx
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..audit import record
from ..config import settings
from ..models import Encounter, Patient, SyncTransaction, User
from ..utils import to_jalali_str

REQUIRED_BY_KIND: dict[str, list[str]] = {
    "ENCOUNTER": ["patient", "encounter"],
    "VITALS": ["patient", "vitals"],
    "REFERRAL": ["patient", "referral"],
    "SERVICE": ["patient", "service_request"],
}


class SibAdapter(ABC):
    name = "abstract"

    @abstractmethod
    def submit(self, transaction: SyncTransaction) -> tuple[bool, str | None]:
        """Return ``(ok, error_message)``."""


class SimulatorAdapter(SibAdapter):
    """Deterministic local adapter — validates the payload and accepts it."""

    name = "simulator"

    def submit(self, transaction: SyncTransaction) -> tuple[bool, str | None]:
        payload = transaction.payload or {}
        required = REQUIRED_BY_KIND.get(transaction.kind, [])
        missing = [key for key in required if not payload.get(key)]
        if missing:
            return False, f"SIB validation rejected the transaction: missing {', '.join(missing)}"

        rate = settings.sib_simulated_failure_rate
        if rate > 0:
            digest = hashlib.sha256(transaction.id.encode("utf-8")).hexdigest()
            bucket = int(digest[:8], 16) % 100
            if bucket < int(rate * 100):
                return False, "Simulated SIB gateway error (SIB_SIMULATED_FAILURE_RATE)"
        return True, None


class HttpAdapter(SibAdapter):
    """Forwards the transaction to a real SIB gateway."""

    name = "http"

    def submit(self, transaction: SyncTransaction) -> tuple[bool, str | None]:
        if not settings.sib_adapter_url:
            return False, "SIB_ADAPTER_URL is not configured"
        headers = {"Content-Type": "application/json"}
        if settings.sib_adapter_token:
            headers["Authorization"] = f"Bearer {settings.sib_adapter_token}"
        body = {
            "transaction_id": transaction.id,
            "kind": transaction.kind,
            "patient_id": transaction.patient_id,
            "encounter_id": transaction.encounter_id,
            "clinician": transaction.clinician_name,
            "pin_confirmed": transaction.pin_confirmed,
            "summary": transaction.summary,
            "payload": transaction.payload,
        }
        try:
            with httpx.Client(timeout=20) as client:
                response = client.post(settings.sib_adapter_url, json=body, headers=headers)
                response.raise_for_status()
            return True, None
        except httpx.HTTPError as exc:  # pragmatic: surface the message to the queue
            return False, f"SIB gateway error: {exc}"


def get_adapter() -> SibAdapter:
    if settings.sib_adapter == "http":
        return HttpAdapter()
    return SimulatorAdapter()


# --------------------------------------------------------------------------- #
# Transaction construction
# --------------------------------------------------------------------------- #
def _encounter_summary(encounter: Encounter, patient: Patient) -> list[str]:
    summary = [f"ویزیت برای {patient.persian_name or patient.name} در {to_jalali_str(encounter.occurred_at)}"]
    if encounter.chief_complaint:
        summary.append(f"شرح حال: {encounter.chief_complaint}")
    if encounter.assessment:
        summary.append("تشخیص‌ها: " + "، ".join(map(str, encounter.assessment)))
    if encounter.prescriptions:
        summary.append(f"{len(encounter.prescriptions)} داروی جدید")
    if encounter.lab_orders:
        summary.append(f"{len(encounter.lab_orders)} درخواست آزمایش")
    if encounter.referral_requested:
        summary.append(f"ارجاع: {encounter.referral_specialty or 'نامشخص'}")
    return summary


def build_encounter_transaction(
    db: Session,
    *,
    encounter: Encounter,
    patient: Patient,
    user: User | None,
    pin_confirmed: bool,
    summary_override: list[str] | None = None,
) -> SyncTransaction:
    payload: dict[str, Any] = {
        "patient": {
            "id": patient.id,
            "national_id": patient.national_id,
            "name": patient.persian_name or patient.name,
            "household_number": patient.household_number,
        },
        "encounter": {
            "id": encounter.id,
            "jalali_date": encounter.jalali_date,
            "chief_complaint": encounter.chief_complaint,
            "assessment": encounter.assessment,
            "icd_codes": encounter.icd_codes,
            "plan": encounter.plan,
            "prescriptions": encounter.prescriptions,
            "lab_orders": encounter.lab_orders,
            "vitals_snapshot": encounter.vitals_snapshot,
            "follow_up_days": encounter.follow_up_days,
            "referral_requested": encounter.referral_requested,
            "referral_specialty": encounter.referral_specialty,
        },
        "sib_module": encounter.sib_module,
        "submitted_at": dt.datetime.now(dt.timezone.utc).isoformat(timespec="seconds"),
    }
    transaction = SyncTransaction(
        patient_id=patient.id,
        encounter_id=encounter.id,
        kind="ENCOUNTER",
        summary=summary_override or _encounter_summary(encounter, patient),
        payload=payload,
        clinician_name=(user.full_name if user else "unknown"),
        pin_confirmed=pin_confirmed,
        status="QUEUED",
    )
    db.add(transaction)
    db.flush()
    record(
        db,
        action="sib.enqueue",
        actor=user.username if user else "system",
        actor_role=user.role if user else None,
        entity_type="sync_transaction",
        entity_id=transaction.id,
        detail={"kind": transaction.kind, "encounter_id": encounter.id, "pin_confirmed": pin_confirmed},
    )
    return transaction


def build_vitals_transaction(
    db: Session, *, patient: Patient, vital_payload: dict[str, Any], user: User | None = None
) -> SyncTransaction:
    transaction = SyncTransaction(
        patient_id=patient.id,
        kind="VITALS",
        summary=[
            f"ثبت علائم حیاتی {to_jalali_str(dt.date.today())} برای {patient.persian_name or patient.name}"
        ],
        payload={"patient": {"id": patient.id, "national_id": patient.national_id}, "vitals": vital_payload},
        clinician_name=(user.full_name if user else "unknown"),
        status="QUEUED",
    )
    db.add(transaction)
    db.flush()
    return transaction


# --------------------------------------------------------------------------- #
# Queue processing
# --------------------------------------------------------------------------- #
def process_transaction(db: Session, transaction: SyncTransaction) -> tuple[bool, str | None]:
    adapter = get_adapter()
    transaction.status = "SYNCING"
    db.flush()
    ok, error = adapter.submit(transaction)
    if ok:
        transaction.status = "SYNCED"
        transaction.synced_at = dt.datetime.now(dt.timezone.utc)
        transaction.error_message = None
        if transaction.encounter_id:
            encounter = db.get(Encounter, transaction.encounter_id)
            if encounter:
                encounter.status = "COMMITTED"
                encounter.committed_at = dt.datetime.now(dt.timezone.utc)
                encounter.sib_transaction_id = transaction.id
    else:
        transaction.status = "FAILED"
        transaction.retry_count += 1
        transaction.error_message = error
    record(
        db,
        action="sib.sync",
        actor="sib-bridge",
        entity_type="sync_transaction",
        entity_id=transaction.id,
        detail={"adapter": adapter.name, "status": transaction.status, "error": error},
    )
    return ok, error


def flush_queue(db: Session, *, limit: int = 25, retry_failed: bool = True) -> dict[str, Any]:
    """Push queued (and optionally failed) transactions to SIB."""
    statuses = ["QUEUED"] + (["FAILED"] if retry_failed else [])
    transactions = list(
        db.scalars(
            select(SyncTransaction)
            .where(SyncTransaction.status.in_(statuses))
            .order_by(SyncTransaction.created_at)
            .limit(limit)
        )
    )
    synced = 0
    failed = 0
    details: list[dict[str, Any]] = []
    for transaction in transactions:
        ok, error = process_transaction(db, transaction)
        if ok:
            synced += 1
        else:
            failed += 1
        details.append({"id": transaction.id, "status": transaction.status, "error": error})
    db.commit()
    return {"processed": len(transactions), "synced": synced, "failed": failed, "details": details}