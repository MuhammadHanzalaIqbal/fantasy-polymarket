"""Unit tests for contest entry using stored team IDs."""

from __future__ import annotations

import pytest
from fastapi import HTTPException
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from backend.app.db.models import Base
from backend.app.models.schemas import (
    ContestEntryIntentRequest,
    TeamCreateMember,
    TeamCreateRequest,
)
from backend.app.services.contest_entry import resolve_entry_players
from backend.app.services.team_service import create_team


class _FakePlayerTokenCall:
    """Simple call wrapper for test contract methods."""

    def __init__(self, token_address: str) -> None:
        self._token_address = token_address

    def call(self) -> str:
        """Returns configured token address."""
        return self._token_address


class _FakeShareManagerFunctions:
    """Fake functions namespace for playerToken."""

    def __init__(self, listed_ids: set[int]) -> None:
        self._listed_ids = listed_ids

    def playerToken(self, player_id: int) -> _FakePlayerTokenCall:
        """Resolves listed IDs to non-zero token address."""
        if player_id in self._listed_ids:
            return _FakePlayerTokenCall("0x0000000000000000000000000000000000000001")
        return _FakePlayerTokenCall("0x0000000000000000000000000000000000000000")


class _FakeShareManager:
    """Fake share manager contract for tests."""

    def __init__(self, listed_ids: set[int]) -> None:
        self.functions = _FakeShareManagerFunctions(listed_ids)


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


def _team_request(wallet: str) -> TeamCreateRequest:
    """Builds a minimal valid team creation payload."""
    return TeamCreateRequest(
        wallet_address=wallet,
        name="Entry Team",
        members=[
            TeamCreateMember(slot_index=0, player_id=11, role_label="R1"),
            TeamCreateMember(slot_index=1, player_id=12, role_label="R2"),
            TeamCreateMember(slot_index=2, player_id=13, role_label="R3"),
            TeamCreateMember(slot_index=3, player_id=14, role_label="R4"),
            TeamCreateMember(slot_index=4, player_id=15, role_label="R5"),
        ],
    )


def test_resolve_entry_players_prefers_team_id(session: Session) -> None:
    """Uses persisted team members when request is team-based."""
    wallet = "0x0000000000000000000000000000000000000001"
    share_manager = _FakeShareManager({11, 12, 13, 14, 15})
    created = create_team(
        db_session=session,
        share_manager_contract=share_manager,
        request=_team_request(wallet),
    )
    request = ContestEntryIntentRequest(wallet_address=wallet, team_id=created.team_id)

    players = resolve_entry_players(
        db_session=session,
        request=request,
    )

    assert players == [11, 12, 13, 14, 15]


def test_resolve_entry_players_uses_players_fallback(session: Session) -> None:
    """Supports legacy raw players payload for backward compatibility."""
    _ = session
    request = ContestEntryIntentRequest(
        wallet_address="0x0000000000000000000000000000000000000001",
        players=[101, 102, 103, 104, 105],
    )

    players = resolve_entry_players(db_session=session, request=request)

    assert players == [101, 102, 103, 104, 105]


def test_resolve_entry_players_rejects_foreign_team_access(session: Session) -> None:
    """Rejects contest entry using a team owned by another wallet."""
    share_manager = _FakeShareManager({11, 12, 13, 14, 15})
    created = create_team(
        db_session=session,
        share_manager_contract=share_manager,
        request=_team_request("0x0000000000000000000000000000000000000001"),
    )
    request = ContestEntryIntentRequest(
        wallet_address="0x0000000000000000000000000000000000000002",
        team_id=created.team_id,
    )

    with pytest.raises(HTTPException) as exc:
        resolve_entry_players(db_session=session, request=request)

    assert exc.value.status_code == 404
