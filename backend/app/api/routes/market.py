"""Market quote routes."""

from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Query, status

from backend.app.api.deps import get_blockchain_client
from backend.app.api.routes.players import resolve_player_id_for_market
from backend.app.blockchain.client import BlockchainClient
from backend.app.config import get_settings
from backend.app.models.schemas import QuoteResponse
from backend.app.services.quotes import estimate_quote

router = APIRouter(prefix="/market", tags=["market"])


@router.get("/{player_id}/quote", response_model=QuoteResponse)
def get_market_quote(
    player_id: int,
    side: Literal["buy", "sell"] = Query(),
    amount: int = Query(ge=1),
    blockchain_client: BlockchainClient = Depends(get_blockchain_client),
) -> QuoteResponse:
    """Returns an estimated quote for a player trade."""

    settings = get_settings()
    if not settings.player_market_address:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="player_market_address is not configured",
        )

    market = blockchain_client.contract("PlayerMarket", settings.player_market_address)
    resolved_player_id = resolve_player_id_for_market(market, player_id)
    reference_price_wei = int(market.functions.getSharePrice(resolved_player_id).call())
    estimated_amount_out = estimate_quote(
        side=side,
        amount=amount,
        reference_price_wei=reference_price_wei,
    )
    return QuoteResponse(
        player_id=resolved_player_id,
        side=side,
        amount_in=amount,
        estimated_amount_out=estimated_amount_out,
        reference_price_wei=reference_price_wei,
    )

