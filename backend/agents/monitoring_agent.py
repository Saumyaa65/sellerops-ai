"""
Monitoring Agent — watches orders, returns, payouts and seller metrics.
Detects anomalies that require investigation.
"""

from agents.base_agent import BaseAgent
from agents.state import AgentState
from services.data_service import get_orders, get_payout_anomalies, get_seller_metrics
from utils.logger import logger


class MonitoringAgent(BaseAgent):
    name = "monitoring_agent"

    # Thresholds for anomaly detection
    HIGH_RETURN_RATE_THRESHOLD = 0.15  # 15%
    LOW_RATING_THRESHOLD = 3.5
    PAYOUT_ANOMALY_COUNT_THRESHOLD = 2

    async def run(self, state: AgentState) -> AgentState:
        run_id = state["run_id"]
        input_data = state.get("input_data", {})
        scenario_id = input_data.get("scenario_id")

        detected_issues = []
        severity = "low"

        if scenario_id:
            from services.data_service import get_scenario_by_id
            scenario = get_scenario_by_id(scenario_id)
            if scenario:
                await self.emit_step(run_id, f"Executing investigation scenario {scenario_id}: {scenario['name']}...")
                for issue_type in scenario.get("expected_issues", []):
                    detected_issues.append({
                        "type": issue_type,
                        "severity": scenario.get("expected_severity", "medium"),
                        "message": f"Issue: {issue_type.replace('_', ' ').title()}. Scenario context: {scenario['context']}. {scenario['description']}",
                        "data": {"scenario_id": scenario_id, "marketplace": scenario.get("trigger_data", {}).get("marketplace")},
                    })
                severity = scenario.get("expected_severity", "medium")
            else:
                await self.emit_step(run_id, f"Scenario {scenario_id} not found. Defaulting to general monitoring...")
        
        if not detected_issues:
            await self.emit_step(run_id, "Scanning orders, returns, and payouts for anomalies...")
            
            # Check return rate
            orders = get_orders()
            returns = [o for o in orders if o.get("is_return")]
            return_rate = len(returns) / max(len(orders), 1)

            if return_rate > self.HIGH_RETURN_RATE_THRESHOLD:
                detected_issues.append({
                    "type": "high_return_rate",
                    "severity": "high",
                    "message": f"Return rate {return_rate:.1%} exceeds threshold {self.HIGH_RETURN_RATE_THRESHOLD:.1%}",
                    "data": {"return_rate": return_rate, "return_count": len(returns)},
                })
                severity = "high"

            # Check seller metrics
            metrics = get_seller_metrics()
            rating = metrics.get("seller_rating", 5.0)
            if rating < self.LOW_RATING_THRESHOLD:
                detected_issues.append({
                    "type": "low_seller_rating",
                    "severity": "medium",
                    "message": f"Seller rating {rating} is below acceptable threshold {self.LOW_RATING_THRESHOLD}",
                    "data": {"rating": rating},
                })
                if severity == "low":
                    severity = "medium"

            # Check payout anomalies
            anomalies = get_payout_anomalies()
            if len(anomalies) >= self.PAYOUT_ANOMALY_COUNT_THRESHOLD:
                detected_issues.append({
                    "type": "payout_anomalies",
                    "severity": "critical",
                    "message": f"{len(anomalies)} payout discrepancies detected — possible settlement error",
                    "data": {"anomaly_count": len(anomalies)},
                })
                severity = "critical"

        should_escalate = severity in ("high", "critical")

        await self.emit_step(
            run_id,
            f"Monitoring complete — {len(detected_issues)} issues detected (severity: {severity})",
            {"issue_count": len(detected_issues), "severity": severity},
        )

        return {
            **state,
            "detected_issues": detected_issues,
            "severity": severity,
            "should_escalate": should_escalate,
        }  # type: ignore[return-value]
