"""Player and market-related read routes."""

from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Query, status

from backend.app.api.deps import get_blockchain_client
from backend.app.blockchain.client import BlockchainClient
from backend.app.config import get_settings
from backend.app.models.schemas import PlayerPoolResponse, QuoteResponse
from backend.app.services.quotes import estimate_quote

router = APIRouter(prefix="/players", tags=["players"])


@router.get("", response_model=list[PlayerPoolResponse])
def list_players(
    start_id: int = Query(default=1, ge=1),
    end_id: int = Query(default=20, ge=1),
    blockchain_client: BlockchainClient = Depends(get_blockchain_client),
) -> list[PlayerPoolResponse]:
    """Returns listed players from player market pools in an ID range."""

    settings = get_settings()
    if not settings.player_market_address:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="player_market_address is not configured",
        )

    market = blockchain_client.contract("PlayerMarket", settings.player_market_address)
    upper_bound = min(end_id, start_id + 200)
    response: list[PlayerPoolResponse] = []

    for player_id in range(start_id, upper_bound + 1):
        pool = market.functions.players(player_id).call()
        total_shares, ftk_liquidity, exists = int(pool[0]), int(pool[1]), bool(pool[2])
        if not exists:
            continue
        share_price = int(market.functions.getSharePrice(player_id).call())
        response.append(
            PlayerPoolResponse(
                player_id=player_id,
                exists=exists,
                total_shares=total_shares,
                ftk_liquidity=ftk_liquidity,
                share_price_wei=share_price,
            )
        )

    return response


@router.get("/{player_id}/quote", response_model=QuoteResponse)
def get_player_quote(
    player_id: int,
    side: Literal["buy", "sell"] = Query(),
    amount: int = Query(ge=1),
    blockchain_client: BlockchainClient = Depends(get_blockchain_client),
) -> QuoteResponse:
    """Returns an estimated buy/sell quote using current on-chain price."""

    settings = get_settings()
    if not settings.player_market_address:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="player_market_address is not configured",
        )

    market = blockchain_client.contract("PlayerMarket", settings.player_market_address)
    reference_price_wei = int(market.functions.getSharePrice(player_id).call())
    estimated_amount_out = estimate_quote(
        side=side, amount=amount, reference_price_wei=reference_price_wei
    )
    return QuoteResponse(
        player_id=player_id,
        side=side,
        amount_in=amount,
        estimated_amount_out=estimated_amount_out,
        reference_price_wei=reference_price_wei,
    )

