# Fantasy Polymarket Frontend

Frontend for the Fantasy Polymarket MVP. It connects to the backend API for:

- player market browsing and quotes,
- contest browsing and leaderboard,
- team management (`/teams`) for team-based contest entry,
- admin operations (create player/contest, resolve contest).

## Key Phase 1 Changes

- Contest entry uses saved teams (`team_id`) from backend `/teams`.
- New team management page: `/teams`.
- Admin player form supports optional `avatar_url`.
- Players list displays avatar when available.

## Development

From `frontend/`:

```bash
npm install
npm run dev
```

Default dev URL: `http://localhost:5173`.

Set API base with:

```bash
VITE_API_BASE=http://127.0.0.1:8001 npm run dev
```

## Build

```bash
npm run build
```

## Tests (Vitest)

```bash
npm run test
```

Test setup lives in `src/test/` and uses Testing Library + Mantine wrapper helpers.

## Docker-based workflow

If local Node tooling is unavailable, run checks inside container:

```bash
docker run --rm -v "$PWD:/app" -w /app node:22-alpine sh -lc "npm install && npm run test && npm run build"
```

## Important limitation

Frontend enforces team-based flow, but protocol-level enforcement still depends on contracts. Direct on-chain calls can bypass backend team validation in Phase 1.
