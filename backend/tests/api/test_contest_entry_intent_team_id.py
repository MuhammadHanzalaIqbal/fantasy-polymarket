"""API tests for team-based contest entry intent."""

from __future__ import annotations

from types import SimpleNamespace

from fastapi.testclient import TestClient

from backend.app.api import deps
from backend.app.main import app
from backend.app.models.schemas import ContestEntryIntentResponse, TransactionIntent


class DummyBlockchainClient:
    """Minimal blockchain client double for route tests."""

    def contract(self, name: str, address: str) -> object:
        """Returns placeholder contract object."""
        _ = (name, address)
        return object()


def _client() -> TestClient:
    """Builds test client with blockchain dependency override."""
    app.dependency_overrides[deps.get_blockchain_client] = DummyBlockchainClient
    return TestClient(app)


def _clear() -> None:
    """Clears dependency overrides."""
    app.dependency_overrides = {}


def test_entry_intent_accepts_team_id(monkeypatch) -> None:
    """Builds contest entry tx using resolved team roster."""
    monkeypatch.setattr(
        "backend.app.api.routes.contests.get_settings",
        lambda: SimpleNamespace(
            contest_manager_address="0xabc",
            player_share_manager_address="0xdef",
            chain_id=11155111,
        ),
    )
    monkeypatch.setattr(
        "backend.app.api.routes.contests.resolve_entry_players",
        lambda **_: [1, 2, 3, 4, 5],
    )
    monkeypatch.setattr(
        "backend.app.api.routes.contests.build_contest_entry_intent",
        lambda **_: ContestEntryIntentResponse(
            contest_id=9,
            wallet_address="0x0000000000000000000000000000000000000001",
            entry_fee=100,
            players=[1, 2, 3, 4, 5],
            resolved_players=[1, 2, 3, 4, 5],
            team_id=7,
            tx_intent=TransactionIntent(
                to="0xabc",
                data="0xbeef",
                value_wei=0,
                chain_id=11155111,
            ),
        ),
    )

    client = _client()
    response = client.post(
        "/contests/9/entry-intent",
        json={
            "wallet_address": "0x0000000000000000000000000000000000000001",
            "team_id": 7,
        },
    )
    _clear()

    assert response.status_code == 200
    payload = response.json()
    assert payload["team_id"] == 7
    assert payload["players"] == [1, 2, 3, 4, 5]
