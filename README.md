# Fantasy Polymarket

Fantasy Polymarket is a blockchain-based fantasy sports protocol where users move through:

`backing asset -> FTK -> player-share trading + contests -> FTK -> backing asset`

The repository currently contains:

- Solidity smart contracts for core protocol flows.
- Basic deployment/test scaffolding for Remix.
- Implemented Python MVP backend (FastAPI + direct `web3.py`) for demo operations.

---

## Deployed Contracts (Sepolia)

- `FTK`: https://sepolia.etherscan.io/address/0x82021ccfed084fd8578cb38d8d4323345c363079#writeContract
- `Treasury`: https://sepolia.etherscan.io/address/0xb78e5bdcdf4628d66ce92f731b8a6bc4eac4b63a#readContract
- `Deposit Router`: https://sepolia.etherscan.io/address/0xf2134d1c5b1f0be5f724a7dc8b7fc360f3cad04e#writeContract
- `Player Market`: https://sepolia.etherscan.io/address/0x290dd7f51a0100941d1ec14c40d625821f2bb723#writeContract
- `Player Shares`: https://sepolia.etherscan.io/address/0xcbfc9c21658d214e61a17afc23928aef1453bda8#readContract

Useful faucet: https://console.optimism.io/faucet

---

## Protocol Architecture

### On-chain responsibilities

The contracts are the source of truth for:

- balances and transfers,
- token mint/burn permissions,
- market pricing and trading,
- contest entry/escrow/resolution,
- oracle score verification and storage.

### Off-chain responsibilities (backend)

The backend currently provides:

- API aggregation for player/contest/portfolio reads,
- deterministic oracle score helpers and payload signing,
- direct on-chain operation endpoints for oracle submission and contest resolution,
- demo flow script and smoke tests.

Planned next steps:

- indexer-based query acceleration,
- dedicated relayer/worker separation,
- richer monitoring and caching.

Design rule: backend should improve UX and reliability, but must not custody funds or become a trust bottleneck.

---

## Smart Contracts

### 1) `FantasyToken` (`contracts/FToken.sol`)

Utility token (`FTK`) used across the ecosystem.

- ERC-20 + permit support.
- `MINTER_ROLE` for minting (e.g. routers).
- `BURNER_ROLE` for burning (e.g. withdrawal logic).
- Pause/unpause via `PAUSER_ROLE`.
- Optional `maxSupply` cap (`0` means uncapped).

### 2) `DepositRouter` (`contracts/DepositRouter.sol`)

On-ramp from supported assets to FTK.

Flow:

1. User approves router for a supported ERC-20.
2. User calls `deposit(asset, amount, minFTKOut)`.
3. Router transfers asset from user.
4. Router applies fee (`depositFeeBps`) and sends fee to treasury.
5. Router mints net FTK to user.

### 3) `Treasury` (`contracts/treasury.sol`)

Fee vault and admin-controlled reserve manager.

- Receives protocol fees.
- Holds ERC-20 balances.
- Admin can withdraw via `withdraw(token, to, amount)`.

### 4) `PlayerShareManager` + `ShareToken` (`contracts/PlayerShare.sol`)

Tokenized player exposure layer.

- Uses minimal proxy clones to deploy a dedicated ERC-20 share token per player.
- `createPlayerToken(playerId, name, symbol)` creates player token.
- Only configured `market` can mint/burn shares for users.

### 5) `PlayerMarket` (`contracts/PlayerMarket.sol`)

AMM-style player share trading.

- Admin lists players with `addPlayer(playerId)`.
- Users buy with `buyShares(playerId, ftkAmount, minShares)`.
- Users sell with `sellShares(playerId, shares, minFTK)`.
- Trading fees are forwarded to treasury.
- Pool state tracks FTK liquidity and total shares per player.

Pricing model:

- First buy initializes at 1:1 (net FTK to shares).
- Subsequent pricing uses proportional pool math from existing liquidity/share state.

### 6) `ContestManager` (`contracts/ContestManager.sol`)

Gameplay engine for contest lifecycle.

- Create contests: entry fee, caps, timings, rake, prize split.
- Enter contests: roster check + FTK escrow + team NFT mint.
- Resolve contests: read oracle scores, rank entries, apply rake, pay winners.

High-level lifecycle:

1. Admin creates contest.
2. Users enter before lock time.
3. Scores are published in oracle adapter.
4. Contest resolves and FTK prizes are distributed.

### 7) `OracleAdapter` (`contracts/Oracle.sol`)

Signature-verified bridge between off-chain scoring and on-chain resolution.

- Accepts signed matchweek payloads.
- Verifies signer allowlist.
- Enforces timestamp freshness (`maxDelay`, `maxFuture`).
- Enforces replay protection (`matchweekFinalized`).
- Updates `playerScore[playerId]`.

### 8) `WithdrawalRouter` (`contracts/WithdrawRouter.sol`)

Off-ramp from FTK back to backing asset.

- Pulls FTK from user.
- Burns FTK.
- Applies withdrawal fee.
- Enforces cooldown + optional global daily limits.
- Checks treasury reserves before releasing assets.

