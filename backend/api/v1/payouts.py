"""Payouts endpoints — payout data and anomaly detection."""

from typing import List

from fastapi import APIRouter

from models.schemas import ApiResponse
from services.data_service import get_payouts, get_payout_anomalies

router = APIRouter()


@router.get("/", response_model=ApiResponse[List[dict]])
async def list_payouts() -> ApiResponse[List[dict]]:
    """Return all mock payout records."""
    return ApiResponse(data=get_payouts())


@router.get("/anomalies", response_model=ApiResponse[List[dict]])
async def list_payout_anomalies() -> ApiResponse[List[dict]]:
    """Return payout records flagged as anomalies."""
    return ApiResponse(data=get_payout_anomalies())
