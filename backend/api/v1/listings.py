"""Listings endpoints — returns listing data and check results."""

from typing import List
from fastapi import APIRouter, Depends

from models.schemas import ApiResponse
from services.data_service import get_listings
from agents.prevention_agent import PreventionAgent
from agents.state import AgentState
from utils.helpers import generate_run_id
from api.v1.auth import get_current_seller_id

router = APIRouter()
_prevention = PreventionAgent()


@router.get("/", response_model=ApiResponse[List[dict]])
async def list_listings(
    seller_id: str = Depends(get_current_seller_id)
) -> ApiResponse[List[dict]]:
    """Return product listings for the active seller."""
    return ApiResponse(data=await get_listings(seller_id))


@router.post("/check", response_model=ApiResponse[List[dict]])
async def check_listings(
    seller_id: str = Depends(get_current_seller_id)
) -> ApiResponse[List[dict]]:
    """Run prevention checks on all listings for the active seller."""
    run_id = generate_run_id()
    state: AgentState = {
        "run_id": run_id,
        "agent_type": "prevention",
        "input_data": {"seller_id": seller_id},
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
        "email_sent": False,
        "retrieved_from_memory": False,
        "retrieved_memory_doc": None,
    }

    result_state = await _prevention.run(state)
    return ApiResponse(data=result_state.get("detected_issues", []))
