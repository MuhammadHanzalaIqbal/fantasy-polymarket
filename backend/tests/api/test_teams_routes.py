"""API tests for /teams endpoints."""

from __future__ import annotations

from datetime import UTC, datetime
from types import SimpleNamespace

from fastapi.testclient import TestClient

from backend.app.api import deps
from backend.app.main import app


class DummyBlockchainClient:
    """Test blockchain client double."""

    def contract(self, name: str, address: str) -> object:
        """Returns placeholder object."""
        _ = (name, address)
        return object()


def _client() -> TestClient:
    """Builds API client with blockchain override."""
    app.dependency_overrides[deps.get_blockchain_client] = DummyBlockchainClient
    return TestClient(app)


def _clear() -> None:
    """Clears app dependency overrides."""
    app.dependency_overrides = {}


def test_create_team_requires_share_manager_config(monkeypatch) -> None:
    """Returns 400 when share manager address is missing."""
    monkeypatch.setattr(
        "backend.app.api.routes.teams.get_settings",
        lambda: SimpleNamespace(player_share_manager_address=""),
    )
    client = _client()
    response = client.post(
        "/teams",
        json={
            "wallet_address": "0x0000000000000000000000000000000000000001",
            "name": "Main Team",
            "members": [
                {"slot_index": 0, "player_id": 1, "role_label": "AWP"},
                {"slot_index": 1, "player_id": 2, "role_label": "IGL"},
                {"slot_index": 2, "player_id": 3, "role_label": "Entry"},
                {"slot_index": 3, "player_id": 4, "role_label": "Lurker"},
                {"slot_index": 4, "player_id": 5, "role_label": "Support"},
            ],
        },
    )
    _clear()
    assert response.status_code == 400


def test_list_teams_by_wallet(monkeypatch) -> None:
    """Returns list payload from service layer."""
    monkeypatch.setattr(
        "backend.app.api.routes.teams.get_settings",
        lambda: SimpleNamespace(player_share_manager_address="0x123"),
    )
    monkeypatch.setattr(
        "backend.app.api.routes.teams.list_teams_for_wallet",
        lambda **_: [
            {
                "team_id": 10,
                "owner_wallet": "0x0000000000000000000000000000000000000001",
                "name": "Team A",
                "members": [],
                "created_at": datetime.now(UTC),
                "updated_at": datetime.now(UTC),
            }
        ],
    )
    client = _client()
    response = client.get(
        "/teams",
        params={"wallet_address": "0x0000000000000000000000000000000000000001"},
    )
    _clear()
    assert response.status_code == 200
    assert response.json()[0]["team_id"] == 10
