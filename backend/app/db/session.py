"""Database session and engine helpers."""

from __future__ import annotations

from functools import lru_cache

from sqlalchemy import create_engine
from sqlalchemy.engine import Engine
from sqlalchemy.orm import Session, sessionmaker

from backend.app.config import get_settings
from backend.app.db.models import Base


def _create_engine(database_url: str) -> Engine:
    """Builds SQLAlchemy engine with URL-specific options.

    Args:
        database_url: SQLAlchemy database URL.

    Returns:
        SQLAlchemy engine configured for the selected driver.
    """
    connect_args: dict[str, object] = {}
    if database_url.startswith("sqlite"):
        connect_args["check_same_thread"] = False
    return create_engine(database_url, future=True, connect_args=connect_args)


@lru_cache(maxsize=1)
def get_engine() -> Engine:
    """Returns cached SQLAlchemy engine instance."""
    settings = get_settings()
    return _create_engine(settings.database_url)


@lru_cache(maxsize=1)
def get_session_factory() -> sessionmaker[Session]:
    """Returns cached SQLAlchemy session factory."""
    return sessionmaker(bind=get_engine(), autoflush=False, autocommit=False)


def init_db() -> None:
    """Initializes persistent schema objects if they are missing."""
    Base.metadata.create_all(bind=get_engine())


def get_db_session() -> Session:
    """Yields request-scoped database session.

    Yields:
        Active SQLAlchemy session.
    """
    session_factory = get_session_factory()
    db_session = session_factory()
    try:
        yield db_session
    finally:
        db_session.close()
