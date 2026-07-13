"""
Planning Agent — generates a step-by-step action plan based on investigation + policy context.
"""

from agents.base_agent import BaseAgent
from agents.state import AgentState
from services.groq_service import groq_service
from config.settings import get_settings
from utils.logger import logger

settings = get_settings()

_SYSTEM_PROMPT = """You are SellerOps AI. Create a prioritized, numbered step-by-step action plan to resolve the seller's issue. 
Return only a numbered list of actions."""


async def summarize_policies(policy_context: list) -> str:
    """Summarize policy excerpts to save input tokens."""
    if not policy_context:
        return "No specific policy context available."
    
    texts = [p.get("payload", {}).get("text", "") for p in policy_context]
    combined_text = "\n\n".join(t for t in texts if t)
    if not combined_text.strip():
        return "No specific policy context available."
        
    prompt = [
        {"role": "system", "content": "Summarize key marketplace policy rules and penalties in under 100 words."},
        {"role": "user", "content": f"Policy Excerpts:\n{combined_text}"}
    ]
    try:
        summary = await groq_service.chat(
            messages=prompt,
            temperature=0.1,
            max_tokens=150,
            model=settings.groq_model_light
        )
        return summary.strip()
    except Exception as e:
        logger.warning(f"Failed to summarize policies: {e}. Falling back to truncation.")
        return combined_text[:500] + "..."


class PlanningAgent(BaseAgent):
    name = "planning_agent"

    async def run(self, state: AgentState) -> AgentState:
        run_id = state["run_id"]
        await self.emit_step(run_id, "Generating action plan...")

        investigation = state.get("investigation_result", {})
        policy_context = state.get("policy_context", [])
        issues = state.get("detected_issues", [])

        # Summarize policy chunks to optimize tokens
        policy_summary = await summarize_policies(policy_context)

        messages = [
            {"role": "system", "content": _SYSTEM_PROMPT},
            {
                "role": "user",
                "content": f"""Root cause analysis:
{investigation.get('raw', 'No analysis available')}

Relevant policies summary:
{policy_summary}

Issues: {', '.join(i['type'] for i in issues)}

Create a 5-step action plan to resolve this:""",
            },
        ]

        plan_text = await groq_service.chat(
            messages,
            temperature=0.4,
            model=settings.groq_model_light,
        )
        action_plan = [line.strip() for line in plan_text.strip().split("\n") if line.strip()]

        await self.emit_step(run_id, f"Action plan ready — {len(action_plan)} steps", {"step_count": len(action_plan)})

        return {**state, "action_plan": action_plan}  # type: ignore[return-value]
