"""
Investigation Agent — performs root cause analysis on detected issues.
Uses Groq/Llama 3.3 to reason about patterns in seller data.
"""

from agents.base_agent import BaseAgent
from agents.state import AgentState
from services.groq_service import groq_service
from utils.logger import logger

_SYSTEM_PROMPT = """You are SellerOps AI Investigation Agent — an expert in e-commerce seller operations 
for Indian marketplaces (Meesho, Amazon, Flipkart).

When given a list of detected operational issues and seller data, you:
1. Identify the most likely root cause
2. Determine contributing factors
3. Assess business impact
4. Suggest immediate next steps

Be concise, specific, and action-oriented. Format your output as structured JSON."""


class InvestigationAgent(BaseAgent):
    name = "investigation_agent"

    async def run(self, state: AgentState) -> AgentState:
        run_id = state["run_id"]
        issues = state.get("detected_issues", [])

        if not issues:
            await self.emit_step(run_id, "No issues to investigate")
            return {**state, "investigation_result": None}  # type: ignore[return-value]

        await self.emit_step(run_id, f"Investigating {len(issues)} detected issue(s)...")

        issues_summary = "\n".join(
            f"- [{i['severity'].upper()}] {i['type']}: {i['message']}"
            for i in issues
        )

        messages = [
            {"role": "system", "content": _SYSTEM_PROMPT},
            {
                "role": "user",
                "content": f"""Analyze the following operational issues detected for this seller:

{issues_summary}

Additional context:
- Marketplace: {state.get('input_data', {}).get('marketplace', 'Meesho')}
- Seller tier: {state.get('input_data', {}).get('seller_tier', 'Bronze')}

Provide a structured root cause analysis with:
1. primary_cause
2. contributing_factors (list)
3. business_impact
4. immediate_actions (list of 3-5 steps)
5. confidence_score (0-1)
""",
            },
        ]

        raw_analysis = await groq_service.chat(messages, temperature=0.3)

        await self.emit_step(run_id, "Root cause analysis complete", {"analysis_length": len(raw_analysis)})

        return {
            **state,
            "investigation_result": {"raw": raw_analysis, "issues_analyzed": len(issues)},
        }  # type: ignore[return-value]
