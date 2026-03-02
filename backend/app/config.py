"""Application settings and configuration helpers."""

from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Runtime configuration loaded from environment variables."""

    app_name: str = "Fantasy Polymarket MVP Backend"
    app_version: str = "0.1.0"
    debug: bool = False

    rpc_url: str = Field(default="http://127.0.0.1:8545")
    chain_id: int = 11155111
    private_key: str = ""
    request_timeout_seconds: int = 30

    fantasy_token_address: str = ""
    player_market_address: str = ""
    contest_manager_address: str = ""
    oracle_adapter_address: str = ""
    player_share_manager_address: str = ""

    demo_admin_api_key: str = "demo-key"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    """Returns cached application settings."""

    return Settings()

