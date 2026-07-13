"""
Base agent class — provides shared utilities for all agents in the graph.
"""

from abc import ABC, abstractmethod
from typing import Any, Dict

from agents.state import AgentState
from services.event_bus import event_bus
from utils.logger import logger


class BaseAgent(ABC):
    """Abstract base for all SellerOps agents."""

    name: str = "base_agent"

    async def emit(self, run_id: str, event_type: str, message: str, data: Dict[str, Any] | None = None) -> None:
        """Emit an SSE event for this agent step."""
        await event_bus.emit(
            run_id=run_id,
            event_type=event_type,
            data={
                "agent": self.name,
                "message": message,
                **(data or {}),
            },
        )

    async def emit_step(self, run_id: str, message: str, data: Dict[str, Any] | None = None) -> None:
        await self.emit(run_id, "step", message, data)

    async def emit_error(self, run_id: str, error: str) -> None:
        await self.emit(run_id, "error", error, {"error": error})

    @abstractmethod
    async def run(self, state: AgentState) -> AgentState:
        """Execute the agent's logic and return updated state."""
        ...

    async def __call__(self, state: AgentState) -> AgentState:
        """LangGraph node callable. Wraps run() with logging."""
        run_id = state.get("run_id", "unknown")
        logger.info(f"[{self.name}] Starting | run_id={run_id}")
        await self.emit(run_id, "step", f"{self.name} started")

        try:
            result = await self.run(state)
            logger.info(f"[{self.name}] Completed | run_id={run_id}")
            return result
        except Exception as e:
            logger.error(f"[{self.name}] Error | run_id={run_id} | {e}")
            await self.emit_error(run_id, str(e))
            return {**state, "error": str(e), "is_complete": True}  # type: ignore[return-value]
