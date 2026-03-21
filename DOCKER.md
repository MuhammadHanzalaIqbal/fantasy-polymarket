# Running Fantasy Polymarket with Docker

## Quick start

1. **Create `.env` from the Docker example** (includes Sepolia contract addresses):

   ```bash
   cp .env.docker.example .env
   ```

2. **Edit `.env`** and set required values:

   - `RPC_URL` – Sepolia RPC (e.g. Infura, Alchemy)
   - `PRIVATE_KEY` – wallet private key (for write/admin endpoints)

3. **Build and run**:

   ```bash
   docker compose up --build
   ```

4. **Open in browser**:

   - Frontend (and API via proxy): http://localhost:5173
   - Teams page: http://localhost:5173/teams
   - Backend Swagger (direct): http://localhost:8003/docs

The frontend proxies `/api/*` to the backend, so the browser only talks to port 5173. This avoids CORS and port-forwarding issues.

## Health check

```bash
curl http://localhost:5173/api/health
# or directly:
curl http://localhost:8003/health
```

Expect `chain_connected: true` and non-null `latest_block`. If not, fix `RPC_URL` and restart.

Quick checks for Phase 1 team flow:

```bash
# teams endpoint through backend
curl "http://localhost:8003/teams?wallet_address=0x0000000000000000000000000000000000000001"

# frontend route is served (SPA shell)
curl -I http://localhost:5173/teams
```

## Services

| Service | Port | Description |
|---------|------|-------------|
| backend | 8003 | FastAPI backend (reads from chain, serves API) |
| frontend | 5173 | Vite dev server (React UI); proxies /api to backend |

## Environment variables

| Variable | Required | Description |
|----------|----------|-------------|
| RPC_URL | Yes | Sepolia RPC endpoint |
| CHAIN_ID | No | Default 11155111 |
| PRIVATE_KEY | For writes | Needed for oracle/admin flows |
| FANTASY_TOKEN_ADDRESS | Yes | Pre-filled in .env.docker.example |
| PLAYER_MARKET_ADDRESS | Yes | Pre-filled |
| CONTEST_MANAGER_ADDRESS | Yes | Pre-filled |
| ORACLE_ADAPTER_ADDRESS | Yes | Pre-filled |
| PLAYER_SHARE_MANAGER_ADDRESS | Yes | Pre-filled |
| DEMO_ADMIN_API_KEY | No | Default "demo-key" |
| DATABASE_URL | No | Backend persistence DB URL (defaults to local sqlite file) |

## Notes

- Frontend calls API at `http://localhost:8001` (browser → host machine).
- CORS allows `localhost:5173` and `127.0.0.1:5173`.
- To override API URL in frontend: set `VITE_API_BASE` in docker-compose `frontend.environment`.
- In Phase 1, contest entry is team-based in frontend (`team_id`), while direct contract calls can still bypass backend team checks.
