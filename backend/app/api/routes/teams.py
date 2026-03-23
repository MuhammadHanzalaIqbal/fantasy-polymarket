"""Routes for backend-managed team lifecycle."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from backend.app.api.deps import get_blockchain_client
from backend.app.api.errors import raise_http_from_chain_error
from backend.app.blockchain.client import BlockchainClient
from backend.app.config import get_settings
from backend.app.db.session import get_db_session
from backend.app.models.schemas import TeamCreateRequest, TeamResponse
from backend.app.services.team_service import (
    create_team,
    get_team_for_wallet,
    list_teams_for_wallet,
)

router = APIRouter(prefix="/teams", tags=["teams"])


@router.post("", response_model=TeamResponse)
def create_team_route(
    request: TeamCreateRequest,
    blockchain_client: BlockchainClient = Depends(get_blockchain_client),
    db_session: Session = Depends(get_db_session),
) -> TeamResponse:
    """Creates team and persists off-chain roster metadata."""
    settings = get_settings()
    if not settings.player_share_manager_address:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="player_share_manager_address must be configured",
        )
    try:
        share_manager = blockchain_client.contract(
            "PlayerShareManager", settings.player_share_manager_address
        )
        return create_team(
            db_session=db_session,
            share_manager_contract=share_manager,
            request=request,
        )
    except Exception as error:
        raise_http_from_chain_error(
            error,
            operation="team creation",
            read_operation=False,
        )


@router.get("", response_model=list[TeamResponse])
def list_teams_route(
    wallet_address: str = Query(..., min_length=42, max_length=42),
    db_session: Session = Depends(get_db_session),
) -> list[TeamResponse]:
    """Lists teams for a wallet address."""
    return list_teams_for_wallet(
        db_session=db_session,
        wallet_address=wallet_address,
    )


@router.get("/{team_id}", response_model=TeamResponse)
def get_team_route(
    team_id: int,
    wallet_address: str = Query(..., min_length=42, max_length=42),
    db_session: Session = Depends(get_db_session),
) -> TeamResponse:
    """Returns team details for owner wallet."""
    return get_team_for_wallet(
        db_session=db_session,
        team_id=team_id,
        wallet_address=wallet_address,
    )
