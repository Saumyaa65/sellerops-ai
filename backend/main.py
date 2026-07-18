"""
SellerOps AI — FastAPI application factory.
Handles startup/shutdown lifecycle, CORS, routing, and error handling.
"""

from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from api.v1.router import router as api_v1_router
from config.settings import get_settings
from models.database import close_db, init_db
from utils.logger import logger, setup_logger

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan: startup → serve → shutdown."""

    # Startup
    setup_logger(debug=settings.debug)
    logger.info(
        f"Starting {settings.app_name} v{settings.app_version} [{settings.environment}]"
    )

    logger.info("========== STARTUP BEGIN ==========")

    logger.info("STEP 1: Initializing database...")
    await init_db()
    logger.info("STEP 1 DONE: Database initialized")

    logger.info("========== STARTUP COMPLETE ==========")

    yield

    # Shutdown
    logger.info("Shutdown started...")
    await close_db()
    logger.info("Application shutdown complete")


def create_app() -> FastAPI:
    app = FastAPI(
        title=settings.app_name,
        version=settings.app_version,
        description="AI-powered autonomous operations manager for e-commerce sellers",
        docs_url="/docs",
        redoc_url="/redoc",
        lifespan=lifespan,
    )

    # CORS — allow frontend origin(s)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Routes
    app.include_router(api_v1_router)

    # Global exception handler
    @app.exception_handler(Exception)
    async def global_exception_handler(request: Request, exc: Exception) -> JSONResponse:
        logger.error(f"Unhandled exception: {exc}", exc_info=True)
        return JSONResponse(
            status_code=500,
            content={
                "success": False,
                "error": "Internal server error",
                "detail": str(exc),
            },
        )

    @app.get("/")
    async def root():
        return {
            "name": settings.app_name,
            "version": settings.app_version,
            "status": "running",
            "docs": "/docs",
        }

    return app


app = create_app()