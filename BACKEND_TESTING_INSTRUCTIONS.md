# Fantasy Polymarket Backend Testing Instructions (MVP)

This guide is a practical runbook to test backend + blockchain flows end-to-end.

It covers:

- initial backend checks,
- all `GET` endpoints,
- `POST` endpoints (`oracle submit`, `contest resolve`),
- required on-chain setup steps (FTK, player shares, contest lifecycle),
- known failure modes and how to fix them.

---

## 1) Prerequisites

## 1.1 Local backend setup

From project root:

```bash
cp .env.example .env
uv sync
uv run main.py
```

Default backend URL in this repo:

- `http://127.0.0.1:8001`

Swagger:

- `http://127.0.0.1:8001/docs`

## 1.2 Required `.env` values

Set these before testing:

- `RPC_URL`
- `CHAIN_ID` (Sepolia: `11155111`)
- `PRIVATE_KEY` (needed for backend write endpoints)
- `FANTASY_TOKEN_ADDRESS`
- `PLAYER_MARKET_ADDRESS`
- `CONTEST_MANAGER_ADDRESS`
- `ORACLE_ADAPTER_ADDRESS`
- `PLAYER_SHARE_MANAGER_ADDRESS`
- `DEMO_ADMIN_API_KEY`

## 1.3 Wallet prerequisites

- Sepolia ETH for gas
- one test wallet for gameplay user
- one admin/owner wallet for contract admin calls (if separate)

---

## 2) Initial Backend Sanity Checks

Run these first:

```bash
curl http://127.0.0.1:8001/health
```

Expected:

- `chain_connected: true`
- non-null `latest_block`
- correct `chain_id`

If `chain_connected` is `false`, fix `RPC_URL` and restart backend.

---

## 3) Read Endpoints (GET)

## 3.1 Players list

```bash
curl "http://127.0.0.1:8001/players?start_id=1&end_id=20"
```

Note: backend auto-checks both raw player IDs (`1,2,3`) and scaled IDs (`1e18,2e18,3e18`).

## 3.2 Quotes

```bash
curl "http://127.0.0.1:8001/players/1/quote?side=buy&amount=1000000000000000000"
curl "http://127.0.0.1:8001/market/1/quote?side=sell&amount=1000000000000000000"
```

## 3.3 Contests + leaderboard

```bash
curl http://127.0.0.1:8001/contests
curl http://127.0.0.1:8001/contests/1/leaderboard
```

## 3.4 Portfolio

```bash
curl http://127.0.0.1:8001/portfolio/<YOUR_WALLET_ADDRESS>
```

If this hangs, your RPC is unstable and this endpoint is scanning many player IDs sequentially.

---

## 4) On-Chain Setup Required Before POST Flows

The backend can submit oracle data and resolve contests, but you must prepare chain state first.

## 4.1 Have FTK on user wallet

You need FTK to buy shares and enter contests.

Common options:

1. Admin wallet grants `MINTER_ROLE` and mints directly.
2. Use `DepositRouter.deposit(...)` after configuring supported asset and approvals.

## 4.2 Prepare Player Share layer

From admin wallet:

1. `PlayerShareManager.setMarket(<PLAYER_MARKET_ADDRESS>)`
2. `PlayerShareManager.createPlayerToken(playerId, name, symbol)` for each target player
3. `PlayerMarket.addPlayer(playerId)` for each target player

Check token existence:

- `PlayerShareManager.playerToken(playerId)` should return non-zero address.

## 4.3 User buys shares

1. FTK `approve(<PLAYER_MARKET_ADDRESS>, <amount>)`
2. `PlayerMarket.buyShares(playerId, ftkAmount, minShares)`

Verify:

- `PlayerMarket.userBalance(playerId, user) > 0`
- backend `GET /portfolio/<user>` includes that player.

## 4.4 Create contest with future lock/start times

From owner wallet:

`ContestManager.createContest(entryFee, maxEntries, startTime, lockTime, prizeBps)`

Rules:

- `lockTime < startTime`
- `sum(prizeBps) == 10000`

Example:

- `entryFee = 1000000000000000000` (1 FTK)
- `maxEntries = 10`
- `lockTime = now + 600`
- `startTime = now + 1200`
- `prizeBps = [7000,2000,1000]`

## 4.5 User enters contest

Before enter:

1. FTK `approve(<CONTEST_MANAGER_ADDRESS>, entryFee)`
2. Ensure user owns shares for all selected players
3. Time must be before `lockTime`

Then:

- `ContestManager.enterContest(contestId, [playerIds...])`

Verify:

- `/contests/{contestId}/leaderboard` is no longer empty,
- `/contests` shows `total_pot > 0`.

---

## 5) POST Endpoint Testing

Set API key:

```bash
export API_KEY="<YOUR_DEMO_ADMIN_API_KEY>"
```

## 5.1 Submit matchweek data

Use a recent timestamp:

