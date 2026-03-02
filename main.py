"""Convenience launcher for MVP backend API."""

import uvicorn


def main() -> None:
    """Runs FastAPI development server for local MVP demos."""

    uvicorn.run("backend.app.main:app", host="0.0.0.0", port=8001, reload=True)

if __name__ == "__main__":
    main()
