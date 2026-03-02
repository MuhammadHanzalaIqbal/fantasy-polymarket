# MVP Demo Checklist

## 1) Setup

1. Copy `.env.example` to `.env`.
2. Set `RPC_URL`, `PRIVATE_KEY`, and deployed contract addresses.
3. Install dependencies:
   - `uv sync`
4. Start backend:
   - `uv run python main.py`

## 2) Smoke Validation

1. Check health:
   - `GET /health`
2. Verify player pools:
   - `GET /players`
3. Verify contests:
   - `GET /contests`
4. Verify one portfolio:
   - `GET /portfolio/{wallet_address}`

## 3) Demo-Critical Operations

1. Submit oracle matchweek data (admin key required):
   - `POST /oracle/submit-matchweek`
2. Resolve ready contest (admin key required):
   - `POST /contests/{contest_id}/resolve`
3. Read resulting leaderboard:
   - `GET /contests/{contest_id}/leaderboard`
4. Show market quote:
   - `GET /market/{player_id}/quote?side=buy&amount=...`

## 4) Optional Scripted Demo

Run:

- `uv run python backend/scripts/demo_flow.py --wallet <WALLET_ADDRESS>`

