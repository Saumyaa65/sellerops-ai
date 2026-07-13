"""
Policy Agent — retrieves relevant marketplace policies using RAG over Qdrant.
Enriches the investigation with policy context before planning.
"""

from agents.base_agent import BaseAgent
from agents.state import AgentState
from rag.retriever import PolicyRetriever
from utils.logger import logger


class PolicyAgent(BaseAgent):
    name = "policy_agent"

    def __init__(self) -> None:
        super().__init__()
        self._retriever = PolicyRetriever()

    async def run(self, state: AgentState) -> AgentState:
        run_id = state["run_id"]
        issues = state.get("detected_issues", [])

        if not issues:
            return {**state, "policy_context": []}  # type: ignore[return-value]

        # Build a query from the top issue types
        issue_types = [i["type"] for i in issues[:3]]
        query = f"seller policy for: {', '.join(issue_types)}"

        await self.emit_step(run_id, f"Retrieving marketplace policies for: {', '.join(issue_types)}")

        policy_chunks = await self._retriever.retrieve(
            query=query,
            marketplace=state.get("input_data", {}).get("marketplace", "meesho"),
            top_k=5,
        )

        await self.emit_step(run_id, f"Retrieved {len(policy_chunks)} policy references", {"count": len(policy_chunks)})

        return {**state, "policy_context": policy_chunks}  # type: ignore[return-value]
