"""Create team and player profile persistence tables.

Revision ID: 20260321_000001
Revises:
Create Date: 2026-03-21
"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision = "20260321_000001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Creates team, team member, and player profile tables."""
    op.create_table(
        "teams",
        sa.Column("team_id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("owner_wallet", sa.String(length=42), nullable=False),
        sa.Column("name", sa.String(length=128), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_teams_owner_wallet", "teams", ["owner_wallet"])

    op.create_table(
        "team_members",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("team_id", sa.Integer(), nullable=False),
        sa.Column("slot_index", sa.Integer(), nullable=False),
        sa.Column("player_id", sa.Integer(), nullable=False),
        sa.Column("role_label", sa.String(length=64), nullable=False),
        sa.Column("player_info", sa.JSON(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["team_id"], ["teams.team_id"], ondelete="CASCADE"),
        sa.UniqueConstraint("team_id", "slot_index", name="uq_team_members_team_slot"),
        sa.UniqueConstraint("team_id", "player_id", name="uq_team_members_team_player"),
    )
    op.create_index("ix_team_members_team_id", "team_members", ["team_id"])
    op.create_index("ix_team_members_player_id", "team_members", ["player_id"])

    op.create_table(
        "player_profiles",
        sa.Column("player_id", sa.Integer(), primary_key=True),
        sa.Column("avatar_url", sa.String(length=512), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )


def downgrade() -> None:
    """Drops phase-1 persistence tables."""
    op.drop_table("player_profiles")
    op.drop_index("ix_team_members_player_id", table_name="team_members")
    op.drop_index("ix_team_members_team_id", table_name="team_members")
    op.drop_table("team_members")
    op.drop_index("ix_teams_owner_wallet", table_name="teams")
    op.drop_table("teams")
