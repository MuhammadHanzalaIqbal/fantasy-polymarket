"""Unit tests for team service validation and persistence behavior."""

from __future__ import annotations

import pytest
from fastapi import HTTPException
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from backend.app.db.models import Base
from backend.app.models.schemas import TeamCreateMember, TeamCreateRequest
from backend.app.services.player_id_resolution import PLAYER_ID_SCALE
from backend.app.services.team_service import (
    create_team,
    get_team_for_wallet,
    list_teams_for_wallet,
    resolve_team_players,
)


class _FakePlayerTokenCall:
    """Test double for contract function call."""

    def __init__(self, token_address: str) -> None:
        self._token_address = token_address

    def call(self) -> str:
        """Returns token address."""
        return self._token_address


class _FakeShareManagerFunctions:
    """Fake PlayerShareManager.functions collection."""

    def __init__(self, listed_ids: set[int]) -> None:
        self._listed_ids = listed_ids

    def playerToken(self, player_id: int) -> _FakePlayerTokenCall:
        """Returns token address for listed IDs and zero-address for others."""
        if player_id in self._listed_ids:
            return _FakePlayerTokenCall("0x0000000000000000000000000000000000000001")
        return _FakePlayerTokenCall("0x0000000000000000000000000000000000000000")


class _FakeShareManagerContract:
    """Fake share manager contract object."""

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


def _valid_request(wallet: str) -> TeamCreateRequest:
    """Builds a valid team creation request."""
    return TeamCreateRequest(
        wallet_address=wallet,
        name="Core Five",
        members=[
            TeamCreateMember(
                slot_index=0,
                player_id=1,
                role_label="AWP",
                player_info={"nickname": "scope_master"},
            ),
            TeamCreateMember(
                slot_index=1,
                player_id=2,
                role_label="IGL",
                player_info={"nickname": "caller"},
            ),
            TeamCreateMember(
                slot_index=2,
                player_id=3,
                role_label="Entry",
                player_info={"nickname": "entry_fox"},
            ),
            TeamCreateMember(
                slot_index=3,
                player_id=4,
                role_label="Lurker",
                player_info={"nickname": "silent"},
            ),
            TeamCreateMember(
                slot_index=4,
                player_id=5,
                role_label="Support",
                player_info={"nickname": "anchor"},
            ),
        ],
    )


def test_create_team_accepts_scaled_only_share_manager_ids(session: Session) -> None:
    """Accepts raw player IDs when tokens exist only at 1e18-scaled keys."""
    scaled = {i * PLAYER_ID_SCALE for i in range(1, 6)}
    share_manager = _FakeShareManagerContract(listed_ids=scaled)
    request = _valid_request("0x0000000000000000000000000000000000000001")

    created = create_team(
        db_session=session,
        share_manager_contract=share_manager,
        request=request,
    )

    assert len(created.members) == 5
    assert created.members[0].player_id == 1


def test_create_team_persists_members_and_metadata(session: Session) -> None:
    """Stores a complete team and returns stable projection."""
    share_manager = _FakeShareManagerContract(listed_ids={1, 2, 3, 4, 5})
    request = _valid_request("0x0000000000000000000000000000000000000001")

    created = create_team(
        db_session=session,
        share_manager_contract=share_manager,
        request=request,
    )

    assert created.team_id >= 1
    assert created.owner_wallet == "0x0000000000000000000000000000000000000001"
    assert len(created.members) == 5
    assert created.members[0].player_info == {"nickname": "scope_master"}


def test_create_team_rejects_duplicate_players(session: Session) -> None:
    """Rejects duplicate player IDs within a single team."""
    share_manager = _FakeShareManagerContract(listed_ids={1, 2, 3, 4, 5})
    request = _valid_request("0x0000000000000000000000000000000000000001")
    request.members[4].player_id = 1

    with pytest.raises(HTTPException) as exc:
        create_team(
            db_session=session,
            share_manager_contract=share_manager,
            request=request,
        )

    assert exc.value.status_code == 400
    assert "duplicate" in str(exc.value.detail).lower()


def test_create_team_rejects_unlisted_players(session: Session) -> None:
    """Rejects teams containing players not listed in share manager."""
    share_manager = _FakeShareManagerContract(listed_ids={1, 2, 3, 4})
    request = _valid_request("0x0000000000000000000000000000000000000001")

    with pytest.raises(HTTPException) as exc:
        create_team(
            db_session=session,
            share_manager_contract=share_manager,
            request=request,
        )

    assert exc.value.status_code == 400
    assert "not listed" in str(exc.value.detail).lower()


def test_get_team_for_wallet_denies_cross_wallet_access(session: Session) -> None:
    """Rejects reading team details for a different owner wallet."""
    share_manager = _FakeShareManagerContract(listed_ids={1, 2, 3, 4, 5})
    created = create_team(
        db_session=session,
        share_manager_contract=share_manager,
        request=_valid_request("0x0000000000000000000000000000000000000001"),
    )

    with pytest.raises(HTTPException) as exc:
        get_team_for_wallet(
            db_session=session,
            team_id=created.team_id,
            wallet_address="0x0000000000000000000000000000000000000002",
        )

    assert exc.value.status_code == 404


def test_list_and_resolve_team_players_happy_path(session: Session) -> None:
    """Lists teams by wallet and resolves ordered players for entry flow."""
    share_manager = _FakeShareManagerContract(listed_ids={1, 2, 3, 4, 5})
    created = create_team(
        db_session=session,
        share_manager_contract=share_manager,
        request=_valid_request("0x0000000000000000000000000000000000000001"),
    )

    listed = list_teams_for_wallet(
        db_session=session,
        wallet_address="0x0000000000000000000000000000000000000001",
    )
    resolved_players = resolve_team_players(
        db_session=session,
        team_id=created.team_id,
        wallet_address="0x0000000000000000000000000000000000000001",
    )

    assert len(listed) == 1
    assert resolved_players == [1, 2, 3, 4, 5]
