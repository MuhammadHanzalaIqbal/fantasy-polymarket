"""Deterministic fantasy score computation helpers."""

from typing import Final

GOAL_POINTS: Final[int] = 5
ASSIST_POINTS: Final[int] = 3
YELLOW_CARD_PENALTY: Final[int] = 1
RED_CARD_PENALTY: Final[int] = 3


def calculate_fantasy_score(
    goals: int,
    assists: int,
    minutes_played: int,
    yellow_cards: int = 0,
    red_cards: int = 0,
) -> int:
    """Computes deterministic fantasy points for a single player.

    Args:
        goals: Number of goals scored.
        assists: Number of assists made.
        minutes_played: Minutes played in match.
        yellow_cards: Number of yellow cards.
        red_cards: Number of red cards.

    Returns:
        Total score as integer.

    Raises:
        ValueError: If any input value is negative.
    """
    _validate_non_negative(goals, assists, minutes_played, yellow_cards, red_cards)

    base_score = goals * GOAL_POINTS + assists * ASSIST_POINTS
    discipline_penalty = (
        yellow_cards * YELLOW_CARD_PENALTY + red_cards * RED_CARD_PENALTY
    )
    appearance_bonus = 1 if minutes_played >= 60 else 0
    return base_score + appearance_bonus - discipline_penalty


def _validate_non_negative(*values: int) -> None:
    """Validates that all integer values are non-negative."""

    if any(value < 0 for value in values):
        raise ValueError("score inputs must be non-negative")

