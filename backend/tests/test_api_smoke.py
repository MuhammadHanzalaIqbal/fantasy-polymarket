"""Smoke tests for FastAPI app routing."""

from fastapi.testclient import TestClient

from backend.app.main import app


def test_health_endpoint_returns_payload() -> None:
    """Checks that health route is reachable and shaped as expected."""

    client = TestClient(app)
    response = client.get("/health")
    assert response.status_code == 200
    payload = response.json()
    assert "app_name" in payload
    assert "chain_connected" in payload

