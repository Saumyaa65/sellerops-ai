"""
Execution Agent — generates appeal letters, customer responses, and seller actions.
This is the final output agent that produces seller-ready content.
"""

from agents.base_agent import BaseAgent
from agents.state import AgentState
from services.groq_service import groq_service

_SYSTEM_PROMPT = """You are SellerOps AI Execution Agent — an expert in drafting professional 
seller communications for Indian marketplaces (Meesho, Amazon, Flipkart).

You write:
- Appeal letters to marketplace teams
- Responses to negative customer reviews
- Policy violation dispute letters

Tone: Professional, factual, polite, and concise.
Language: Clear English suitable for marketplace support teams."""


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
        plan_summary = "\n".join(action_plan[:5]) if action_plan else "Review and resolve detected issues."

        messages = [
            {"role": "system", "content": _SYSTEM_PROMPT},
            {
                "role": "user",
                "content": f"""Write a professional appeal letter to {marketplace} support team for:

Issue: {primary_issue['type'].replace('_', ' ').title()}
Description: {primary_issue['message']}

Our action plan:
{plan_summary}

The letter should:
1. Acknowledge the issue
2. Explain the root cause briefly
3. Describe the corrective actions taken
4. Request reinstatement/resolution
5. Express commitment to compliance

Keep it under 300 words.""",
            },
        ]

        appeal_letter = await groq_service.chat(messages, temperature=0.6)

        await self.emit_step(run_id, "Appeal letter generated", {"word_count": len(appeal_letter.split())})

        return {**state, "generated_output": appeal_letter}  # type: ignore[return-value]
