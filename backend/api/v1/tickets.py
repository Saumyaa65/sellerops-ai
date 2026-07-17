"""Support tickets endpoints — seller support tickets and open issues."""

from typing import List
from fastapi import APIRouter, Depends

from models.schemas import ApiResponse
from services.data_service import get_support_tickets, get_open_tickets
from api.v1.auth import get_current_seller_id

router = APIRouter()


@router.get("/", response_model=ApiResponse[List[dict]])
async def list_tickets(
    seller_id: str = Depends(get_current_seller_id)
) -> ApiResponse[List[dict]]:
    """Return all seller support tickets for the active seller."""
    return ApiResponse(data=await get_support_tickets(seller_id))


@router.get("/open", response_model=ApiResponse[List[dict]])
async def list_open_tickets(
    seller_id: str = Depends(get_current_seller_id)
) -> ApiResponse[List[dict]]:
    """Return open, escalated, or pending-response support tickets for the active seller."""
    return ApiResponse(data=await get_open_tickets(seller_id))
