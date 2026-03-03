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

## Existing Deployed Contracts (Sepolia)

- `FTK`
  - Etherscan: https://sepolia.etherscan.io/address/0x82021ccfed084fd8578cb38d8d4323345c363079#writeContract
  - Contract: `0x82021CcfED084fD8578cb38d8D4323345C363079`
- `DepositRouter`
  - Etherscan: https://sepolia.etherscan.io/address/0xdf582d404867f12978e3e2e9d6e03ea4f5cf55da#writeContract
  - Contract: `0xDF582D404867F12978E3e2E9D6E03Ea4F5Cf55Da`
- `PlayerMarket`
  - Etherscan: https://sepolia.etherscan.io/address/0x9540eb6b9252e259398b4f9dcb90f56064e0b15c#writeContract
  - Contract: `0x9540EB6B9252E259398B4F9dcB90F56064E0b15c`
- `PlayerShares`
  - Etherscan: https://sepolia.etherscan.io/address/0x8f3633053a47b91db07e15ac2057b62a905a82fd#writeContract
  - Contract: `0x8F3633053A47B91Db07E15Ac2057b62A905A82fD`
- `OracleAdapter`
  - Etherscan: https://sepolia.etherscan.io/address/0x62fe83664239397d0b6ea37bcbe1b775520c204c#writeContract
  - Contract: `0x62Fe83664239397d0b6Ea37bcbE1b775520c204c`
- `ContestManager`
  - Etherscan: https://sepolia.etherscan.io/address/0xd75b933fe234b46709f24a73afe01e39f5fb4567#writeContract
  - Contract: `0xD75B933fE234B46709f24a73AFe01E39f5fB4567`
- `WithdrawalRouter`
  - Etherscan: https://sepolia.etherscan.io/address/0x5e4986bcd65a1d9668b65a989e0be0b43aac1e51#writeContract
  - Contract: `0x5E4986bCD65A1d9668B65a989E0be0B43AAC1E51`

- Faucet: https://console.optimism.io/faucet
- Note: For withdrawals, `FTK` burn capability must be enabled for `WithdrawalRouter`.

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
