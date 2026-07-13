"""
Execution Agent — generates appeal letters, customer responses, and seller actions.
This is the final output agent that produces seller-ready content.
"""

from agents.base_agent import BaseAgent
from agents.state import AgentState
from services.groq_service import groq_service

_SYSTEM_PROMPT = """You are SellerOps AI. Write a professional, concise, polite, and factual appeal letter. 
Tone: Professional and compliant."""


class ExecutionAgent(BaseAgent):
    name = "execution_agent"

    async def run(self, state: AgentState) -> AgentState:
        run_id = state["run_id"]
        await self.emit_step(run_id, "Generating seller communication and appeal...")

        issues = state.get("detected_issues", [])
        action_plan = state.get("action_plan", [])
        investigation = state.get("investigation_result", {})
        marketplace = state.get("input_data", {}).get("marketplace", "Meesho")

        primary_issue = issues[0] if issues else {"type": "general_issue", "message": "Operational issue detected"}
        plan_summary = "\n".join(action_plan[:3]) if action_plan else "Review and resolve issues."

        messages = [
            {"role": "system", "content": _SYSTEM_PROMPT},
            {
                "role": "user",
                "content": f"""Draft appeal to {marketplace} team:

Issue: {primary_issue['type'].replace('_', ' ').title()}
Details: {primary_issue['message']}

Corrective Action Plan:
{plan_summary}

Requirements:
- Under 250 words
- Acknowledge issue, explain root cause briefly, list corrective actions taken, and request reinstatement.""",
            },
        ]

        appeal_letter = await groq_service.chat(messages, temperature=0.6)

        await self.emit_step(run_id, "Appeal letter generated", {"word_count": len(appeal_letter.split())})

        return {**state, "generated_output": appeal_letter}  # type: ignore[return-value]
