"""Unit tests for avatar URL model validation and persistence service."""

from __future__ import annotations

import pytest
from pydantic import ValidationError
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from backend.app.db.models import Base
from backend.app.models.schemas import AdminCreatePlayerRequest
from backend.app.services.player_profiles import (
    get_player_avatar_url,
    upsert_player_avatar_url,
)


@pytest.fixture()
def session() -> Session:
    """Creates isolated in-memory DB session for tests."""
    engine = create_engine("sqlite+pysqlite:///:memory:", future=True)
    Base.metadata.create_all(engine)
    factory = sessionmaker(bind=engine, future=True)
    session_obj = factory()
    try:
        yield session_obj
    finally:
        session_obj.close()


def test_admin_create_player_accepts_http_avatar_url() -> None:
    """Accepts valid avatar URL with http/https scheme."""
    request = AdminCreatePlayerRequest(
        player_id=1,
        token_name="Player One",
        token_symbol="P1",
        avatar_url="https://cdn.example.com/player/1.png",
    )
    assert request.avatar_url == "https://cdn.example.com/player/1.png"


@pytest.mark.parametrize(
    "avatar_url",
    [
        "ftp://cdn.example.com/player/1.png",
        "javascript:alert(1)",
        "file:///tmp/image.png",
    ],
)
def test_admin_create_player_rejects_unsafe_avatar_schemes(avatar_url: str) -> None:
    """Rejects avatar URL schemes outside http/https."""
    with pytest.raises(ValidationError):
        AdminCreatePlayerRequest(
            player_id=1,
            token_name="Player One",
            token_symbol="P1",
            avatar_url=avatar_url,
        )


def test_avatar_url_upsert_and_read(session: Session) -> None:
    """Persists avatar URL and supports updates for same player."""
    upsert_player_avatar_url(
        db_session=session,
        player_id=7,
        avatar_url="https://cdn.example.com/player/7-v1.png",
    )
    upsert_player_avatar_url(
        db_session=session,
        player_id=7,
        avatar_url="https://cdn.example.com/player/7-v2.png",
    )

    avatar_url = get_player_avatar_url(db_session=session, player_id=7)

    assert avatar_url == "https://cdn.example.com/player/7-v2.png"


def test_avatar_url_read_returns_none_for_missing_player(session: Session) -> None:
    """Returns None for unknown player profiles."""
    assert get_player_avatar_url(db_session=session, player_id=999) is None


def test_avatar_url_upsert_skips_sqlite_integer_overflow(session: Session) -> None:
    """Skips avatar persistence for oversized player IDs on SQLite."""
    huge_player_id = 10**20

    result = upsert_player_avatar_url(
        db_session=session,
        player_id=huge_player_id,
        avatar_url="https://cdn.example.com/player/huge.png",
    )
    avatar_url = get_player_avatar_url(
        db_session=session,
        player_id=huge_player_id,
    )

    assert result is None
    assert avatar_url is None
