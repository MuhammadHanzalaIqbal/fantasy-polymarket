"""Admin routes for contest and player management."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from backend.app.api.deps import get_blockchain_client, require_demo_admin
from backend.app.api.errors import raise_http_from_chain_error
from backend.app.blockchain.client import BlockchainClient
from backend.app.config import get_settings
from backend.app.db.session import get_db_session
from backend.app.models.schemas import (
    AdminCreateContestRequest,
    AdminCreatePlayerRequest,
    AdminCreatePlayerResponse,
    TransactionResponse,
)
from backend.app.services.admin_ops import (
    create_contest,
    create_player_and_market_listing,
    resolve_contest,
)

router = APIRouter(
    prefix="/admin",
    tags=["admin"],
    dependencies=[Depends(require_demo_admin)],
)


@router.post("/players", response_model=AdminCreatePlayerResponse)
def admin_create_player(
    request: AdminCreatePlayerRequest,
    blockchain_client: BlockchainClient = Depends(get_blockchain_client),
    db_session: Session = Depends(get_db_session),
) -> AdminCreatePlayerResponse:
    """Creates a new player share token and lists it in market."""
    settings = get_settings()
    if (
        not settings.player_share_manager_address
        or not settings.player_market_address
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "player_share_manager_address and player_market_address "
                "must be configured"
            ),
        )
    try:
        share_manager = blockchain_client.contract(
            "PlayerShareManager", settings.player_share_manager_address
        )
        market = blockchain_client.contract(
            "PlayerMarket", settings.player_market_address
        )
        return create_player_and_market_listing(
            blockchain_client=blockchain_client,
            share_manager_contract=share_manager,
            market_contract=market,
            request=request,
            db_session=db_session,
        )
    except Exception as error:
        raise_http_from_chain_error(
            error,
            operation="admin player creation",
            read_operation=False,
        )


@router.post("/contests", response_model=TransactionResponse)
def admin_create_contest(
    request: AdminCreateContestRequest,
    blockchain_client: BlockchainClient = Depends(get_blockchain_client),
) -> TransactionResponse:
    """Creates a new contest on chain."""
    settings = get_settings()
    if not settings.contest_manager_address:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="contest_manager_address is not configured",
        )
    try:
        contest_manager = blockchain_client.contract(
            "ContestManager", settings.contest_manager_address
        )
        return create_contest(
            blockchain_client=blockchain_client,
            contest_manager_contract=contest_manager,
            request=request,
        )
    except Exception as error:
        raise_http_from_chain_error(
            error,
            operation="admin contest creation",
            read_operation=False,
        )


@router.post("/contests/{contest_id}/resolve", response_model=TransactionResponse)
def admin_resolve_contest_alias(
    contest_id: int,
    blockchain_client: BlockchainClient = Depends(get_blockchain_client),
) -> TransactionResponse:
    """Resolves contest through admin namespace route alias."""
    settings = get_settings()
    if not settings.contest_manager_address:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="contest_manager_address is not configured",
        )
    try:
        contest_manager = blockchain_client.contract(
            "ContestManager", settings.contest_manager_address
        )
        return resolve_contest(
            blockchain_client=blockchain_client,
            contest_manager_contract=contest_manager,
            contest_id=contest_id,
        )
    except ValueError as error:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(error),
        ) from error
    except Exception as error:
        raise_http_from_chain_error(
            error,
            operation="admin contest resolve",
            read_operation=False,
        )
