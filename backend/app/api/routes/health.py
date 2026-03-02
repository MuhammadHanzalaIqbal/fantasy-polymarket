"""Healthcheck route."""

from fastapi import APIRouter, Depends

from backend.app.api.deps import get_blockchain_client
from backend.app.blockchain.client import BlockchainClient
from backend.app.config import get_settings
from backend.app.models.schemas import HealthResponse

router = APIRouter(tags=["health"])


@router.get("/health", response_model=HealthResponse)
def healthcheck(
    blockchain_client: BlockchainClient = Depends(get_blockchain_client),
) -> HealthResponse:
    """Returns application and blockchain connectivity state."""

    settings = get_settings()
    return HealthResponse(
        app_name=settings.app_name,
        version=settings.app_version,
        chain_connected=blockchain_client.is_connected(),
        latest_block=blockchain_client.latest_block(),
        chain_id=blockchain_client.runtime_chain_id(),
    )

