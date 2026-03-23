"""API tests for exposing player avatar metadata."""

from __future__ import annotations

from types import SimpleNamespace

from fastapi.testclient import TestClient

from backend.app.api import deps
from backend.app.main import app


class _Call:
    """Simple function call wrapper."""

    def __init__(self, value):
        self._value = value

    def call(self):
        """Returns pre-configured value."""
        return self._value


class _FakeFunctions:
    """Fake contract functions used by /players route."""

    def players(self, player_id: int) -> _Call:
        """Returns existing player pool for player 1 only."""
        if player_id == 1:
            return _Call((1000, 500, True))
        return _Call((0, 0, False))

    def getSharePrice(self, player_id: int) -> _Call:
        """Returns deterministic price."""
        _ = player_id
        return _Call(10**18)


class _FakeMarketContract:
    """Fake market contract object."""

    functions = _FakeFunctions()


class DummyBlockchainClient:
    """Blockchain client test double for /players."""

    def contract(self, name: str, address: str) -> object:
        """Returns fake market contract."""
        _ = (name, address)
        return _FakeMarketContract()


def _client() -> TestClient:
    """Builds client with dependency override."""
    app.dependency_overrides[deps.get_blockchain_client] = DummyBlockchainClient
    return TestClient(app)


def _clear() -> None:
    """Clears dependency overrides."""
    app.dependency_overrides = {}


def test_players_list_includes_avatar_url(monkeypatch) -> None:
    """Adds avatar_url from backend metadata store to players response."""
    monkeypatch.setattr(
        "backend.app.api.routes.players.get_settings",
        lambda: SimpleNamespace(player_market_address="0xabc"),
    )
    monkeypatch.setattr(
        "backend.app.api.routes.players.get_player_avatar_url",
        lambda **_: "https://cdn.example.com/p1.png",
    )

    client = _client()
    response = client.get("/players", params={"start_id": 1, "end_id": 1})
    _clear()

    assert response.status_code == 200
    payload = response.json()
    assert payload[0]["avatar_url"] == "https://cdn.example.com/p1.png"
