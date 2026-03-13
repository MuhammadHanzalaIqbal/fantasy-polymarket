"""FastAPI application entrypoint for MVP backend."""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.app.api.routes.admin import router as admin_router
from backend.app.api.routes.contests import router as contests_router
from backend.app.api.routes.health import router as health_router
from backend.app.api.routes.market import router as market_router
from backend.app.api.routes.me import router as me_router
from backend.app.api.routes.oracle_ops import router as oracle_router
from backend.app.api.routes.players import router as players_router
from backend.app.api.routes.portfolio import router as portfolio_router
from backend.app.config import get_settings


def create_app() -> FastAPI:
    """Creates and configures FastAPI application instance."""

    settings = get_settings()
    app = FastAPI(
        title=settings.app_name,
        version=settings.app_version,
        debug=settings.debug,
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=[
            "http://localhost:5173",
            "http://127.0.0.1:5173",
        ],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(health_router)
    app.include_router(players_router)
    app.include_router(market_router)
    app.include_router(contests_router)
    app.include_router(portfolio_router)
    app.include_router(oracle_router)
    app.include_router(admin_router)
    app.include_router(me_router)
    return app


app = create_app()
