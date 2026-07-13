"""
Investigation Agent — performs root cause analysis on detected issues.
Uses Groq/Llama 3.3 to reason about patterns in seller data.
"""

import json
from agents.base_agent import BaseAgent
from agents.state import AgentState
from services.groq_service import groq_service
from config.settings import get_settings
from utils.logger import logger

settings = get_settings()

_SYSTEM_PROMPT = """You are SellerOps AI. Analyze marketplace issues and identify root causes. 
Respond ONLY with a valid JSON object matching the requested schema. Be extremely concise."""


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
                "content": f"""Analyze these issues:
{issues_summary}

Marketplace: {state.get('input_data', {}).get('marketplace', 'Meesho')}
Seller tier: {state.get('input_data', {}).get('seller_tier', 'Bronze')}

Output JSON with keys:
- primary_cause: A string summarizing the main root cause.
- contributing_factors: A list of strings outlining other factors.
- business_impact: An object containing:
    - description: A string summarizing the business risk.
    - estimated_impact: A string indicating the severity: "Low", "Medium", "High", or "Critical".
- immediate_actions: A list of strings outlining actions to take.
- confidence_score: A float between 0 and 1.""",
            },
        ]

        raw_analysis = await groq_service.chat(
            messages,
            temperature=0.3,
            model=settings.groq_model_light,
        )

        # Normalize the raw LLM response so the schema is 100% consistent across all scenarios
        normalized_data = {
            "primary_cause": "Unknown operational issue.",
            "contributing_factors": [],
            "business_impact": {
                "description": "High return rates or operational flags present a suspension risk.",
                "estimated_impact": "High"
            },
            "immediate_actions": [],
            "confidence_score": 0.8
        }
        
        try:
            clean_json = raw_analysis.strip()
            if clean_json.startswith("```"):
                lines = clean_json.split("\n")
                if lines[0].startswith("```json") or lines[0].startswith("```"):
                    clean_json = "\n".join(lines[1:-1]).strip()
            
            parsed = json.loads(clean_json)
            
            # Handle nested list issues structure if outputted
            if "issues" in parsed and isinstance(parsed["issues"], list) and len(parsed["issues"]) > 0:
                parsed = parsed["issues"][0]
                
            # Normalize primary_cause
            if "primary_cause" in parsed:
                pc = parsed["primary_cause"]
                if isinstance(pc, list):
                    normalized_data["primary_cause"] = ", ".join(str(x) for x in pc)
                elif isinstance(pc, dict):
                    normalized_data["primary_cause"] = pc.get("description", str(pc))
                else:
                    normalized_data["primary_cause"] = str(pc)
                    
            # Normalize contributing_factors
            if "contributing_factors" in parsed and isinstance(parsed["contributing_factors"], list):
                normalized_data["contributing_factors"] = [str(x) for x in parsed["contributing_factors"]]
                
            # Normalize business_impact
            if "business_impact" in parsed:
                bi = parsed["business_impact"]
                if isinstance(bi, dict):
                    normalized_data["business_impact"]["description"] = str(bi.get("description", bi.get("text", str(bi))))
                    normalized_data["business_impact"]["estimated_impact"] = str(bi.get("estimated_impact", bi.get("severity", bi.get("impact", "High"))))
                elif isinstance(bi, list):
                    normalized_data["business_impact"]["description"] = ", ".join(str(x) for x in bi)
                else:
                    normalized_data["business_impact"]["description"] = str(bi)
                    
            # Normalize immediate_actions
            if "immediate_actions" in parsed:
                ia = parsed["immediate_actions"]
                if isinstance(ia, list):
                    normalized_data["immediate_actions"] = [str(x) for x in ia]
                elif isinstance(ia, str):
                    normalized_data["immediate_actions"] = [x.strip() for x in ia.split("\n") if x.strip()]
                    
            # Normalize confidence_score
            if "confidence_score" in parsed:
                try:
                    normalized_data["confidence_score"] = float(parsed["confidence_score"])
                except ValueError:
                    pass
                    
            raw_analysis = json.dumps(normalized_data, indent=2)
        except Exception as e:
            logger.warning(f"Failed to normalize investigation JSON response: {e}. Raw response: {raw_analysis[:200]}...")
            # Fall back to structured JSON even on failure to guarantee frontend contract
            raw_analysis = json.dumps(normalized_data, indent=2)

        await self.emit_step(run_id, "Root cause analysis complete", {"analysis_length": len(raw_analysis)})

        return {
            **state,
            "investigation_result": {"raw": raw_analysis, "issues_analyzed": len(issues)},
        }  # type: ignore[return-value]

