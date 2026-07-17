"""
Learning Agent — stores successful investigations into Qdrant for future RAG retrieval.
This makes the system smarter over time.
"""

import json
import uuid

from agents.base_agent import BaseAgent
from agents.state import AgentState
from rag.embedder import Embedder
from services.qdrant_service import qdrant_service
from config.settings import get_settings
from utils.logger import logger

settings = get_settings()


class LearningAgent(BaseAgent):
    name = "learning_agent"

    def __init__(self) -> None:
        super().__init__()
        self._embedder = Embedder()

    async def run(self, state: AgentState) -> AgentState:
        import time
        start_time = time.perf_counter()
        run_id = state["run_id"]

        if state.get("retrieved_from_memory"):
            await self.emit_step(run_id, "⚡ AI Memory Hit — skipping redundant memory storage")
            await self.emit(run_id, "completed", "Agent pipeline complete (Retrieved from AI Memory)", {"stored_in_memory": False})
            return {**state, "is_complete": True}  # type: ignore[return-value]

        await self.emit_step(run_id, "Storing investigation into agent memory...")

        investigation = state.get("investigation_result")
        generated_output = state.get("generated_output")
        issues = state.get("detected_issues", [])

        if not investigation or not generated_output:
            elapsed = (time.perf_counter() - start_time) * 1000
            await self.emit_step(run_id, "Nothing to store — skipping learning step")
            logger.info(f"[LearningAgent] Skipped memory storage. Total time: {elapsed:.2f}ms")
            await self.emit(run_id, "completed", "Agent pipeline complete (skipped store)", {"stored_in_memory": False})
            return {**state, "is_complete": True}  # type: ignore[return-value]

        # Build memory document
        memory_doc = {
            "run_id": run_id,
            "issue_types": [i["type"] for i in issues],
            "root_cause_analysis": investigation.get("raw", ""),
            "action_plan": state.get("action_plan", []),
            "generated_output": generated_output,
            "marketplace": state.get("input_data", {}).get("marketplace", "meesho"),
            "severity": state.get("severity", "low"),
        }

        text_to_embed = " ".join(sorted(memory_doc['issue_types']))

        stored = False
        try:
            t0 = time.perf_counter()
            vector = await self._embedder.embed(text_to_embed)
            t_embed = (time.perf_counter() - t0) * 1000
            logger.info(f"[LearningAgent] Embedding generated in {t_embed:.2f}ms")

            t0 = time.perf_counter()
            await qdrant_service.ensure_collection(
                settings.qdrant_collection_memory,
                settings.embedding_dimension,
            )
            t_col = (time.perf_counter() - t0) * 1000
            logger.info(f"[LearningAgent] Collection verified in {t_col:.2f}ms")

            t0 = time.perf_counter()
            await qdrant_service.upsert(
                collection_name=settings.qdrant_collection_memory,
                points=[{
                    "id": str(uuid.uuid4()),
                    "vector": vector,
                    "payload": memory_doc,
                }],
            )
            t_upsert = (time.perf_counter() - t0) * 1000
            logger.info(f"[LearningAgent] Upsert completed in {t_upsert:.2f}ms")

            await self.emit_step(run_id, "Investigation stored in agent memory ✓")
            stored = True
        except Exception as e:
            logger.warning(f"LearningAgent: Failed to store memory — {e}")
            await self.emit_step(run_id, f"Memory storage skipped: {e}")

        total_elapsed = (time.perf_counter() - start_time) * 1000
        logger.info(f"[LearningAgent] Memory store workflow finished. Total time: {total_elapsed:.2f}ms")

        await self.emit(run_id, "completed", "Agent pipeline complete", {"stored_in_memory": stored})

        return {**state, "is_complete": True}  # type: ignore[return-value]
