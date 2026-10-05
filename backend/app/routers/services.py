"""Service catalogue (خدمات) and service requests (lab / imaging / screening)."""
from __future__ import annotations

import datetime as dt

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy import or_, select
from sqlalchemy.orm import Session, selectinload

from ..audit import record_for_user
from ..database import get_db
from ..models import Patient, ServiceCatalogItem, ServiceRequest, SyncTransaction, User
from ..schemas import ServiceCatalogOut, ServiceRequestCreate, ServiceRequestUpdate
from ..security import get_current_user, require_capability, require_roles
from ..serializers import service_request_to_dict
from ..services import sib_bridge

router = APIRouter(prefix="/api", tags=["services"])


@router.get("/services", response_model=list[ServiceCatalogOut], summary="Service catalogue")
def list_services(
    category: str | None = None,
    q: str | None = None,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
) -> list[ServiceCatalogItem]:
    stmt = select(ServiceCatalogItem).where(ServiceCatalogItem.active.is_(True)).order_by(ServiceCatalogItem.category, ServiceCatalogItem.code)
    if category:
        stmt = stmt.where(ServiceCatalogItem.category == category)
    if q:
        pattern = f"%{q}%"
        stmt = stmt.where(
            or_(
                ServiceCatalogItem.name.ilike(pattern),
                ServiceCatalogItem.persian_name.ilike(pattern),
                ServiceCatalogItem.code.ilike(pattern),
            )
        )
    return list(db.scalars(stmt))


@router.post("/services", status_code=201, response_model=ServiceCatalogOut, summary="Add a catalogue item (admin)")
def create_service(
    payload: dict,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles("admin")),
) -> ServiceCatalogItem:
    code = str(payload.get("code", "")).strip().upper()
    if not code:
        raise HTTPException(status_code=422, detail="code is required")
    if db.scalar(select(ServiceCatalogItem).where(ServiceCatalogItem.code == code)):
        raise HTTPException(status_code=409, detail=f"Service '{code}' already exists")
    item = ServiceCatalogItem(
        code=code,
        name=payload.get("name", code),
        persian_name=payload.get("persian_name", ""),
        category=payload.get("category", "LAB"),
        turnaround_days=int(payload.get("turnaround_days", 1)),
        requires_fasting=bool(payload.get("requires_fasting", False)),
        instructions=payload.get("instructions"),
    )
    db.add(item)
    record_for_user(db, user, action="service.create", entity_type="service_catalog", entity_id=code)
    db.commit()
    db.refresh(item)
    return item


@router.get("/service-requests", summary="List service requests")
def list_service_requests(
    patient_id: str | None = None,
    status: str | None = None,
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
) -> dict:
    stmt = (
        select(ServiceRequest)
        .options(selectinload(ServiceRequest.service))
        .order_by(ServiceRequest.requested_at.desc())
    )
    if patient_id:
        stmt = stmt.where(ServiceRequest.patient_id == patient_id)
    if status:
        stmt = stmt.where(ServiceRequest.status == status)
    rows = list(db.scalars(stmt))[:limit]
    return {"items": [service_request_to_dict(r) for r in rows], "total": len(rows)}


@router.post("/service-requests", status_code=201, summary="Request a service for a patient")
def create_service_request(
    payload: ServiceRequestCreate,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(require_capability("write_service")),
) -> dict:
    patient = db.get(Patient, payload.patient_id)
    if patient is None:
        raise HTTPException(status_code=404, detail="Patient not found")
    service = db.scalar(select(ServiceCatalogItem).where(ServiceCatalogItem.code == payload.service_code.upper()))
    if service is None:
        raise HTTPException(status_code=404, detail=f"Unknown service code '{payload.service_code}'")

    service_request = ServiceRequest(
        patient_id=patient.id,
        encounter_id=payload.encounter_id,
        service_id=service.id,
        status="REQUESTED",
        requested_by=user.full_name,
        notes=payload.notes,
    )
    db.add(service_request)
    db.flush()
    record_for_user(
        db,
        user,
        action="service_request.create",
        entity_type="service_request",
        entity_id=service_request.id,
        detail={"patient_id": patient.id, "service": service.code},
        source_ip=request.client.host if request.client else None,
    )
    transaction = SyncTransaction(
        patient_id=patient.id,
        kind="SERVICE",
        summary=[
            f"درخواست {service.persian_name or service.name} برای {patient.persian_name or patient.name}"
        ],
        payload={
            "patient": {"id": patient.id, "national_id": patient.national_id},
            "service_request": service_request_to_dict(service_request),
        },
        clinician_name=user.full_name,
        status="QUEUED",
    )
    db.add(transaction)
    db.commit()
    sib_bridge.process_transaction(db, transaction)
    db.commit()

    data = service_request_to_dict(service_request)
    data["sync_transaction_id"] = transaction.id
    data["instructions"] = service.instructions
    data["requires_fasting"] = service.requires_fasting
    data["turnaround_days"] = service.turnaround_days
    return data


@router.patch("/service-requests/{request_id}", summary="Update a service request (schedule / result)")
def update_service_request(
    request_id: str,
    payload: ServiceRequestUpdate,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(require_capability("write_service")),
) -> dict:
    service_request = db.scalar(
        select(ServiceRequest).options(selectinload(ServiceRequest.service)).where(ServiceRequest.id == request_id)
    )
    if service_request is None:
        raise HTTPException(status_code=404, detail="Service request not found")
    changes = payload.model_dump(exclude_unset=True)
    for key, value in changes.items():
        setattr(service_request, key, value)
    if changes.get("status") == "RESULTED":
        service_request.resulted_at = dt.datetime.now(dt.timezone.utc)
    record_for_user(
        db,
        user,
        action="service_request.update",
        entity_type="service_request",
        entity_id=service_request.id,
        detail={"changed": {k: str(v) for k, v in changes.items()}},
        source_ip=request.client.host if request.client else None,
    )
    db.commit()
    return service_request_to_dict(service_request)