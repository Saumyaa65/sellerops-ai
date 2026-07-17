"""Customer chats endpoints."""

from typing import List
from fastapi import APIRouter, Depends

from models.schemas import ApiResponse
from services.data_service import get_customer_chats
from api.v1.auth import get_current_seller_id

router = APIRouter()


@router.get("/", response_model=ApiResponse[List[dict]])
async def list_customer_chats(
    seller_id: str = Depends(get_current_seller_id)
) -> ApiResponse[List[dict]]:
    """Return all customer chat conversations for the active seller."""
    return ApiResponse(data=await get_customer_chats(seller_id))
