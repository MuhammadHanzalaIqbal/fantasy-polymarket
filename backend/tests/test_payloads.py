"""Unit tests for oracle payload helpers."""

from backend.app.oracle.payloads import build_matchweek_digest


def test_build_matchweek_digest_is_deterministic() -> None:
    """Produces stable digest for the same inputs."""

    digest_one = build_matchweek_digest(
        oracle_adapter_address="0x0000000000000000000000000000000000000001",
        matchweek=1,
        timestamp=1_700_000_000,
        player_ids=[1, 2, 3],
        scores=[10, 11, 12],
    )
    digest_two = build_matchweek_digest(
        oracle_adapter_address="0x0000000000000000000000000000000000000001",
        matchweek=1,
        timestamp=1_700_000_000,
        player_ids=[1, 2, 3],
        scores=[10, 11, 12],
    )

    assert digest_one == digest_two
    assert len(digest_one) == 32

