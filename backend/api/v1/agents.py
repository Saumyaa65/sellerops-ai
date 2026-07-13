"""
Agent management endpoints.
POST /agents/run    → trigger an agent run (returns run_id)
GET  /agents/{id}/stream → SSE stream of agent events
GET  /agents/       → list all agent runs
"""

import asyncio
import json
from typing import List

from fastapi import APIRouter, BackgroundTasks, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

from agents.graph import investigation_graph, prevention_graph
from agents.state import AgentState
from models.schemas import AgentRunRequest, AgentRunResponse, ApiResponse
from services.event_bus import event_bus
from utils.helpers import generate_run_id, utc_now
from utils.logger import logger

router = APIRouter()

# In-memory run registry (replace with DB in production)
_runs: dict = {}


async def _execute_graph(run_id: str, agent_type: str, input_data: dict) -> None:
    """Background task: executes the LangGraph pipeline for a given run."""
    graph = prevention_graph if agent_type == "prevention" else investigation_graph

    initial_state: AgentState = {
        "run_id": run_id,
        "agent_type": agent_type,
        "input_data": input_data,
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
    }

    try:
        _runs[run_id]["status"] = "running"
        final_state = await graph.ainvoke(initial_state)
        _runs[run_id]["status"] = "completed"
        _runs[run_id]["output"] = final_state
        logger.info(f"Agent run {run_id} completed successfully")
    except Exception as e:
        _runs[run_id]["status"] = "failed"
        _runs[run_id]["error"] = str(e)
        await event_bus.emit(run_id, "error", {"message": str(e), "agent": agent_type})
        logger.error(f"Agent run {run_id} failed: {e}")


@router.post("/run", response_model=ApiResponse[AgentRunResponse])
async def trigger_agent_run(
    body: AgentRunRequest,
    background_tasks: BackgroundTasks,
) -> ApiResponse[AgentRunResponse]:
    """Trigger an agent pipeline run. Returns run_id for SSE streaming."""
    run_id = generate_run_id()
    created_at = utc_now()

    _runs[run_id] = {
        "run_id": run_id,
        "agent_type": body.agent_type,
        "status": "pending",
        "created_at": created_at.isoformat(),
        "output": None,
        "error": None,
    }

    background_tasks.add_task(_execute_graph, run_id, body.agent_type, body.input_data)

    return ApiResponse(
        data=AgentRunResponse(
            run_id=run_id,
            agent_type=body.agent_type,
            status="pending",
            created_at=created_at,
        )
    )


@router.get("/{run_id}/stream")
async def stream_agent_events(run_id: str) -> StreamingResponse:
    """SSE endpoint — streams real-time agent events for a given run."""
    if run_id not in _runs:
        raise HTTPException(status_code=404, detail=f"Run {run_id} not found")

    async def event_generator():
        async for message in event_bus.stream(run_id):
            yield message
        event_bus.cleanup(run_id)

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",  # Disable nginx buffering
        },
    )


@router.get("/", response_model=ApiResponse[List[dict]])
async def list_agent_runs() -> ApiResponse[List[dict]]:
    """List all agent runs with their current status."""
    runs = list(_runs.values())
    runs.sort(key=lambda r: r["created_at"], reverse=True)
    return ApiResponse(data=runs)


@router.get("/{run_id}", response_model=ApiResponse[dict])
async def get_agent_run(run_id: str) -> ApiResponse[dict]:
    """Get details of a specific agent run."""
    if run_id not in _runs:
        raise HTTPException(status_code=404, detail=f"Run {run_id} not found")
    return ApiResponse(data=_runs[run_id])
