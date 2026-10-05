"""Ω-SIB API application.

Run locally:

    cd backend && uvicorn app.main:app --reload --port 8000

Interactive docs: http://localhost:8000/docs  (OpenAPI: /openapi.json)
"""
from __future__ import annotations

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles

from .config import settings
from .database import init_db
from .routers import ai, auth, encounters, patients, referrals, reports, services, sync

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s %(message)s")
logger = logging.getLogger("omega-sib")


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    if settings.seed_demo_data:
        from .seed import ensure_seed

        ensure_seed()
    logger.info(
        "Ω-SIB API ready | env=%s | db=%s | ai=%s | sib_adapter=%s",
        settings.environment,
        "sqlite" if settings.is_sqlite else "postgres",
        "llm:" + settings.ai_model if settings.ai_enabled else "rules",
        settings.sib_adapter,
    )
    yield


app = FastAPI(
    title=settings.app_name,
    version=settings.version,
    description=(
        "SIB-compatible clinical API for family physicians: patients, visits, referrals, "
        "services, preventive care, data-quality auditing, an offline-capable SIB sync "
        "bridge and a grounded AI assistant (Ω-Chat)."
    ),
    lifespan=lifespan,
    docs_url="/docs",
    openapi_url="/openapi.json",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

for module in (auth, patients, encounters, referrals, services, reports, sync, ai):
    app.include_router(module.router)


@app.get("/api/health", tags=["system"], summary="Liveness / readiness probe")
def health() -> dict:
    return {
        "status": "ok",
        "app": settings.app_name,
        "version": settings.version,
        "environment": settings.environment,
        "database": "sqlite" if settings.is_sqlite else "postgresql",
        "ai_engine": "llm" if settings.ai_enabled else "rules",
        "sib_adapter": settings.sib_adapter,
    }


@app.get("/api/meta", tags=["system"], summary="Product metadata and module map")
def meta() -> dict:
    return {
        "product": "Ω-SIB",
        "tagline": "Same workflow. Smarter tools. Better support for you.",
        "vision": (
            "A reliable, independent and intelligent interface that replicates the SIB system, "
            "while adding AI-powered assistance, a clean API and a flexible platform for future integrations."
        ),
        "modules": [
            {"key": "patients", "en": "Patients", "fa": "بیماران", "path": "/api/patients"},
            {"key": "visits", "en": "Visits", "fa": "ویزیت‌ها", "path": "/api/encounters"},
            {"key": "services", "en": "Services", "fa": "خدمات", "path": "/api/services"},
            {"key": "referrals", "en": "Referrals", "fa": "ارجاع‌ها", "path": "/api/referrals"},
            {"key": "reports", "en": "Reports", "fa": "گزارش‌ها", "path": "/api/reports/summary"},
            {"key": "ai", "en": "AI interface", "fa": "دستیار هوشمند", "path": "/api/ai/chat"},
            {"key": "settings", "en": "Settings & sync", "fa": "تنظیمات و همگام‌سازی", "path": "/api/sync/status"},
        ],
        "sib_forms": ["Form-302 (visit)", "IraPEN risk module", "Behvarz surveillance log"],
    }


@app.exception_handler(Exception)
async def unhandled_exception(request: Request, exc: Exception) -> JSONResponse:  # pragma: no cover
    logger.exception("Unhandled error on %s %s", request.method, request.url.path)
    return JSONResponse(status_code=500, content={"detail": "Internal server error"})


# --------------------------------------------------------------------------- #
# Optional: serve the built frontend from the same origin
# --------------------------------------------------------------------------- #
if settings.serve_frontend and settings.frontend_dist.exists():
    app.mount("/assets", StaticFiles(directory=settings.frontend_dist / "assets"), name="assets")

    @app.get("/", include_in_schema=False)
    def index() -> FileResponse:
        return FileResponse(settings.frontend_dist / "index.html")

    @app.get("/{path:path}", include_in_schema=False)
    def spa_fallback(path: str) -> FileResponse:
        candidate = settings.frontend_dist / path
        if candidate.is_file():
            return FileResponse(candidate)
        return FileResponse(settings.frontend_dist / "index.html")