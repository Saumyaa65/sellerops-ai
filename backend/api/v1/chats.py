"""Customer chats endpoints."""

from typing import List

from fastapi import APIRouter

from models.schemas import ApiResponse
from services.data_service import get_customer_chats

router = APIRouter()


@router.get("/", response_model=ApiResponse[List[dict]])
async def list_customer_chats() -> ApiResponse[List[dict]]:
    """Return all mock customer chat conversations."""
    return ApiResponse(data=get_customer_chats())
