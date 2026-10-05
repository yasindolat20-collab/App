"""Authentication, token handling and role-based access control."""
from __future__ import annotations

import datetime as dt
from typing import Iterable

import bcrypt
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from sqlalchemy import select
from sqlalchemy.orm import Session

from .config import settings
from .database import get_db
from .models import User

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login", auto_error=False)

ROLES = ("family_physician", "behvarz", "midwife", "admin")

#: Which role may perform which class of action. Used by ``require_roles``.
ROLE_CAPABILITIES: dict[str, set[str]] = {
    "family_physician": {
        "read",
        "write_visit",
        "write_referral",
        "write_service",
        "commit_sib",
        "ai_execute",
        "reports",
    },
    "behvarz": {"read", "write_vitals", "write_service"},
    "midwife": {"read", "write_visit", "write_referral", "write_service"},
    "admin": {
        "read",
        "write_visit",
        "write_referral",
        "write_service",
        "write_vitals",
        "commit_sib",
        "ai_execute",
        "reports",
        "admin",
    },
}


# --------------------------------------------------------------------------- #
# Password / PIN hashing
# --------------------------------------------------------------------------- #
def hash_secret(raw: str) -> str:
    return bcrypt.hashpw(raw.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_secret(raw: str, hashed: str | None) -> bool:
    if not hashed:
        return False
    try:
        return bcrypt.checkpw(raw.encode("utf-8"), hashed.encode("utf-8"))
    except ValueError:
        return False


# --------------------------------------------------------------------------- #
# Tokens
# --------------------------------------------------------------------------- #
def create_access_token(subject: str, extra: dict | None = None) -> str:
    now = dt.datetime.now(dt.timezone.utc)
    payload: dict = {
        "sub": subject,
        "iat": int(now.timestamp()),
        "exp": int((now + dt.timedelta(minutes=settings.access_token_expire_minutes)).timestamp()),
        "iss": "omega-sib",
    }
    if extra:
        payload.update(extra)
    return jwt.encode(payload, settings.secret_key, algorithm=settings.jwt_algorithm)


def decode_access_token(token: str) -> dict:
    try:
        return jwt.decode(token, settings.secret_key, algorithms=[settings.jwt_algorithm])
    except JWTError as exc:  # pragma: no cover - exercised through the API
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        ) from exc


# --------------------------------------------------------------------------- #
# Dependencies
# --------------------------------------------------------------------------- #
def get_current_user(
    token: str | None = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> User:
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )
    payload = decode_access_token(token)
    username = payload.get("sub")
    if not username:
        raise HTTPException(status_code=401, detail="Invalid token payload")
    user = db.scalar(select(User).where(User.username == username))
    if user is None or not user.is_active:
        raise HTTPException(status_code=401, detail="Inactive or unknown user")
    return user


def require_capability(capability: str):
    """Dependency factory enforcing a capability from ``ROLE_CAPABILITIES``."""

    def _checker(user: User = Depends(get_current_user)) -> User:
        granted = ROLE_CAPABILITIES.get(user.role, set())
        if capability not in granted and "admin" not in granted:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Role '{user.role}' may not perform '{capability}'",
            )
        return user

    return _checker


def require_roles(*roles: Iterable[str]):
    allowed = set(roles)

    def _checker(user: User = Depends(get_current_user)) -> User:
        if user.role not in allowed:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Requires one of roles: {', '.join(sorted(allowed))}",
            )
        return user

    return _checker