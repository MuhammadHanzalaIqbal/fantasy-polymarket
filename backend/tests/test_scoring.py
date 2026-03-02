"""Unit tests for deterministic scoring module."""

import pytest

from backend.app.oracle.scoring import calculate_fantasy_score


def test_calculate_fantasy_score_happy_path() -> None:
    """Computes score with goals, assists, and appearance bonus."""

    score = calculate_fantasy_score(goals=2, assists=1, minutes_played=90)
    assert score == 14


def test_calculate_fantasy_score_with_cards() -> None:
    """Applies yellow and red card penalties."""

    score = calculate_fantasy_score(
        goals=1,
        assists=0,
        minutes_played=61,
        yellow_cards=1,
        red_cards=1,
    )
    assert score == 2


def test_calculate_fantasy_score_rejects_negative() -> None:
    """Raises error for invalid negative inputs."""

    with pytest.raises(ValueError):
        calculate_fantasy_score(goals=-1, assists=0, minutes_played=90)

