"""SQLAlchemy models for backend persistent entities."""

from __future__ import annotations

from datetime import UTC, datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship
from sqlalchemy.types import JSON


def _utc_now() -> datetime:
    """Returns timezone-aware current UTC datetime."""
    return datetime.now(UTC)


class Base(DeclarativeBase):
    """Base SQLAlchemy declarative model class."""


class Team(Base):
    """Persistent fantasy team entity."""

    __tablename__ = "teams"

    team_id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    owner_wallet: Mapped[str] = mapped_column(String(42), index=True)
    name: Mapped[str] = mapped_column(String(128))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=_utc_now, nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=_utc_now,
        onupdate=_utc_now,
        nullable=False,
    )

    members: Mapped[list[TeamMember]] = relationship(
        back_populates="team",
        cascade="all, delete-orphan",
        order_by="TeamMember.slot_index",
    )


class TeamMember(Base):
    """Persistent member row for team composition."""

    __tablename__ = "team_members"
    __table_args__ = (
        UniqueConstraint("team_id", "slot_index", name="uq_team_members_team_slot"),
        UniqueConstraint("team_id", "player_id", name="uq_team_members_team_player"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    team_id: Mapped[int] = mapped_column(
        ForeignKey("teams.team_id", ondelete="CASCADE"), index=True
    )
    slot_index: Mapped[int] = mapped_column(Integer)
    player_id: Mapped[int] = mapped_column(Integer, index=True)
    role_label: Mapped[str] = mapped_column(String(64))
    player_info: Mapped[dict[str, str] | None] = mapped_column(
        JSON().with_variant(JSONB, "postgresql"),
        nullable=True,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=_utc_now, nullable=False
    )

    team: Mapped[Team] = relationship(back_populates="members")


class PlayerProfile(Base):
    """Off-chain player metadata for MVP UX fields."""

    __tablename__ = "player_profiles"

    player_id: Mapped[int] = mapped_column(Integer, primary_key=True)
    avatar_url: Mapped[str | None] = mapped_column(String(512), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=_utc_now, nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=_utc_now,
        onupdate=_utc_now,
        nullable=False,
    )
