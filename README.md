> **Collaboration mirror.** This is a public mirror of [`georgiipr/fantasy-polymarket`](https://github.com/georgiipr/fantasy-polymarket) - a fantasy-sports blockchain MVP built jointly by **[Georgii Promyslov (@georgiipr)](https://github.com/georgiipr)** and **[Muhammad Hanzala Iqbal (@MuhammadHanzalaIqbal)](https://github.com/MuhammadHanzalaIqbal)**. Full git history is preserved on this mirror; per-commit author attribution is unchanged. Published publicly with georgiipr's explicit consent.

---

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
  - Etherscan: https://sepolia.etherscan.io/address/0x96f1b5edb7fed2e3c0bd09c22b289409bc6bffea#code
  - Contract: `0x96f1b5Edb7Fed2E3c0BD09C22b289409BC6BfFEa`
- `PlayerShareManager`
  - Etherscan: https://sepolia.etherscan.io/address/0x63ea24cd1e2e47d9e57eddfab3045e3aa68ca2a5#code
  - Contract: `0x63Ea24Cd1e2e47D9e57EDdFaB3045E3aA68ca2A5`
- `OracleAdapter`
  - Etherscan: https://sepolia.etherscan.io/address/0x62fe83664239397d0b6ea37bcbe1b775520c204c#writeContract
  - Contract: `0x62Fe83664239397d0b6Ea37bcbE1b775520c204c`
- `ContestManager`
  - Etherscan: https://sepolia.etherscan.io/address/0x8b7b7b534a3552a8d2ea0eb91313aa3af475b47e#writeContract
  - Contract: `0x8B7b7b534a3552A8d2Ea0EB91313AA3aF475b47e`
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
- persistent off-chain team management (`/teams`) for team-first UX,
- off-chain player metadata storage (avatar URL),
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
- `GET /contests/{contest_id}/results`
- `GET /portfolio/{wallet_address}`
- `GET /me/portfolio?wallet=0x...`
- `GET /teams?wallet_address=0x...`
- `GET /teams/{team_id}?wallet_address=0x...`
- `POST /market/{player_id}/trade-intent`
- `POST /contests/{contest_id}/entry-intent`
- `POST /teams`

### Demo admin/write endpoints

- `POST /oracle/submit-matchweek`
- `POST /contests/{contest_id}/resolve`
- `POST /admin/players`
- `POST /admin/contests`
- `POST /admin/contests/{contest_id}/resolve`

Both write endpoints require `X-API-Key` matching `DEMO_ADMIN_API_KEY`.

### Important Phase 1 behavior

- Contest entry intent now supports `team_id` (team-first flow) and legacy `players` input.
- Team creation/validation is enforced in backend only (off-chain).
- Contest settlement score source is unchanged: on-chain `contestEntries[].score`.
- Admin player creation accepts optional `avatar_url`; players API can return `avatar_url`.

---

## Repository Structure

```text
fantasy-polymarket/
├── contracts/
├── artifacts/
├── backend/
│   ├── app/
│   │   ├── api/routes/
│   │   ├── db/
│   │   ├── blockchain/
│   │   ├── models/
│   │   ├── oracle/
│   │   ├── services/
│   │   ├── config.py
│   │   └── main.py
│   ├── alembic/
│   ├── scripts/
│   │   └── demo_flow.py
│   ├── tests/
│   └── DEMO_CHECKLIST.md
├── frontend/
│   ├── src/pages/
│   │   ├── Teams.tsx
│   │   └── ContestDetail.tsx
│   └── src/services/api.ts
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
4. `POST /market/{player_id}/trade-intent` and sign/send with wallet
5. `GET /contests`
6. `POST /teams` to create a team (wallet + 5 members + roles)
7. `POST /contests/{contest_id}/entry-intent` with `team_id` and sign/send with wallet
8. `POST /oracle/submit-matchweek` (admin)
9. `POST /admin/contests/{contest_id}/resolve` (admin)
10. `GET /contests/{contest_id}/leaderboard`
11. `GET /contests/{contest_id}/results`
12. `GET /me/portfolio?wallet=0x...`

---

## Known MVP Limitations

- Portfolio endpoint scans player IDs sequentially and can be slow on unstable RPC.
- No dedicated relayer/worker service separation yet (write operations are API-triggered).
- No production-grade auth model yet (demo API key only).
- No indexer-backed read model yet; many reads query chain directly.
- Contract and backend test coverage is still MVP-level.
- Team validation is backend-only in Phase 1 and can be bypassed by direct contract calls.

---

## Production Follow-ups

- Split signer, relayer, and worker responsibilities.
- Add indexer + database read models for scalable queries.
- Add robust authz and secret management.
- Expand contract/integration test coverage.
- Add monitoring/alerting and failover RPC strategy.