```bash
TS=$(( $(date +%s) - 60 ))
curl -X POST "http://127.0.0.1:8001/oracle/submit-matchweek" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $API_KEY" \
  -d "{
    \"matchweek\": 14,
    \"timestamp\": $TS,
    \"player_ids\": [1000000000000000000,2000000000000000000,8000000000000000000],
    \"scores\": [10,8,6]
  }"
```

Important:

- each `matchweek` can be submitted only once.
- submitting same `matchweek` again reverts with `MATCHWEEK_DONE`.

## 5.2 Resolve contest

```bash
curl -X POST "http://127.0.0.1:8001/contests/9/resolve" \
  -H "X-API-Key: $API_KEY"
```

Alternative admin namespace alias:

```bash
curl -X POST "http://127.0.0.1:8001/admin/contests/9/resolve" \
  -H "X-API-Key: $API_KEY"
```

Then verify:

```bash
curl http://127.0.0.1:8001/contests/9/leaderboard
curl http://127.0.0.1:8001/portfolio/<YOUR_WALLET_ADDRESS>
```

```json

{
  "rank":1,
  "user":"0x7252CFA44890b1f000c937a19c52cf03Db65fca0",
  "score":1
}

```

## 5.3 Build user trade intent (wallet-direct)

```bash
curl -X POST "http://127.0.0.1:8001/market/1/trade-intent" \
  -H "Content-Type: application/json" \
  -d '{
    "wallet_address": "<YOUR_WALLET_ADDRESS>",
    "side": "buy",
    "amount": 1000000000000000000,
    "slippage_bps": 100
  }'
```

Response includes `tx_intent` (`to`, `data`, `value_wei`, `chain_id`) for wallet signing.

## 5.4 Build contest entry intent (wallet-direct)

```bash
curl -X POST "http://127.0.0.1:8001/contests/9/entry-intent" \
  -H "Content-Type: application/json" \
  -d '{
    "wallet_address": "<YOUR_WALLET_ADDRESS>",
    "players": [1000000000000000000, 2000000000000000000]
  }'
```

Use returned `tx_intent` in frontend wallet flow to submit `enterContest`.

## 5.5 Admin create player and contest

```bash
curl -X POST "http://127.0.0.1:8001/admin/players" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $API_KEY" \
  -d '{
    "player_id": 11,
    "token_name": "Player Eleven Share",
    "token_symbol": "P11"
  }'
```

```bash
curl -X POST "http://127.0.0.1:8001/admin/contests" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $API_KEY" \
  -d '{
    "entry_fee": 1000000000000000000,
    "max_entries": 100,
    "start_time": 2000000600,
    "lock_time": 2000000000,
    "prize_bps": [7000, 3000]
  }'
```

---

## 6) Full End-to-End Sequence (Recommended)

1. Start backend and check `/health`
2. Ensure FTK available on test user
3. Admin sets market and creates player tokens
4. Admin adds same players in `PlayerMarket`
5. User approves FTK to market and buys shares
6. Owner creates new contest with future lock/start
7. User approves FTK to contest manager and enters contest
8. Submit oracle matchweek via backend `POST /oracle/submit-matchweek`
9. Resolve contest via backend `POST /admin/contests/{id}/resolve`
10. Validate leaderboard, results, and portfolio (`/contests/{id}/results`, `/me/portfolio`)

---

## 7) Common Errors and Fixes

## `500 ... STALE_DATA`

Cause:

- timestamp too old for oracle window.

Fix:

- use `TS=$(( $(date +%s) - 60 ))`.

## `500 ... MATCHWEEK_DONE`

Cause:

- same matchweek submitted earlier.

Fix:

- use a new `matchweek` id.

## `{"detail":"contest is not resolvable in current state"}`

Cause:

- contest unresolved preconditions not met:
  - no entries,
  - or already resolved.

Fix:

- ensure users entered contest and leaderboard is not empty.

## `GET /contests` 500 with tuple index error

Cause:

- contest struct layout mismatch (already fixed in current backend).

Fix:

- restart backend with latest code.

## `GET /players` returns `[]`

Cause:

- wrong market address,
- no players added,
- or IDs are scaled and range too narrow.

Fix:

- verify `PLAYER_MARKET_ADDRESS`,
- call with wider range,
- backend now auto-supports `1e18` scaling.

## Mint transaction revert

Likely causes:

- caller lacks `MINTER_ROLE`,
- token paused,
- max supply exceeded.

Fix:

- check FTK `hasRole(MINTER_ROLE, caller)`, `paused()`, and `maxSupply`.

---

## 8) Notes for MVP Expectations

- Backend does not yet expose DepositRouter/WithdrawalRouter HTTP endpoints.
- User writes remain wallet-direct via tx-intent routes (`trade-intent`, `entry-intent`).
- Admin setup and orchestration can now be executed through backend admin routes.
- For complete product flow demo, combine:
  - backend endpoints,
  - backend admin API calls,
  - user wallet transactions.

