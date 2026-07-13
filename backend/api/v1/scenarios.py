"""Scenarios endpoints — predefined investigation test scenarios."""

from typing import List

from fastapi import APIRouter, HTTPException

from models.schemas import ApiResponse
from services.data_service import get_investigation_scenarios, get_scenario_by_id

router = APIRouter()


@router.get("/", response_model=ApiResponse[List[dict]])
async def list_scenarios() -> ApiResponse[List[dict]]:
    """Return all predefined investigation scenarios."""
    return ApiResponse(data=get_investigation_scenarios())


@router.get("/{scenario_id}", response_model=ApiResponse[dict])
async def get_scenario(scenario_id: str) -> ApiResponse[dict]:
    """Return a specific investigation scenario by ID."""
    scenario = get_scenario_by_id(scenario_id)
    if not scenario:
        raise HTTPException(status_code=404, detail=f"Scenario {scenario_id} not found")
    return ApiResponse(data=scenario)
