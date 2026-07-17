"""Payouts endpoints — payout data and anomaly detection."""

from typing import List
from fastapi import APIRouter, Depends

from models.schemas import ApiResponse
from services.data_service import get_payouts, get_payout_anomalies
from api.v1.auth import get_current_seller_id

router = APIRouter()


@router.get("/", response_model=ApiResponse[List[dict]])
async def list_payouts(
    seller_id: str = Depends(get_current_seller_id)
) -> ApiResponse[List[dict]]:
    """Return all payout records for the active seller."""
    return ApiResponse(data=await get_payouts(seller_id))


@router.get("/anomalies", response_model=ApiResponse[List[dict]])
async def list_payout_anomalies(
    seller_id: str = Depends(get_current_seller_id)
) -> ApiResponse[List[dict]]:
    """Return payout records flagged as anomalies for the active seller."""
    return ApiResponse(data=await get_payout_anomalies(seller_id))
