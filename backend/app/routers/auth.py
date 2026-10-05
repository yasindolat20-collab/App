"""Authentication endpoints."""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..audit import record_for_user
from ..config import settings
from ..database import get_db
from ..models import User
from ..schemas import ChangePasswordRequest, LoginRequest, TokenResponse, UserOut
from ..security import (
    ROLES,
    ROLE_CAPABILITIES,
    create_access_token,
    get_current_user,
    hash_secret,
    verify_secret,
)

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/login", response_model=TokenResponse, summary="Exchange credentials for a bearer token")
def login(payload: LoginRequest, request: Request, db: Session = Depends(get_db)) -> TokenResponse:
    user = db.scalar(select(User).where(User.username == payload.username))
    if user is None or not verify_secret(payload.password, user.password_hash):
        record_for_user(
            db,
            None,
            action="auth.login_failed",
            entity_type="user",
            entity_id=payload.username,
            detail={"reason": "invalid credentials"},
            source_ip=request.client.host if request.client else None,
            commit=True,
        )
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Incorrect username or password")
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="User is inactive")

    pin_ok = True
    if user.pin_hash:
        pin_ok = verify_secret(payload.pin or "", user.pin_hash)

    token = create_access_token(user.username, {"role": user.role, "uid": user.id})
    record_for_user(
        db,
        user,
        action="auth.login",
        entity_type="user",
        entity_id=user.username,
        detail={"pin_supplied": payload.pin is not None, "pin_valid": pin_ok},
        source_ip=request.client.host if request.client else None,
        commit=True,
    )
    return TokenResponse(
        access_token=token,
        expires_in_minutes=settings.access_token_expire_minutes,
        user=UserOut.model_validate(user),
    )


@router.get("/me", response_model=UserOut, summary="Current clinician profile and capabilities")
def me(user: User = Depends(get_current_user)) -> UserOut:
    return UserOut.model_validate(user)


@router.get("/capabilities", summary="Capability matrix for every role")
def capabilities(_: User = Depends(get_current_user)) -> dict:
    return {
        "roles": list(ROLES),
        "capabilities": {role: sorted(caps) for role, caps in ROLE_CAPABILITIES.items()},
    }


@router.post("/change-password", summary="Rotate password and clinical e-signature PIN")
def change_password(
    payload: ChangePasswordRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    if not verify_secret(payload.current_password, user.password_hash):
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    user.password_hash = hash_secret(payload.new_password)
    if payload.new_pin:
        user.pin_hash = hash_secret(payload.new_pin)
    record_for_user(
        db,
        user,
        action="auth.password_changed",
        entity_type="user",
        entity_id=user.username,
        detail={"pin_rotated": bool(payload.new_pin)},
    )
    db.commit()
    return {"ok": True, "pin_rotated": bool(payload.new_pin)}