"""Reviews endpoints — product reviews and flagged review data."""

from typing import List
from fastapi import APIRouter, Depends

from models.schemas import ApiResponse
from services.data_service import get_reviews, get_flagged_reviews
from api.v1.auth import get_current_seller_id

router = APIRouter()


@router.get("/", response_model=ApiResponse[List[dict]])
async def list_reviews(
    seller_id: str = Depends(get_current_seller_id)
) -> ApiResponse[List[dict]]:
    """Return product reviews for the active seller."""
    return ApiResponse(data=await get_reviews(seller_id))


@router.get("/flagged", response_model=ApiResponse[List[dict]])
async def list_flagged_reviews(
    seller_id: str = Depends(get_current_seller_id)
) -> ApiResponse[List[dict]]:
    """Return reviews flagged for fake content, policy violations, or safety concerns for the active seller."""
    return ApiResponse(data=await get_flagged_reviews(seller_id))
