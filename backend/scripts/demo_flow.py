"""Simple HTTP demo flow for MVP backend endpoints."""

from __future__ import annotations

import argparse
import json
from typing import Any

import httpx


def _request_json(
    client: httpx.Client,
    method: str,
    path: str,
    payload: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """Sends an HTTP request and returns JSON body.

    Args:
        client: Initialized HTTP client.
        method: HTTP method string.
        path: API path.
        payload: Optional JSON body.

    Returns:
        Parsed JSON response.
    """
    response = client.request(method, path, json=payload)
    response.raise_for_status()
    return response.json()


def run_demo(base_url: str, wallet: str, admin_key: str) -> None:
    """Runs a basic backend demo flow and prints responses.

    Args:
        base_url: Backend base URL.
        wallet: Wallet to query in portfolio endpoint.
        admin_key: Demo admin key for protected routes.
    """
    with httpx.Client(base_url=base_url, timeout=30.0) as client:
        print("== HEALTH ==")
        print(json.dumps(_request_json(client, "GET", "/health"), indent=2))

        print("== PLAYERS ==")
        print(json.dumps(_request_json(client, "GET", "/players"), indent=2))

        print("== CONTESTS ==")
        contests = _request_json(client, "GET", "/contests")
        print(json.dumps(contests, indent=2))

        print("== PORTFOLIO ==")
        print(
            json.dumps(
                _request_json(client, "GET", f"/portfolio/{wallet}"),
                indent=2,
            )
        )

        if contests:
            contest_id = contests[0]["contest_id"]
            print("== LEADERBOARD ==")
            print(
                json.dumps(
                    _request_json(client, "GET", f"/contests/{contest_id}/leaderboard"),
                    indent=2,
                )
            )

            print("== TRY RESOLVE (may fail if contest not ready) ==")
            try:
                response = client.post(
                    f"/contests/{contest_id}/resolve",
                    headers={"X-API-Key": admin_key},
                )
                print(json.dumps(response.json(), indent=2))
            except Exception as error:
                print(f"Resolve call skipped: {error}")


def _build_parser() -> argparse.ArgumentParser:
    """Creates CLI parser for demo script arguments."""

    parser = argparse.ArgumentParser(description="Run Fantasy Polymarket MVP demo flow")
    parser.add_argument("--base-url", default="http://127.0.0.1:8000", type=str)
    parser.add_argument("--wallet", required=True, type=str)
    parser.add_argument("--admin-key", default="demo-key", type=str)
    return parser


def main() -> None:
    """Parses arguments and runs demo flow."""

    parser = _build_parser()
    args = parser.parse_args()
    run_demo(base_url=args.base_url, wallet=args.wallet, admin_key=args.admin_key)


if __name__ == "__main__":
    main()

