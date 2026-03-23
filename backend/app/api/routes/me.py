"""Frontend-friendly self-service portfolio routes."""

from fastapi import APIRouter, Depends, Query

from backend.app.api.deps import get_blockchain_client
from backend.app.api.routes.portfolio import get_portfolio
from backend.app.blockchain.client import BlockchainClient
from backend.app.models.schemas import PortfolioResponse

router = APIRouter(prefix="/me", tags=["me"])


@router.get("/portfolio", response_model=PortfolioResponse)
def get_my_portfolio(
    wallet: str = Query(..., min_length=42, max_length=42),
    blockchain_client: BlockchainClient = Depends(get_blockchain_client),
) -> PortfolioResponse:
    """Returns wallet portfolio using frontend `/me` endpoint semantics."""
    return get_portfolio(wallet_address=wallet, blockchain_client=blockchain_client)
