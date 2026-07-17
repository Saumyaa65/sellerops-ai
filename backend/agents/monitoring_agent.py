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
        seller_id = input_data.get("seller_id", "SELLER-IND-001")

        detected_issues = []
        severity = "low"

        if scenario_id:
            from services.data_service import get_scenario_by_id
            scenario = await get_scenario_by_id(scenario_id, seller_id)
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
            orders = await get_orders(seller_id)
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
            metrics = await get_seller_metrics(seller_id)
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
            anomalies = await get_payout_anomalies(seller_id)
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

        email_sent = False
        critical_issues = [i for i in detected_issues if i.get("severity") == "critical"]
        if critical_issues:
            issue = critical_issues[0]
            issue_title = issue["type"].replace("_", " ").title()
            description = issue.get("message", "A critical operational issue has been detected.")
            business_impact = "Potential revenue loss, account suspension risk, or payout settlement delay."
            
            sc_id = None
            if scenario_id:
                sc_id = scenario_id
            elif issue["type"] == "payout_anomalies":
                sc_id = "SCN-009"
            elif issue["type"] == "high_return_rate":
                sc_id = "SCN-001"

            try:
                from utils.email import send_critical_alert_email
                import asyncio
                asyncio.create_task(
                    send_critical_alert_email(
                        issue_title=issue_title,
                        description=description,
                        business_impact=business_impact,
                        scenario_id=sc_id,
                        appeal_available=True
                    )
                )
                await self.emit_step(run_id, "📧 Seller notified successfully")
                email_sent = True
            except Exception as mail_err:
                logger.error(f"Failed to launch email task: {mail_err}")

        return {
            **state,
            "detected_issues": detected_issues,
            "severity": severity,
            "should_escalate": should_escalate,
            "email_sent": email_sent,
        }  # type: ignore[return-value]
