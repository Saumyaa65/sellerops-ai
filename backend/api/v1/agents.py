import asyncio
import json
from datetime import datetime
from typing import List

from fastapi import APIRouter, BackgroundTasks, HTTPException, Request, Depends, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from agents.graph import investigation_graph, prevention_graph
from agents.state import AgentState
from models.schemas import AgentRunRequest, AgentRunResponse, ApiResponse
from models.agent_run import AgentRun
from models.investigation import Investigation
from models.user import User
from services.event_bus import event_bus
from utils.helpers import generate_run_id, utc_now
from utils.logger import logger
from models.database import AsyncSessionLocal
from api.deps import get_db
from api.v1.auth import get_current_seller_id

router = APIRouter()

async def _execute_graph(run_id: str, agent_type: str, input_data: dict, seller_id: str) -> None:
    """Background task: executes the LangGraph pipeline for a given run and saves outputs to DB."""
    graph = prevention_graph if agent_type == "prevention" else investigation_graph

    initial_state: AgentState = {
        "run_id": run_id,
        "agent_type": agent_type,
        "input_data": {**input_data, "seller_id": seller_id},
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

    # 1. Update status to "running" in a short-lived database session
    async with AsyncSessionLocal() as db:
        try:
            stmt = select(AgentRun).where(AgentRun.id == run_id)
            res = await db.execute(stmt)
            run = res.scalars().first()
            if run:
                run.status = "running"
                await db.commit()
        except Exception as startup_err:
            logger.error(f"Failed to set agent run status to running: {startup_err}")

    # 2. Run graph execution outside any active database session block
    try:
        final_state = await graph.ainvoke(initial_state)
    except Exception as graph_err:
        async with AsyncSessionLocal() as db:
            stmt = select(AgentRun).where(AgentRun.id == run_id)
            res = await db.execute(stmt)
            run = res.scalars().first()
            if run:
                run.status = "failed"
                run.error_message = str(graph_err)
                await db.commit()
        await event_bus.emit(run_id, "error", {"message": str(graph_err), "agent": agent_type})
        logger.error(f"Agent run {run_id} failed during graph execution: {graph_err}")
        return

    # 3. Save graph results in a new short-lived database session
    async with AsyncSessionLocal() as db:
        try:
            stmt = select(AgentRun).where(AgentRun.id == run_id)
            res = await db.execute(stmt)
            run = res.scalars().first()
            if run:
                run.status = "completed"
                run.output_payload = json.dumps(final_state)
                run.completed_at = utc_now()
                await db.commit()

            # Save investigation to database if applicable
            investigation_res = final_state.get("investigation_result")
            if investigation_res and agent_type == "investigation":
                chk_stmt = select(Investigation).where(Investigation.run_id == run_id)
                chk_res = await db.execute(chk_stmt)
                existing_inv = chk_res.scalars().first()
                if not existing_inv:
                    inv_id = f"INV-{generate_run_id()[:8].upper()}"
                    issues = final_state.get("detected_issues", [])
                    issue_type = ", ".join(sorted([i["type"] for i in issues])) if issues else "general"
                    
                    root_cause = investigation_res.get("raw", "")
                    action_plan = json.dumps(final_state.get("action_plan", [])) if final_state.get("action_plan") else None
                    generated_appeal = final_state.get("generated_output")
                    stored_in_memory = final_state.get("retrieved_from_memory", False)
                    
                    inv = Investigation(
                        id=inv_id,
                        seller_id=seller_id,
                        run_id=run_id,
                        issue_type=issue_type,
                        marketplace=final_state.get("input_data", {}).get("marketplace", "meesho"),
                        severity=final_state.get("severity", "medium"),
                        root_cause=root_cause,
                        action_plan=action_plan,
                        generated_appeal=generated_appeal,
                        resolution_status="open",
                        stored_in_memory=stored_in_memory,
                        created_at=utc_now()
                    )
                    db.add(inv)
                    await db.commit()

            logger.info(f"Agent run {run_id} completed successfully")
        except Exception as e:
            stmt = select(AgentRun).where(AgentRun.id == run_id)
            res = await db.execute(stmt)
            run = res.scalars().first()
            if run:
                run.status = "failed"
                run.error_message = str(e)
                await db.commit()
            await event_bus.emit(run_id, "error", {"message": str(e), "agent": agent_type})
            logger.error(f"Agent run {run_id} completed but failed to save results: {e}")


@router.post("/run", response_model=ApiResponse[AgentRunResponse])
async def trigger_agent_run(
    body: AgentRunRequest,
    background_tasks: BackgroundTasks,
    seller_id: str = Depends(get_current_seller_id),
    db: AsyncSession = Depends(get_db)
) -> ApiResponse[AgentRunResponse]:
    """Trigger an agent pipeline run. Returns run_id for SSE streaming."""
    run_id = generate_run_id()
    created_at = utc_now()

    run = AgentRun(
        id=run_id,
        seller_id=seller_id,
        agent_type=body.agent_type,
        status="pending",
        input_payload=json.dumps(body.input_data),
        created_at=created_at
    )
    db.add(run)
    await db.commit()

    background_tasks.add_task(_execute_graph, run_id, body.agent_type, body.input_data, seller_id)

    return ApiResponse(
        data=AgentRunResponse(
            run_id=run_id,
            agent_type=body.agent_type,
            status="pending",
            created_at=created_at,
        )
    )


@router.get("/{run_id}/stream")
async def stream_agent_events(
    run_id: str,
    request: Request,
    token: str = Query(None),
    db: AsyncSession = Depends(get_db)
) -> StreamingResponse:
    """SSE endpoint — streams real-time agent events for a given run."""
    # Verify that the run exists in DB
    query = select(AgentRun).where(AgentRun.id == run_id)
    res = await db.execute(query)
    run = res.scalars().first()
    if not run:
        raise HTTPException(status_code=404, detail=f"Run {run_id} not found")

    # In our demo login flow, EventSource requests include ?token=email.
    # We verify the token matches the seller ID of the run.
    if token:
        user_query = select(User).where(User.email == token)
        user_res = await db.execute(user_query)
        user = user_res.scalars().first()
        if not user or user.seller_id != run.seller_id:
            raise HTTPException(status_code=401, detail="Unauthorized")

    async def event_generator():
        try:
            async for message in event_bus.stream(run_id):
                if await request.is_disconnected():
                    logger.info(f"[SSE] Client disconnected for run_id={run_id}")
                    break
                yield message
        except asyncio.CancelledError:
            logger.info(f"[SSE] Stream connection cancelled for run={run_id}")
        finally:
            event_bus.cleanup(run_id)

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )


