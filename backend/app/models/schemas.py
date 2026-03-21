"""Pydantic request and response schemas for API endpoints."""

from __future__ import annotations

from datetime import datetime
from typing import Literal
from urllib.parse import urlparse

from pydantic import BaseModel, Field, field_validator, model_validator


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
    avatar_url: str | None = None


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


class TransactionIntent(BaseModel):
    """Unsigned transaction payload for wallet submission."""

    to: str
    data: str
    value_wei: int = 0
    chain_id: int


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


class TradeIntentRequest(BaseModel):
    """Input model for a frontend wallet trade intent."""

    wallet_address: str = Field(..., min_length=42, max_length=42)
    side: Literal["buy", "sell"]
    amount: int = Field(..., ge=1)
    slippage_bps: int = Field(default=100, ge=0, le=5_000)


class TradeIntentResponse(BaseModel):
    """Response model for wallet-trade unsigned transaction payload."""

    player_id: int
    side: Literal["buy", "sell"]
    amount_in: int
    estimated_amount_out: int
    min_amount_out: int
    reference_price_wei: int
    tx_intent: TransactionIntent
    approval_token: str | None = None
    approval_spender: str | None = None
    required_allowance_wei: int | None = None
    current_allowance_wei: int | None = None
    approval_sufficient: bool | None = None


class ContestEntryIntentRequest(BaseModel):
    """Input model for building a contest entry wallet transaction."""

    wallet_address: str = Field(..., min_length=42, max_length=42)
    players: list[int] | None = Field(default=None, min_length=1, max_length=25)
    team_id: int | None = Field(default=None, ge=1)

    @model_validator(mode="after")
    def validate_players_or_team(self) -> ContestEntryIntentRequest:
        """Ensures exactly one roster source is provided."""
        has_players = bool(self.players)
        has_team_id = self.team_id is not None
        if has_players == has_team_id:
            raise ValueError("Provide exactly one of players or team_id")
        return self


class ContestEntryIntentResponse(BaseModel):
    """Response model for contest-entry transaction preparation."""

    contest_id: int
    wallet_address: str
    entry_fee: int
    players: list[int]
    resolved_players: list[int]
    team_id: int | None = None
    tx_intent: TransactionIntent
    approval_token: str | None = None
    approval_spender: str | None = None
    required_allowance_wei: int | None = None
    current_allowance_wei: int | None = None
    approval_sufficient: bool | None = None


class TeamCreateMember(BaseModel):
    """Input model for a single team member definition."""

    slot_index: int = Field(..., ge=0, le=4)
    player_id: int = Field(..., ge=1)
    role_label: str = Field(..., min_length=1, max_length=64)
    player_info: dict[str, str] | None = None


class TeamCreateRequest(BaseModel):
    """Input model for creating a persistent fantasy team."""

    wallet_address: str = Field(..., min_length=42, max_length=42)
    name: str = Field(..., min_length=1, max_length=128)
    members: list[TeamCreateMember] = Field(..., min_length=5, max_length=5)


class TeamMemberResponse(BaseModel):
    """Response model for a team member."""

    slot_index: int
    player_id: int
    role_label: str
    player_info: dict[str, str] | None = None


class TeamResponse(BaseModel):
    """Response model for persisted team."""

    team_id: int
    owner_wallet: str
    name: str
    members: list[TeamMemberResponse]
    created_at: datetime
    updated_at: datetime


class AdminCreatePlayerRequest(BaseModel):
    """Input model for creating and listing a new player."""

    player_id: int = Field(..., ge=1)
    token_name: str = Field(..., min_length=2, max_length=64)
    token_symbol: str = Field(..., min_length=2, max_length=16)
    avatar_url: str | None = Field(default=None, min_length=1, max_length=512)

    @field_validator("avatar_url")
    @classmethod
    def validate_avatar_url(cls, value: str | None) -> str | None:
        """Validates avatar URL scheme for MVP metadata ingestion."""
        if value is None:
            return None
        parsed = urlparse(value)
        if parsed.scheme not in {"http", "https"}:
            raise ValueError("avatar_url must use http or https scheme")
        if not parsed.netloc:
            raise ValueError("avatar_url must include host")
        return value


class AdminCreatePlayerResponse(BaseModel):
    """Response model for admin player creation workflow."""

    player_id: int
    token_already_exists: bool
    player_already_listed: bool
    create_token_tx: TransactionResponse | None
    add_market_tx: TransactionResponse | None


class AdminCreateContestRequest(BaseModel):
    """Input model for creating a new contest."""

    entry_fee: int = Field(..., ge=0)
    max_entries: int = Field(..., ge=1)
    start_time: int = Field(..., ge=1)
    lock_time: int = Field(..., ge=1)
    prize_bps: list[int] = Field(..., min_length=1)

    @model_validator(mode="after")
    def validate_prize_distribution(self) -> AdminCreateContestRequest:
        """Validates prize payout percentages and contest timing bounds."""
        if any(value <= 0 for value in self.prize_bps):
            raise ValueError("prize_bps values must be positive")
        if sum(self.prize_bps) != 10_000:
            raise ValueError("prize_bps must sum to 10000")
        if self.lock_time >= self.start_time:
            raise ValueError("lock_time must be less than start_time")
        return self


class ContestResultEntryResponse(BaseModel):
    """Contest result row for leaderboard and payout view."""

    rank: int
    user: str
    score: int
    prize_wei: int


class ContestResultsResponse(BaseModel):
    """Contest results payload for a contest details page."""

    contest_id: int
    resolved: bool
    total_pot: int
    winners_count: int
    entries: list[ContestResultEntryResponse]


class TransactionResponse(BaseModel):
    """Transaction execution response model."""

    tx_hash: str
    block_number: int | None
    status: int

