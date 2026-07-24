"""
Investigation Agent — performs root cause analysis on detected issues.
Uses Groq/Llama 3.1 to reason about patterns in seller data.
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
        ]        # Check Qdrant Memory Cache for existing matching investigation
        retrieved_from_memory = False
        retrieved_payload = None
        
        try:
            from services.qdrant_service import qdrant_service
            from rag.embedder import Embedder
            
            # Formulate query from issue types
            issue_types_str = " ".join(sorted([i['type'] for i in issues]))
            input_data = state.get("input_data", {})
            scenario_id = input_data.get("scenario_id")
            scenario_title = input_data.get("scenario_name") or input_data.get("scenario_id") or "General monitoring"
            logger.info(
                "[Memory] Search request | current_scenario_title=%r | query_text=%r",
                scenario_title,
                issue_types_str,
            )
            embedder = Embedder()
            query_vector = await embedder.embed(issue_types_str)
            
            await qdrant_service.ensure_collection(
                settings.qdrant_collection_memory,
                settings.embedding_dimension,
            )
            
            memory_results = await qdrant_service.search(
                collection_name=settings.qdrant_collection_memory,
                query_vector=query_vector,
                top_k=20,
            )
            
            matching_memory = None
            if memory_results:
                matching_memory = next(
                    (
                        result
                        for result in memory_results
                        if scenario_id and result["payload"].get("scenario_id") == scenario_id
                    ),
                    None,
                )
                # Keep the top semantic candidate for debugging when no exact
                # scenario match exists, but never reuse it.
                candidate = matching_memory or memory_results[0]
                candidate_payload = candidate["payload"]
                score = candidate["score"]
                retrieved_title = candidate_payload.get("scenario_title") or "Unknown (legacy memory)"
                candidate_scenario_id = candidate_payload.get("scenario_id")
                accepted = matching_memory is not None
                reason = (
                    f"exact scenario_id match: {scenario_id}"
                    if accepted
                    else f"scenario_id mismatch: current={scenario_id!r}, candidate={candidate_scenario_id!r}"
                )
                logger.info(
                    "[Memory] Candidate | current_scenario_title=%r | retrieved_memory_title=%r "
                    "| current_scenario_id=%r | retrieved_scenario_id=%r | retrieved_run_id=%s "
                    "| retrieved_issue_types=%s | similarity_score=%.4f "
                    "| accepted=%s | reason=%s",
                    scenario_title,
                    retrieved_title,
                    scenario_id,
                    candidate_scenario_id,
                    candidate_payload.get("run_id"),
                    candidate_payload.get("issue_types", []),
                    score,
                    accepted,
                    reason,
                )
            else:
                logger.info(
                    "[Memory] No candidate found | current_scenario_title=%r | query_text=%r | fresh_investigation=true",
                    scenario_title,
                    issue_types_str,
                )

            if (
                matching_memory
            ):
                retrieved_payload = matching_memory["payload"]
                retrieved_from_memory = True
                logger.info(
                    "AI Memory Hit! Reusing past investigation run_id=%s (score: %.2f; exact scenario_id match)",
                    retrieved_payload.get("run_id"),
                    matching_memory["score"],
                )
                await self.emit_step(run_id, "⚡ AI Memory Hit — retrieved existing root cause analysis from agent memory")
        except Exception as e:
            logger.warning(f"AI Memory Cache Check failed: {e}")

        if retrieved_from_memory and retrieved_payload:
            raw_analysis = retrieved_payload["root_cause_analysis"]
        else:
            raw_analysis = await groq_service.chat(
                messages,
                temperature=0.3,
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
            "retrieved_from_memory": retrieved_from_memory,
            "retrieved_memory_doc": retrieved_payload,
        }  # type: ignore[return-value]
