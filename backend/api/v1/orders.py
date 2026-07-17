"""Orders endpoints — orders and returns from SQLite."""

from typing import List
from fastapi import APIRouter, Depends

from models.schemas import ApiResponse
from services.data_service import get_orders, get_returns
from api.v1.auth import get_current_seller_id

router = APIRouter()


@router.get("/", response_model=ApiResponse[List[dict]])
async def list_orders(
    seller_id: str = Depends(get_current_seller_id)
) -> ApiResponse[List[dict]]:
    """Return all orders for the active seller."""
    return ApiResponse(data=await get_orders(seller_id))


@router.get("/returns", response_model=ApiResponse[List[dict]])
async def list_returns(
    seller_id: str = Depends(get_current_seller_id)
) -> ApiResponse[List[dict]]:
    """Return all orders flagged as returns for the active seller."""
    return ApiResponse(data=await get_returns(seller_id))
