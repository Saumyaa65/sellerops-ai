"""Orders endpoints — orders and returns from mock data."""

from typing import List

from fastapi import APIRouter

from models.schemas import ApiResponse
from services.data_service import get_orders, get_returns

router = APIRouter()


@router.get("/", response_model=ApiResponse[List[dict]])
async def list_orders() -> ApiResponse[List[dict]]:
    """Return all mock orders."""
    return ApiResponse(data=get_orders())


@router.get("/returns", response_model=ApiResponse[List[dict]])
async def list_returns() -> ApiResponse[List[dict]]:
    """Return all orders flagged as returns."""
    return ApiResponse(data=get_returns())
