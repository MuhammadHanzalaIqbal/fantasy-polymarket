# Fantasy Polymarket

Fantasy Polymarket is a blockchain fantasy sports MVP with:

- on-chain tokenized player exposure and contest settlement,
- off-chain score computation + API layer,
- direct backend-to-chain integration for demo operations.

Core user loop:

`backing asset -> FTK -> player shares + contests -> FTK -> backing asset`

---

## Current Project Status

This repository currently includes:

- Solidity contracts under `contracts/`,
- compiled artifacts under `artifacts/`,
- implemented Python MVP backend under `backend/app/`,
- tests for backend logic under `backend/tests/`,
- architecture docs:
  - `BACKEND_DEVELOPMENT_PLAN.md`
  - `WHOLE_ARCHITECTURE_JOURNEYS_DIAGRAM.md`.

The backend is functional for MVP demos (read APIs + selected write/admin flows).

---

## Architecture Overview

### On-chain responsibilities

Smart contracts are the source of truth for:

- FTK mint/burn and transfer state,
- player share market state,
- contest entry + payout settlement,
- oracle score verification storage,
- withdrawal reserve safety checks.

### Off-chain responsibilities (current MVP)

Backend currently provides:

- FastAPI endpoints for players, contests, portfolio, and quotes,
- deterministic score helpers and signed payload generation,
- direct write operations for oracle submission and contest resolution,
- demo script and smoke tests.

Design rule: backend improves UX and operations, but does not custody funds.

---

## Smart Contracts (Current)

### `FantasyToken` (`contracts/FToken.sol`)

- ERC-20 + permit + pause support.
- Role-based mint/burn (`MINTER_ROLE`, `BURNER_ROLE`).
- Optional max supply guard.

### `DepositRouter` (`contracts/DepositRouter.sol`)

- Supports allowlisted deposit assets.
- Mints FTK 1:1 for deposited amount (no protocol fee in current version).

### `PlayerShareManager` + `ShareToken` (`contracts/PlayerShare.sol`)

- Deploys one ERC-20 share token per player via clones.
- Only linked market can mint/burn player shares.

### `PlayerMarket` (`contracts/PlayerMarket.sol`)

- Admin lists players with `addPlayer`.
- Buy/sell shares with slippage protections.
- Constant-product style pool math.
- No trading fee in current version.

### `ContestManager` (`contracts/ContestManager.sol`)

- Creates contests and accepts entries.
- Validates roster ownership against player share tokens.
- Mints team entries as ERC-1155 (`TeamNFT`).
- Resolves contest using `OracleAdapter` player scores.
- Distributes prize pot to top ranks per `prizeBps`.

### `OracleAdapter` (`contracts/Oracle.sol`)

- Validates signed matchweek payloads.
- Enforces signer allowlist, freshness, and replay protection.
- Stores latest score per player.

### `WithdrawalRouter` (`contracts/WithdrawRouter.sol`)

- Burns FTK and returns backing asset from router reserves.
- Enforces cooldown + global daily limit.
- No withdrawal fee in current version.

### `treasury_depricated.sol`

- Legacy treasury contract kept for historical reference.
- Not part of the current no-fee MVP flow.

---

## Backend API (Implemented MVP)

### Read endpoints

- `GET /health`
- `GET /players`
- `GET /players/{player_id}/quote`
- `GET /market/{player_id}/quote`
- `GET /contests`
- `GET /contests/{contest_id}/leaderboard`
- `GET /portfolio/{wallet_address}`

### Demo admin/write endpoints

- `POST /oracle/submit-matchweek`
- `POST /contests/{contest_id}/resolve`

Both write endpoints require `X-API-Key` matching `DEMO_ADMIN_API_KEY`.

---

## Repository Structure

```text
fantasy-polymarket/
├── contracts/
├── artifacts/
├── backend/
│   ├── app/
│   │   ├── api/routes/
│   │   ├── blockchain/
│   │   ├── models/
│   │   ├── oracle/
│   │   ├── services/
│   │   ├── config.py
│   │   └── main.py
│   ├── scripts/
│   │   └── demo_flow.py
│   ├── tests/
│   └── DEMO_CHECKLIST.md
├── .env.example
├── pyproject.toml
├── main.py
├── BACKEND_DEVELOPMENT_PLAN.md
└── WHOLE_ARCHITECTURE_JOURNEYS_DIAGRAM.md
```

---

## Setup and Run (MVP)

### 1) Configure environment

```bash
cp .env.example .env
```

Fill required values in `.env`:

- `RPC_URL`
- `CHAIN_ID` (Sepolia: `11155111`)
- `PRIVATE_KEY` (required for write endpoints)
- `FANTASY_TOKEN_ADDRESS`
- `PLAYER_MARKET_ADDRESS`
- `CONTEST_MANAGER_ADDRESS`
- `ORACLE_ADAPTER_ADDRESS`
- `PLAYER_SHARE_MANAGER_ADDRESS`
- `DEMO_ADMIN_API_KEY`

### 2) Install dependencies

```bash
uv sync
```

### 3) Start backend

```bash
uv run python main.py
```

Current launcher default port is `8001`.

### 4) Open docs

- `http://127.0.0.1:8001/docs`

---

## Quality Checks

```bash
uv run ruff check .
uv run pytest
```

---

## Demo Flow

Run guided demo script:

```bash
uv run python backend/scripts/demo_flow.py --wallet <WALLET_ADDRESS>
```

Manual testing sequence:

1. `GET /health`
2. `GET /players`
3. `GET /market/{player_id}/quote`
4. `GET /contests`
5. `POST /oracle/submit-matchweek` (admin)
6. `POST /contests/{contest_id}/resolve` (admin)
7. `GET /contests/{contest_id}/leaderboard`
8. `GET /portfolio/{wallet_address}`

---

## Known MVP Limitations

- Portfolio endpoint scans player IDs sequentially and can be slow on unstable RPC.
- No dedicated relayer/worker service separation yet (write operations are API-triggered).
- No production-grade auth model yet (demo API key only).
- No indexer-backed read model yet; many reads query chain directly.
- Contract and backend test coverage is still MVP-level.

---

## Production Follow-ups

- Split signer, relayer, and worker responsibilities.
- Add indexer + database read models for scalable queries.
- Add robust authz and secret management.
- Expand contract/integration test coverage.
- Add monitoring/alerting and failover RPC strategy.
