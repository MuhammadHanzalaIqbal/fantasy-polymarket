"""Services for team creation, validation, and lookup."""

from __future__ import annotations

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload
from web3 import Web3
from web3.contract.contract import Contract

from backend.app.db.models import Team, TeamMember
from backend.app.models.schemas import (
    TeamCreateMember,
    TeamCreateRequest,
    TeamMemberResponse,
    TeamResponse,
)
from backend.app.services.player_id_resolution import resolve_share_manager_player_id


def _validate_member_slots(members: list[TeamCreateMember]) -> None:
    """Validates slot uniqueness and roster cardinality.

    Args:
        members: Requested team members.

    Raises:
        HTTPException: If slot or player constraints are violated.
    """
    if len(members) != 5:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="team must contain exactly 5 players",
        )
    slot_indexes = [member.slot_index for member in members]
    if sorted(slot_indexes) != [0, 1, 2, 3, 4]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="members must use each slot_index from 0 to 4 exactly once",
        )
    player_ids = [member.player_id for member in members]
    if len(player_ids) != len(set(player_ids)):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="duplicate players are not allowed in a team",
        )


def _ensure_players_listed(
    share_manager_contract: Contract,
    members: list[TeamCreateMember],
) -> None:
    """Ensures each team member maps to an existing share token.

    Uses the same raw vs 1e18-scaled ID resolution as contest entry and
    market routes so squads accept API player IDs regardless of on-chain
    indexing scheme.

    Args:
        share_manager_contract: Bound PlayerShareManager contract.
        members: Requested team members.

    Raises:
        HTTPException: If any player is missing from share manager.
    """
    for member in members:
        resolve_share_manager_player_id(share_manager_contract, member.player_id)


def _to_team_response(team: Team) -> TeamResponse:
    """Converts Team ORM entity to API schema."""
    members = [
        TeamMemberResponse(
            slot_index=member.slot_index,
            player_id=member.player_id,
            role_label=member.role_label,
            player_info=member.player_info,
        )
        for member in sorted(team.members, key=lambda m: m.slot_index)
    ]
    return TeamResponse(
        team_id=team.team_id,
        owner_wallet=team.owner_wallet,
        name=team.name,
        members=members,
        created_at=team.created_at,
        updated_at=team.updated_at,
    )


def create_team(
    db_session: Session,
    share_manager_contract: Contract,
    request: TeamCreateRequest,
) -> TeamResponse:
    """Creates persistent team after validation.

    Args:
        db_session: Active database session.
        share_manager_contract: Bound PlayerShareManager contract.
        request: Team creation request payload.

    Returns:
        Persisted team response projection.
    """
    _validate_member_slots(request.members)
    _ensure_players_listed(share_manager_contract, request.members)

    owner_wallet = Web3.to_checksum_address(request.wallet_address)
    team = Team(owner_wallet=owner_wallet, name=request.name.strip())
    db_session.add(team)
    db_session.flush()

    for member in request.members:
        db_session.add(
            TeamMember(
                team_id=team.team_id,
                slot_index=member.slot_index,
                player_id=member.player_id,
                role_label=member.role_label.strip(),
                player_info=member.player_info,
            )
        )
    db_session.commit()
    db_session.refresh(team)
    team = db_session.execute(
        select(Team)
        .where(Team.team_id == team.team_id)
        .options(selectinload(Team.members))
    ).scalar_one()
    return _to_team_response(team)


def list_teams_for_wallet(
    db_session: Session,
    wallet_address: str,
) -> list[TeamResponse]:
    """Lists persisted teams for a wallet.

    Args:
        db_session: Active database session.
        wallet_address: Wallet owner.

    Returns:
        Sorted list of wallet teams.
    """
    checksum_wallet = Web3.to_checksum_address(wallet_address)
    teams = db_session.execute(
        select(Team)
        .where(Team.owner_wallet == checksum_wallet)
        .options(selectinload(Team.members))
        .order_by(Team.team_id.asc())
    ).scalars()
    return [_to_team_response(team) for team in teams]


def get_team_for_wallet(
    db_session: Session,
    team_id: int,
    wallet_address: str,
) -> TeamResponse:
    """Returns single team by ID for owner wallet.

    Args:
        db_session: Active database session.
        team_id: Team identifier.
        wallet_address: Wallet owner.

    Returns:
        Team response model.

    Raises:
        HTTPException: If team does not belong to wallet.
    """
    checksum_wallet = Web3.to_checksum_address(wallet_address)
    team = db_session.execute(
        select(Team)
        .where(Team.team_id == team_id, Team.owner_wallet == checksum_wallet)
        .options(selectinload(Team.members))
    ).scalar_one_or_none()
    if team is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="team not found for wallet",
        )
    return _to_team_response(team)


def resolve_team_players(
    db_session: Session,
    team_id: int,
    wallet_address: str,
) -> list[int]:
    """Resolves ordered player IDs from a stored team.

    Args:
        db_session: Active database session.
        team_id: Team identifier.
        wallet_address: Wallet owner.

    Returns:
        Ordered player IDs for contest entry.
    """
    team = get_team_for_wallet(
        db_session=db_session,
        team_id=team_id,
        wallet_address=wallet_address,
    )
    return [
        member.player_id
        for member in sorted(team.members, key=lambda m: m.slot_index)
    ]
