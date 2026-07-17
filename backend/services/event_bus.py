"""
SSE Event Bus — manages per-run event queues for streaming to frontend.
Each agent run gets an asyncio Queue. The SSE endpoint reads from it.
"""

import asyncio
from collections import defaultdict
from typing import AsyncIterator, Dict

from utils.helpers import build_sse_message, utc_now_iso
from utils.logger import logger


class EventBus:
    def __init__(self) -> None:
        self._queues: Dict[str, asyncio.Queue] = {}

    def get_queue(self, run_id: str) -> asyncio.Queue:
        if run_id not in self._queues:
            self._queues[run_id] = asyncio.Queue()
        return self._queues[run_id]

    async def emit(self, run_id: str, event_type: str, data: dict) -> None:
        """Push an event onto the run's queue if the client is actively listening."""
        if run_id not in self._queues:
            # Client has disconnected or is not listening, skip putting items in queue
            logger.debug(f"EventBus.emit | run={run_id} has no active queue listener (skipping)")
            return
        payload = {**data, "timestamp": utc_now_iso(), "event_type": event_type}
        queue = self._queues[run_id]
        await queue.put(payload)
        logger.debug(f"EventBus.emit | run={run_id} event={event_type}")

    async def stream(self, run_id: str) -> AsyncIterator[str]:
        """
        Async generator that yields SSE-formatted strings.
        Yields a 'done' sentinel event to signal completion.
        """
        if run_id not in self._queues:
            self._queues[run_id] = asyncio.Queue()
        queue = self._queues[run_id]
        while True:
            event = await queue.get()
            event_type = event.get("event_type", "message")
            yield build_sse_message(event_type, event)
            if event_type in ("completed", "error"):
                break

    def cleanup(self, run_id: str) -> None:
        """Remove the queue after streaming is done."""
        self._queues.pop(run_id, None)


event_bus = EventBus()
