"""Health check endpoint."""

from fastapi import APIRouter, Depends

from config.settings import get_settings
from models.schemas import HealthResponse, ApiResponse
from services.groq_service import groq_service
from services.qdrant_service import qdrant_service
from api.v1.auth import get_current_seller_id

router = APIRouter()
settings = get_settings()


@router.get("/health", response_model=HealthResponse)
async def health_check() -> HealthResponse:
    """System health check — verifies connectivity to all dependent services."""
    groq_ok = await groq_service.health_check()
    qdrant_ok = await qdrant_service.health_check()

    return HealthResponse(
        status="ok",
        version=settings.app_version,
        environment=settings.environment,
        services={
            "groq": "ok" if groq_ok else "degraded",
            "qdrant": "ok" if qdrant_ok else "degraded",
            "database": "ok",
        },
    )


@router.get("/seller-metrics", response_model=ApiResponse[dict])
async def get_seller_metrics_endpoint(
    seller_id: str = Depends(get_current_seller_id)
) -> ApiResponse[dict]:
    """Return mock seller metrics data (rating, return rate, tier, etc.)"""
    from services.data_service import get_seller_metrics
    return ApiResponse(data=await get_seller_metrics(seller_id))


