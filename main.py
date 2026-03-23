"""Convenience launcher for MVP backend API."""

import os

import uvicorn


def main() -> None:
    """Runs FastAPI development server for local MVP demos."""
    port = int(os.environ.get("PORT", "8001"))
    uvicorn.run(
        "backend.app.main:app",
        host="0.0.0.0",
        port=port,
        reload=True,
    )

if __name__ == "__main__":
    main()
