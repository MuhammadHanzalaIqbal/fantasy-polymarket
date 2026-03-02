"""Portfolio routes."""

from fastapi import APIRouter, Depends, HTTPException, status
from web3 import Web3

from backend.app.api.deps import get_blockchain_client
from backend.app.blockchain.client import BlockchainClient
from backend.app.config import get_settings
from backend.app.models.schemas import PortfolioResponse

router = APIRouter(prefix="/portfolio", tags=["portfolio"])


@router.get("/{wallet_address}", response_model=PortfolioResponse)
def get_portfolio(
    wallet_address: str,
    blockchain_client: BlockchainClient = Depends(get_blockchain_client),
) -> PortfolioResponse:
    """Returns FTK balance and player share balances for a wallet."""

    settings = get_settings()
    if not settings.fantasy_token_address or not settings.player_market_address:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="fantasy_token_address and player_market_address must be configured",
        )

    try:
        checksum_wallet = Web3.to_checksum_address(wallet_address)
    except ValueError as error:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="invalid wallet address format",
        ) from error

    ftk = blockchain_client.contract("FantasyToken", settings.fantasy_token_address)
    market = blockchain_client.contract("PlayerMarket", settings.player_market_address)

    ftk_balance = int(ftk.functions.balanceOf(checksum_wallet).call())
    player_shares: dict[int, int] = {}

    for player_id in range(1, 201):
        pool = market.functions.players(player_id).call()
        exists = bool(pool[2])
        if not exists:
            continue
        shares = int(market.functions.userBalance(player_id, checksum_wallet).call())
        if shares > 0:
            player_shares[player_id] = shares

    return PortfolioResponse(
        wallet_address=checksum_wallet,
        ftk_balance=ftk_balance,
        player_shares=player_shares,
    )

