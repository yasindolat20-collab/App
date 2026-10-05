"""SQLAlchemy engine / session wiring shared by the API and the scripts."""
from __future__ import annotations

import json
from collections.abc import Iterator
from pathlib import Path

from sqlalchemy import create_engine, event
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from .config import settings


def _json_default(value):
    """JSON columns hold domain payloads that may contain datetimes."""
    if hasattr(value, "isoformat"):
        return value.isoformat()
    return str(value)


def json_dumps(value) -> str:
    return json.dumps(value, ensure_ascii=False, default=_json_default)


class Base(DeclarativeBase):
    """Declarative base for every Ω-SIB table."""


def _build_engine():
    url = settings.database_url
    kwargs: dict = {"future": True, "pool_pre_ping": True, "json_serializer": json_dumps}
    if url.startswith("sqlite"):
        # Make sure the parent directory exists before SQLite opens the file.
        if ":///" in url:
            db_path = url.split(":///", 1)[1]
            if db_path and db_path != ":memory:":
                Path(db_path).parent.mkdir(parents=True, exist_ok=True)
        kwargs["connect_args"] = {"check_same_thread": False}
    engine = create_engine(url, **kwargs)

    if url.startswith("sqlite"):

        @event.listens_for(engine, "connect")
        def _set_sqlite_pragma(dbapi_connection, _record):  # pragma: no cover
            cursor = dbapi_connection.cursor()
            cursor.execute("PRAGMA foreign_keys=ON")
            cursor.execute("PRAGMA journal_mode=WAL")
            cursor.close()

    return engine


engine = _build_engine()
SessionLocal = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False, future=True)


def get_db() -> Iterator[Session]:
    """FastAPI dependency yielding a scoped session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db() -> None:
    """Create all tables. Alembic migrations are the production path."""
    from . import models  # noqa: F401  (import registers the metadata)

    Base.metadata.create_all(bind=engine)
