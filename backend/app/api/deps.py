"""Shared API dependencies."""

from functools import lru_cache

from fastapi import Header, HTTPException, status

from backend.app.blockchain.client import BlockchainClient
from backend.app.config import Settings, get_settings


@lru_cache(maxsize=1)
def get_blockchain_client() -> BlockchainClient:
    """Returns a cached blockchain client instance."""

    settings = get_settings()
    return BlockchainClient(settings)


def require_demo_admin(
    x_api_key: str = Header(default="", alias="X-API-Key"),
) -> None:
    """Authorizes demo admin endpoints via static API key."""

    settings: Settings = get_settings()
    if x_api_key != settings.demo_admin_api_key:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid demo admin API key",
        )

