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
   - Backend Swagger (direct): http://localhost:8003/docs

The frontend proxies `/api/*` to the backend, so the browser only talks to port 5173. This avoids CORS and port-forwarding issues.

## Frontend dependencies without host `npm`

You do not need Node.js on the machine: `docker compose build` runs `npm install` inside the frontend image (see `frontend/Dockerfile`).

To **refresh `package-lock.json` on disk** after editing `frontend/package.json`, run this from the **repository root** (writes into `./frontend` via a bind mount):

```bash
docker run --rm -v "$(pwd)/frontend:/app" -w /app node:22-alpine npm install
```

Use the same Node major version as in `frontend/Dockerfile` (`node:22-alpine`) so the lockfile stays consistent with CI and compose builds.

## Health check

```bash
curl http://localhost:5173/api/health
# or directly:
curl http://localhost:8003/health
```

Expect `chain_connected: true` and non-null `latest_block`. If not, fix `RPC_URL` and restart.

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

## Notes

- In Docker, the browser loads the UI from port 5173; API calls go to `/api` on the same origin and Vite proxies them to the backend.
- CORS allows `localhost:5173` and `127.0.0.1:5173`.
- To override API URL in frontend: set `VITE_API_BASE` in docker-compose `frontend.environment`.
