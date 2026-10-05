"""Ω-SIB runtime configuration.

All values can be provided through environment variables (or a .env file).
Nothing here contains a real secret: the development defaults exist so that
``python -m app.seed`` + ``uvicorn`` work out of the box on a fresh clone.
"""
from __future__ import annotations

import os
from dataclasses import dataclass, field
from pathlib import Path

try:  # pragma: no cover - dotenv is optional at import time
    from dotenv import load_dotenv

    load_dotenv()
except Exception:  # pragma: no cover
    pass

BASE_DIR = Path(__file__).resolve().parent.parent


def _env(*names: str, default: str | None = None) -> str | None:
    """Return the first non-empty environment variable among ``names``."""
    for name in names:
        value = os.getenv(name)
        if value:
            return value
    return default


def _bool(name: str, default: bool = False) -> bool:
    raw = os.getenv(name)
    if raw is None:
        return default
    return raw.strip().lower() in {"1", "true", "yes", "on"}


def _int(name: str, default: int) -> int:
    try:
        return int(os.getenv(name, "").strip())
    except (TypeError, ValueError):
        return default


@dataclass
class Settings:
    """Effective settings for the API process."""

    app_name: str = "Ω-SIB API"
    version: str = "1.0.0"
    environment: str = os.getenv("APP_ENV", "development")

    # --- Persistence -----------------------------------------------------
    # SQLite for development, PostgreSQL for production. Same ORM models.
    database_url: str = _env(
        "DATABASE_URL", default=f"sqlite:///{BASE_DIR / 'data' / 'omega_sib.db'}"
    )

    # --- Authentication --------------------------------------------------
    secret_key: str = _env("SECRET_KEY", default="dev-secret-change-me-in-production")
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = _int("ACCESS_TOKEN_EXPIRE_MINUTES", 720)

    bootstrap_admin_username: str = _env("BOOTSTRAP_ADMIN_USERNAME", default="admin")
    bootstrap_admin_password: str = _env("BOOTSTRAP_ADMIN_PASSWORD", default="admin123")
    bootstrap_admin_name: str = _env("BOOTSTRAP_ADMIN_NAME", default="Dr. Sara Alavi")

    # --- AI interface ----------------------------------------------------
    # Any OpenAI-compatible chat-completions endpoint works (OpenAI, Manus
    # built-in proxy, Azure OpenAI, local vLLM, ...). When no key is present
    # the deterministic offline rules engine serves the assistant instead.
    ai_base_url: str = _env("AI_BASE_URL", "OPENAI_API_BASE", "OPENAI_BASE_URL", default="") or ""
    ai_api_key: str = _env("AI_API_KEY", "OPENAI_API_KEY", default="") or ""
    ai_model: str = _env("AI_MODEL", default="gpt-5-mini") or "gpt-5-mini"
    ai_timeout_seconds: int = _int("AI_TIMEOUT_SECONDS", 45)
    ai_max_output_tokens: int = _int("AI_MAX_OUTPUT_TOKENS", 3000)

    # --- SIB bridge ------------------------------------------------------
    # "simulator" keeps everything local; "http" forwards transactions to a
    # real SIB adapter endpoint configured in SIB_ADAPTER_URL.
    sib_adapter: str = _env("SIB_ADAPTER", default="simulator")
    sib_adapter_url: str = _env("SIB_ADAPTER_URL", default="")
    sib_adapter_token: str = _env("SIB_ADAPTER_TOKEN", default="")
    sib_simulated_failure_rate: float = float(os.getenv("SIB_SIMULATED_FAILURE_RATE", "0") or 0)

    # --- Misc ------------------------------------------------------------
    cors_origins: list[str] = field(
        default_factory=lambda: [
            o.strip()
            for o in (_env("CORS_ORIGINS", default="*") or "*").split(",")
            if o.strip()
        ]
    )
    audit_enabled: bool = _bool("AUDIT_ENABLED", True)
    serve_frontend: bool = _bool("SERVE_FRONTEND", True)
    frontend_dist: Path = Path(
        _env("FRONTEND_DIST", default=str(BASE_DIR.parent / "frontend" / "dist")) or ""
    )
    seed_demo_data: bool = _bool("SEED_DEMO_DATA", True)

    @property
    def ai_enabled(self) -> bool:
        return bool(self.ai_api_key and self.ai_base_url)

    @property
    def is_sqlite(self) -> bool:
        return self.database_url.startswith("sqlite")


settings = Settings()
