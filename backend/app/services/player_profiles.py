"""Services for off-chain player metadata persistence."""

from __future__ import annotations

import logging

from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from backend.app.db.models import PlayerProfile

SQLITE_INT64_MAX = 2**63 - 1
logger = logging.getLogger(__name__)


def _is_sqlite_session(db_session: Session) -> bool:
    """Checks whether active SQLAlchemy session uses SQLite backend.

    Args:
        db_session: Active database session.

    Returns:
        True when session is bound to SQLite, else False.
    """
    bind = db_session.get_bind()
    if bind is None:
        return False
    return bind.dialect.name == "sqlite"


def _sqlite_integer_overflow(player_id: int, db_session: Session) -> bool:
    """Checks whether player ID exceeds SQLite signed INTEGER range.

    Args:
        player_id: Player identifier to persist.
        db_session: Active database session.

    Returns:
        True when SQLite cannot store player_id as INTEGER.
    """
    return _is_sqlite_session(db_session) and abs(player_id) > SQLITE_INT64_MAX


def upsert_player_avatar_url(
    db_session: Session,
    player_id: int,
    avatar_url: str | None,
) -> PlayerProfile | None:
    """Creates or updates off-chain avatar URL for a player.

    Args:
        db_session: Active database session.
        player_id: Numeric player identifier.
        avatar_url: Avatar URL, if provided.

    Returns:
        Persisted player profile row or None when skipped.
    """
    if _sqlite_integer_overflow(player_id, db_session):
        logger.warning(
            "Skipping avatar persistence for player_id=%s: exceeds SQLite INTEGER range",
            player_id,
        )
        return None

    try:
        profile = db_session.get(PlayerProfile, player_id)
        if profile is None:
            profile = PlayerProfile(player_id=player_id, avatar_url=avatar_url)
            db_session.add(profile)
        else:
            profile.avatar_url = avatar_url
        db_session.commit()
        db_session.refresh(profile)
        return profile
    except SQLAlchemyError:
        db_session.rollback()
        logger.exception(
            "Avatar metadata persistence failed for player_id=%s; continuing",
            player_id,
        )
        return None


def get_player_avatar_url(db_session: Session, player_id: int) -> str | None:
    """Returns stored avatar URL for player if available.

    Args:
        db_session: Active database session.
        player_id: Numeric player identifier.

    Returns:
        Avatar URL or None when absent.
    """
    if _sqlite_integer_overflow(player_id, db_session):
        return None

    profile = db_session.get(PlayerProfile, player_id)
    if profile is None:
        return None
    return profile.avatar_url
