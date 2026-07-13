"""Listings endpoints — returns mock listing data and check results."""

from typing import List

from fastapi import APIRouter

from models.schemas import ApiResponse, ListingCheckResult
from services.data_service import get_listings
from agents.prevention_agent import PreventionAgent
from agents.state import AgentState
from utils.helpers import generate_run_id, utc_now

router = APIRouter()
_prevention = PreventionAgent()


@router.get("/", response_model=ApiResponse[List[dict]])
async def list_listings() -> ApiResponse[List[dict]]:
    """Return all mock product listings."""
    return ApiResponse(data=get_listings())


@router.post("/check", response_model=ApiResponse[List[dict]])
async def check_listings() -> ApiResponse[List[dict]]:
    """Run prevention checks on all listings. Returns issues per listing."""
    run_id = generate_run_id()
    state: AgentState = {
        "run_id": run_id,
        "agent_type": "prevention",
        "input_data": {},
        "messages": [],
        "monitoring_result": None,
        "investigation_result": None,
        "policy_context": None,
        "action_plan": None,
        "generated_output": None,
        "detected_issues": [],
        "severity": "low",
        "should_escalate": False,
        "is_complete": False,
        "error": None,
    }

    result_state = await _prevention.run(state)
    return ApiResponse(data=result_state.get("detected_issues", []))