Target economic loop:

`USDC -> FTK -> gameplay -> FTK -> USDC`

---

## Backend (Current and Target)

### Current status in this repo

- FastAPI backend is implemented under `backend/app`.
- Direct blockchain integration is implemented with `web3.py` in `backend/app/blockchain`.
- Demo admin operations are available:
  - submit oracle matchweek payloads,
  - resolve contests.
- Unit and smoke tests are implemented in `backend/tests`.
- Demo flow helper and checklist are included:
  - `backend/scripts/demo_flow.py`
  - `backend/DEMO_CHECKLIST.md`

Implemented MVP endpoints:

- `GET /health`
- `GET /players`
- `GET /players/{player_id}/quote`
- `GET /market/{player_id}/quote`
- `GET /contests`
- `GET /contests/{contest_id}/leaderboard`
- `GET /portfolio/{wallet_address}`
- `POST /oracle/submit-matchweek` (demo admin)
- `POST /contests/{contest_id}/resolve` (demo admin)

### Target backend services

1. `API Gateway`: contest browsing, portfolios, leaderboards, pre-checks.
2. `Indexer Layer`: event ingestion from protocol contracts for fast queries.
3. `Oracle Engine`: deterministic scoring, payload generation, signing.
4. `Relayer + Workers`: on-chain submissions and resolution triggering.
5. `Monitoring`: oracle lag, liquidity anomalies, failure alerts.
6. `Caching`: Redis/edge caches for high-read endpoints.

### Non-custodial backend rules

Backend must never:

- hold user funds,
- own protocol-critical mint/burn control,
- rewrite on-chain truth,
- become a mandatory dependency for standard protocol usage.

---

## Repository Structure

```text
fantasy-polymarket/
├── contracts/
│   ├── ContestManager.sol
│   ├── DepositRouter.sol
│   ├── FToken.sol
│   ├── Oracle.sol
│   ├── PlayerMarket.sol
│   ├── PlayerShare.sol
│   ├── WithdrawRouter.sol
│   └── treasury.sol
├── scripts/
├── tests/
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
│   ├── tests/
│   └── DEMO_CHECKLIST.md
├── .env.example
├── pyproject.toml
└── main.py
```

---

## Development Setup

### Solidity side

This project is currently configured for Remix-style workflows (`remix.config.json` present).

Typical flow:

1. Open contracts in Remix.
2. Compile with Solidity `0.8.27`.
3. Deploy core contracts in dependency order.
4. Wire permissions and role grants.
5. Run/extend tests before any live deployment.

Suggested deployment order:

1. `FantasyToken`
2. `Treasury`
3. `PlayerShareManager`
4. `OracleAdapter`
5. `DepositRouter`
6. `PlayerMarket`
7. `ContestManager`
8. `WithdrawalRouter`

### Python side

Python uses `uv` tooling (recommended for all local commands).

```bash
cp .env.example .env
uv sync
uv run python main.py
```

If port `8000` is busy, run on another port:

```bash
uv run uvicorn backend.app.main:app --reload --host 0.0.0.0 --port 8001
```

Quality checks:

```bash
uv run ruff check .
uv run pytest
```

Open API docs:

- `http://127.0.0.1:8000/docs` (or `8001` if you changed port)

Demo script:

```bash
uv run python backend/scripts/demo_flow.py --wallet <WALLET_ADDRESS>
```

Required `.env` values:

- `RPC_URL`
- `CHAIN_ID`
- `PRIVATE_KEY` (required for write/admin endpoints)
- contract addresses:
  - `FANTASY_TOKEN_ADDRESS`
  - `PLAYER_MARKET_ADDRESS`
  - `CONTEST_MANAGER_ADDRESS`
  - `ORACLE_ADAPTER_ADDRESS`
  - `PLAYER_SHARE_MANAGER_ADDRESS`
- `DEMO_ADMIN_API_KEY`

---

## Security Notes

- Keep signer keys and admin keys separate.
- Use multisig for admin roles in production.
- Add exhaustive tests for:
  - role/permission boundaries,
  - slippage/fee math,
  - oracle replay/timestamp checks,
  - contest resolution edge cases (ties, empty entries, large participant sets),
  - withdrawal reserve and limit enforcement.

---

## Known Gaps / TODO Before Production

- Align interfaces between `WithdrawalRouter` and `Treasury` (method naming and integration).
- Expand contract test coverage far beyond placeholder tests.
- Add deployment scripts with deterministic role wiring and post-deploy checks.
- Replace direct API-triggered write flow with dedicated relayer/worker processes.
- Add indexer-backed read models to avoid sequential on-chain scans for heavy endpoints.
- Add authentication/authorization hardening beyond demo API-key protection.
- Document exact redeployment checklist (roles, signer updates, supported assets, limits).

---

## MVP to Production Path

MVP:

- single oracle signer,
- single relayer worker,
- basic indexer and cache,
- manual monitoring.

Production:

- signer rotation and key management hardening,
- multi-oracle quorum or fallback strategy,
- horizontal worker scaling,
- full observability and alerting,
- failover RPC providers and incident playbooks.
