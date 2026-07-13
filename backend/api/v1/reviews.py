"""Reviews endpoints — product reviews and flagged review data."""

from typing import List

from fastapi import APIRouter

from models.schemas import ApiResponse
from services.data_service import get_reviews, get_flagged_reviews

router = APIRouter()


@router.get("/", response_model=ApiResponse[List[dict]])
async def list_reviews() -> ApiResponse[List[dict]]:
    """Return all mock product reviews."""
    return ApiResponse(data=get_reviews())


@router.get("/flagged", response_model=ApiResponse[List[dict]])
async def list_flagged_reviews() -> ApiResponse[List[dict]]:
    """Return reviews flagged for fake content, policy violations, or safety concerns."""
    return ApiResponse(data=get_flagged_reviews())
