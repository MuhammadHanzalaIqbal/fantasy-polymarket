"""Route tests for API expansion endpoints."""

from types import SimpleNamespace

from fastapi.testclient import TestClient

from backend.app.api import deps
from backend.app.main import app
from backend.app.models.schemas import (
    ContestEntryIntentResponse,
    ContestResultEntryResponse,
    ContestResultsResponse,
    PortfolioResponse,
    TradeIntentResponse,
    TransactionIntent,
    TransactionResponse,
)


class DummyBlockchainClient:
    """Minimal blockchain client test double."""

    def contract(self, name: str, address: str) -> object:
        """Returns a placeholder contract object for monkeypatched services."""
        _ = (name, address)
        return object()


def _client() -> TestClient:
    """Builds test client with blockchain dependency override."""
    app.dependency_overrides[deps.get_blockchain_client] = DummyBlockchainClient
    return TestClient(app)


def _clear_overrides() -> None:
    """Clears FastAPI dependency overrides after each test."""
    app.dependency_overrides = {}


def test_market_trade_intent_success(monkeypatch) -> None:
    """Returns trade intent payload for wallet-direct trade flow."""
    monkeypatch.setattr(
        "backend.app.api.routes.market.get_settings",
        lambda: SimpleNamespace(player_market_address="0x123", chain_id=11155111),
    )
    monkeypatch.setattr(
        "backend.app.api.routes.market.build_trade_intent",
        lambda **_: TradeIntentResponse(
            player_id=1,
            side="buy",
            amount_in=10,
            estimated_amount_out=20,
            min_amount_out=19,
            reference_price_wei=10**18,
            tx_intent=TransactionIntent(
                to="0x123",
                data="0xabc",
                value_wei=0,
                chain_id=11155111,
            ),
        ),
    )
    client = _client()
    response = client.post(
        "/market/1/trade-intent",
        json={
            "wallet_address": "0x0000000000000000000000000000000000000001",
            "side": "buy",
            "amount": 10,
            "slippage_bps": 100,
        },
    )
    _clear_overrides()
    assert response.status_code == 200
    payload = response.json()
    assert payload["tx_intent"]["data"] == "0xabc"
    assert payload["player_id"] == 1


def test_market_trade_intent_requires_market_address(monkeypatch) -> None:
    """Returns 400 when market contract address is not configured."""
    monkeypatch.setattr(
        "backend.app.api.routes.market.get_settings",
        lambda: SimpleNamespace(player_market_address="", chain_id=11155111),
    )
    client = _client()
    response = client.post(
        "/market/1/trade-intent",
        json={
            "wallet_address": "0x0000000000000000000000000000000000000001",
            "side": "buy",
            "amount": 10,
            "slippage_bps": 100,
        },
    )
    _clear_overrides()
    assert response.status_code == 400


def test_contest_entry_intent_success(monkeypatch) -> None:
    """Returns entry intent payload for contest join flow."""
    monkeypatch.setattr(
        "backend.app.api.routes.contests.get_settings",
        lambda: SimpleNamespace(
            contest_manager_address="0xabc",
            player_share_manager_address="0xdef",
            chain_id=11155111,
        ),
    )
    monkeypatch.setattr(
        "backend.app.api.routes.contests.build_contest_entry_intent",
        lambda **_: ContestEntryIntentResponse(
            contest_id=7,
            wallet_address="0x0000000000000000000000000000000000000001",
            entry_fee=10,
            players=[1, 2],
            resolved_players=[1, 2],
            tx_intent=TransactionIntent(
                to="0xabc",
                data="0xdeadbeef",
                value_wei=0,
                chain_id=11155111,
            ),
        ),
    )
    client = _client()
    response = client.post(
        "/contests/7/entry-intent",
        json={
            "wallet_address": "0x0000000000000000000000000000000000000001",
            "players": [1, 2],
        },
    )
    _clear_overrides()
    assert response.status_code == 200
    assert response.json()["contest_id"] == 7


def test_contest_results_success(monkeypatch) -> None:
    """Returns normalized contest results payload."""
    monkeypatch.setattr(
        "backend.app.api.routes.contests.get_settings",
        lambda: SimpleNamespace(contest_manager_address="0xabc"),
    )
    monkeypatch.setattr(
        "backend.app.api.routes.contests.build_contest_results",
        lambda **_: ContestResultsResponse(
            contest_id=9,
            resolved=True,
            total_pot=100,
            winners_count=0,
            entries=[
                ContestResultEntryResponse(
                    rank=1,
                    user="0x0000000000000000000000000000000000000001",
                    score=42,
                    prize_wei=0,
                )
            ],
        ),
    )
    client = _client()
    response = client.get("/contests/9/results")
    _clear_overrides()
    assert response.status_code == 200
    assert response.json()["resolved"] is True


def test_admin_routes_require_api_key(monkeypatch) -> None:
    """Rejects admin route access when API key is missing."""
    monkeypatch.setattr(
        "backend.app.api.deps.get_settings",
        lambda: SimpleNamespace(demo_admin_api_key="secret"),
    )
    monkeypatch.setattr(
        "backend.app.api.routes.admin.get_settings",
        lambda: SimpleNamespace(contest_manager_address="0xabc"),
    )
    client = _client()
    response = client.post(
        "/admin/contests",
        json={
            "entry_fee": 100,
            "max_entries": 10,
            "start_time": 2_000_000_000,
            "lock_time": 1_999_999_900,
            "prize_bps": [7000, 3000],
        },
    )
    _clear_overrides()
    assert response.status_code == 401


def test_admin_create_contest_success(monkeypatch) -> None:
    """Creates contest when API key is valid."""
    monkeypatch.setattr(
        "backend.app.api.deps.get_settings",
        lambda: SimpleNamespace(demo_admin_api_key="secret"),
    )
    monkeypatch.setattr(
        "backend.app.api.routes.admin.get_settings",
        lambda: SimpleNamespace(contest_manager_address="0xabc"),
    )
    monkeypatch.setattr(
        "backend.app.api.routes.admin.create_contest",
        lambda **_: TransactionResponse(
            tx_hash="0x1",
            block_number=10,
            status=1,
        ),
    )
    client = _client()
    response = client.post(
        "/admin/contests",
        headers={"X-API-Key": "secret"},
        json={
            "entry_fee": 100,
            "max_entries": 10,
            "start_time": 2_000_000_000,
            "lock_time": 1_999_999_900,
            "prize_bps": [7000, 3000],
        },
    )
    _clear_overrides()
    assert response.status_code == 200
    assert response.json()["status"] == 1


def test_me_portfolio_alias(monkeypatch) -> None:
    """Returns portfolio through /me alias endpoint."""
    monkeypatch.setattr(
        "backend.app.api.routes.me.get_portfolio",
        lambda wallet_address, blockchain_client: PortfolioResponse(
            wallet_address=wallet_address,
            ftk_balance=99,
            player_shares={1: 3},
        ),
    )
    client = _client()
    response = client.get(
        "/me/portfolio",
        params={"wallet": "0x0000000000000000000000000000000000000001"},
    )
    _clear_overrides()
    assert response.status_code == 200
    assert response.json()["ftk_balance"] == 99