@router.get("/", response_model=ApiResponse[List[dict]])
async def list_agent_runs(
    seller_id: str = Depends(get_current_seller_id),
    db: AsyncSession = Depends(get_db)
) -> ApiResponse[List[dict]]:
    """List all agent runs belonging to this seller."""
    query = select(AgentRun).where(AgentRun.seller_id == seller_id).order_by(AgentRun.created_at.desc())
    result = await db.execute(query)
    runs = result.scalars().all()

    serialized = []
    for r in runs:
        serialized.append({
            "run_id": r.id,
            "agent_type": r.agent_type,
            "status": r.status,
            "created_at": r.created_at.isoformat() if isinstance(r.created_at, datetime) else r.created_at,
            "output": json.loads(r.output_payload) if r.output_payload else None,
            "error": r.error_message,
        })
    return ApiResponse(data=serialized)


@router.get("/{run_id}", response_model=ApiResponse[dict])
async def get_agent_run(
    run_id: str,
    seller_id: str = Depends(get_current_seller_id),
    db: AsyncSession = Depends(get_db)
) -> ApiResponse[dict]:
    """Get details of a specific agent run."""
    query = select(AgentRun).where(AgentRun.id == run_id, AgentRun.seller_id == seller_id)
    result = await db.execute(query)
    r = result.scalars().first()
    if not r:
        raise HTTPException(status_code=404, detail=f"Run {run_id} not found")

    serialized = {
        "run_id": r.id,
        "agent_type": r.agent_type,
        "status": r.status,
        "created_at": r.created_at.isoformat() if isinstance(r.created_at, datetime) else r.created_at,
        "output": json.loads(r.output_payload) if r.output_payload else None,
        "error": r.error_message,
    }
    return ApiResponse(data=serialized)
