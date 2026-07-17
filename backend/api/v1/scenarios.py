"""Scenarios endpoints — predefined investigation test scenarios."""

from typing import List
from fastapi import APIRouter, HTTPException, Depends

from models.schemas import ApiResponse
from services.data_service import get_investigation_scenarios, get_scenario_by_id
from api.v1.auth import get_current_seller_id

router = APIRouter()


@router.get("/", response_model=ApiResponse[List[dict]])
async def list_scenarios(
    seller_id: str = Depends(get_current_seller_id)
) -> ApiResponse[List[dict]]:
    """Return all predefined investigation scenarios for the active seller."""
    return ApiResponse(data=await get_investigation_scenarios(seller_id))


@router.get("/{scenario_id}", response_model=ApiResponse[dict])
async def get_scenario(
    scenario_id: str,
    seller_id: str = Depends(get_current_seller_id)
) -> ApiResponse[dict]:
    """Return a specific investigation scenario by ID for the active seller."""
    scenario = await get_scenario_by_id(scenario_id, seller_id)
    if not scenario:
        raise HTTPException(status_code=404, detail=f"Scenario {scenario_id} not found")
    return ApiResponse(data=scenario)
