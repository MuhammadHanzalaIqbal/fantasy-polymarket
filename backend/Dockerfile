# Backend Dockerfile for Fantasy Polymarket MVP
FROM python:3.13-slim

WORKDIR /app

# Install uv
COPY --from=ghcr.io/astral-sh/uv:latest /uv /usr/local/bin/uv

# Copy dependency manifests first for layer caching
COPY pyproject.toml uv.lock ./
RUN uv sync --frozen --no-dev

# Copy application code and contract artifacts (required for ABI loading)
COPY main.py ./
COPY backend ./backend
COPY artifacts ./artifacts

# Expose API port
EXPOSE 8001

# Run backend (env vars injected at runtime via docker-compose)
CMD ["uv", "run", "python", "main.py"]
