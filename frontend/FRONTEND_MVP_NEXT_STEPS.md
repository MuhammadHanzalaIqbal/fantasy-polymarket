# Frontend MVP Next Steps (After Backend Route Expansion)

## Current frontend status

The current frontend is good for the original read-only/demo scope:

- Works with existing public read routes:
  - `GET /health`
  - `GET /players`
  - `GET /market/{player_id}/quote`
  - `GET /contests`
  - `GET /contests/{contest_id}/leaderboard`
  - `GET /portfolio/{wallet_address}`
- Wallet connect exists (`eth_requestAccounts`) but is not yet integrated into transaction execution flows.
- UI is mostly read-only; buy/sell and contest entry are quote/inspection only.

## What is missing for a 100% working MVP

To support all requested user/admin operations through backend + frontend, these are missing in frontend:

### User flows

1. Use connected wallet as primary identity in app state.
2. Trade execution flow using:
   - `POST /market/{player_id}/trade-intent`
   - wallet `eth_sendTransaction` with returned intent.
3. Contest entry execution flow using:
   - `POST /contests/{contest_id}/entry-intent`
   - wallet `eth_sendTransaction` with returned intent.
4. Contest results page using:
   - `GET /contests/{contest_id}/results`.
5. Portfolio page migration to:
   - `GET /me/portfolio?wallet=...` (keep old `/portfolio/{wallet}` as fallback/debug).

### Admin flows

1. Create player UI:
   - `POST /admin/players` with `X-API-Key`.
2. Create contest UI:
   - `POST /admin/contests` with `X-API-Key`.
3. Resolve contest UI:
   - `POST /admin/contests/{contest_id}/resolve` with `X-API-Key`.

## Required API client upgrades

Current `src/services/api.ts` only supports GET with hardcoded base URL and no auth headers.

Add:

- `API_BASE` from env (`VITE_API_BASE`) with fallback.
- Generic `postJSON` helper with optional headers.
- New request/response types for:
  - trade intent
  - entry intent
  - contest results
  - admin create player
  - admin create contest
- Admin helper that injects `X-API-Key`.

Also update existing types:

- `HealthResponse.latest_block` and `chain_id` should allow `null`.
- `PlayerPoolResponse.share_price_wei` should allow `null`.

## Wallet transaction executor (critical)

Add a reusable utility:

- Input: backend `tx_intent` (`to`, `data`, `value_wei`, `chain_id`).
- Validate connected chain vs `chain_id`; prompt switch if needed.
- Execute:
  - `ethereum.request({ method: "eth_sendTransaction", params: [{ from, to, data, value }] })`.
- Return tx hash and support simple status UX (`pending`, `confirmed`, `failed`).

This unlocks both user write flows while keeping backend non-custodial.

## Suggested UI changes by page

### `App.tsx`

- Move wallet to global context/store so all pages can consume the connected address.
- Add optional admin API key state (in-memory/session only).

### `PlayerMarket.tsx`

- Keep quote UI.
- Add `slippage_bps` input.
- Add `Execute trade` action:
  1. call `trade-intent`,
  2. call wallet tx executor,
  3. refresh related data (portfolio, player info, contests if needed).

### `Contests.tsx` and contest detail page

- Keep list/leaderboard.
- Add links/buttons for:
  - `View results`,
  - `Enter contest`.
- Entry flow:
  1. choose player IDs,
  2. call `entry-intent`,
  3. send wallet tx,
  4. refresh leaderboard/results/portfolio.

### New results page

- Route example: `/contests/:contestId/results`.
- Fetch `GET /contests/{id}/results`.
- Show resolved status, total pot, ranked entries, winners count.

### `Portfolio.tsx`

- Default to connected wallet.
- Use `/me/portfolio?wallet=...`.
- Keep manual wallet input only as debug fallback.

### New admin page

- Route example: `/admin`.
- Sections:
  - create player form,
  - create contest form,
  - resolve contest action.
- All admin requests include `X-API-Key`.

## Data/state management recommendation

Use `@tanstack/react-query` (already in deps) for:

- query caching (`contests`, `leaderboard`, `results`, `portfolio`, `players`),
- mutation handling (`trade-intent`, `entry-intent`, admin actions),
- invalidation after successful writes.

Recommended query keys:

- `["portfolio", wallet]`
- `["contests"]`
- `["leaderboard", contestId]`
- `["results", contestId]`
- `["players", startId, endId]`

## Priority implementation order

1. API client expansion (`postJSON`, env base URL, new route methods, types).
2. Global wallet state + wallet tx executor.
3. Trade flow in player market.
4. Contest entry flow.
5. Contest results page.
6. Portfolio migration to `/me/portfolio`.
7. Admin console (`/admin/*` routes).
8. UX polish + error normalization.

## Important correctness notes

- Many on-chain numeric fields can exceed JS safe integer range. Prefer `string`/`bigint` handling for balances, pots, shares, and amounts.
- Backend error payloads should be surfaced cleanly in UI (400 validation, 401 admin key, 5xx infra errors).
- Keep old frontend calls working during migration, but switch primary UX to new intent/admin routes.

## MVP acceptance checklist

User:

- Connect wallet.
- See FTK balance and holdings.
- View contests and leaderboard.
- Buy/sell player using intent + wallet tx.
- Enter contest using intent + wallet tx.
- View contest results.

Admin:

- Create player from UI.
- Create contest from UI.
- Resolve contest from UI.

System:

- Data refreshes after each successful transaction.
- Error states are visible and actionable.
