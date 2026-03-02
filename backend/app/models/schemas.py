"""Pydantic request and response schemas for API endpoints."""

from typing import Literal

from pydantic import BaseModel, Field


class HealthResponse(BaseModel):
    """Healthcheck payload."""

    app_name: str
    version: str
    chain_connected: bool
    latest_block: int | None
    chain_id: int | None


class PlayerPoolResponse(BaseModel):
    """Player pool state model."""

    player_id: int
    exists: bool
    total_shares: int
    ftk_liquidity: int
    share_price_wei: int | None = None


class ContestResponse(BaseModel):
    """Contest metadata model."""

    contest_id: int
    entry_fee: int
    max_entries: int
    start_time: int
    lock_time: int
    rake_bps: int
    resolved: bool
    total_pot: int


class LeaderboardEntryResponse(BaseModel):
    """Leaderboard entry model."""

    rank: int
    user: str
    score: int


class PortfolioResponse(BaseModel):
    """Portfolio aggregate model."""

    wallet_address: str
    ftk_balance: int
    player_shares: dict[int, int]


class QuoteResponse(BaseModel):
    """Quote model for buy or sell simulations."""

    player_id: int
    side: Literal["buy", "sell"]
    amount_in: int
    estimated_amount_out: int
    reference_price_wei: int


class OracleSubmitRequest(BaseModel):
    """Input model for on-chain oracle submission."""

    matchweek: int = Field(..., ge=1)
    timestamp: int = Field(..., ge=1)
    player_ids: list[int] = Field(..., min_length=1)
    scores: list[int] = Field(..., min_length=1)


class TransactionResponse(BaseModel):
    """Transaction execution response model."""

    tx_hash: str
    block_number: int | None
    status: int

