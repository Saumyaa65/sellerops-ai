"""
Planning Agent — generates a step-by-step action plan based on investigation + policy context.
"""

from agents.base_agent import BaseAgent
from agents.state import AgentState
from services.groq_service import groq_service

_SYSTEM_PROMPT = """You are SellerOps AI Planning Agent. 
Based on the root cause analysis and relevant marketplace policies, 
create a clear, prioritized, step-by-step action plan for the seller.

Each step should be specific, actionable, and achievable.
Format: Return a numbered list of actions only."""


class PlanningAgent(BaseAgent):
    name = "planning_agent"

    async def run(self, state: AgentState) -> AgentState:
        run_id = state["run_id"]
        await self.emit_step(run_id, "Generating action plan...")

        investigation = state.get("investigation_result", {})
        policy_context = state.get("policy_context", [])
        issues = state.get("detected_issues", [])

        policy_text = "\n".join(
            p.get("payload", {}).get("text", "") for p in policy_context[:3]
        ) or "No specific policy context available."

        messages = [
            {"role": "system", "content": _SYSTEM_PROMPT},
            {
                "role": "user",
                "content": f"""Root cause analysis:
{investigation.get('raw', 'No analysis available')}

Relevant marketplace policies:
{policy_text}

Issues summary:
{', '.join(i['type'] for i in issues)}

Generate a prioritized 5-7 step action plan to resolve these issues:""",
            },
        ]

        plan_text = await groq_service.chat(messages, temperature=0.4)
        action_plan = [line.strip() for line in plan_text.strip().split("\n") if line.strip()]

        await self.emit_step(run_id, f"Action plan ready — {len(action_plan)} steps", {"step_count": len(action_plan)})

        return {**state, "action_plan": action_plan}  # type: ignore[return-value]
