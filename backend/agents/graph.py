"""
LangGraph orchestration graph — wires all agents into a directed pipeline.
The graph is compiled once at startup and reused across all runs.
"""

from langgraph.graph import END, START, StateGraph

from agents.state import AgentState
from agents.prevention_agent import PreventionAgent
from agents.monitoring_agent import MonitoringAgent
from agents.investigation_agent import InvestigationAgent
from agents.policy_agent import PolicyAgent
from agents.planning_agent import PlanningAgent
from agents.execution_agent import ExecutionAgent
from agents.learning_agent import LearningAgent

# Instantiate agents (singletons — LangGraph nodes are stateless callables)
_prevention = PreventionAgent()
_monitoring = MonitoringAgent()
_investigation = InvestigationAgent()
_policy = PolicyAgent()
_planning = PlanningAgent()
_execution = ExecutionAgent()
_learning = LearningAgent()


def _should_investigate(state: AgentState) -> str:
    """Conditional edge: if issues detected → investigate, else → end."""
    if state.get("detected_issues") and not state.get("error"):
        return "investigation"
    return END


def _should_escalate(state: AgentState) -> str:
    """Conditional edge: if escalation needed → planning, else → learning."""
    if state.get("should_escalate") and not state.get("error"):
        return "planning"
    return "learning"


def build_investigation_graph() -> StateGraph:
    """Build the full investigation agent graph."""
    graph = StateGraph(AgentState)

    # Nodes
    graph.add_node("monitoring", _monitoring)
    graph.add_node("investigation", _investigation)
    graph.add_node("policy", _policy)
    graph.add_node("planning", _planning)
    graph.add_node("execution", _execution)
    graph.add_node("learning", _learning)

    # Edges
    graph.add_edge(START, "monitoring")
    graph.add_conditional_edges("monitoring", _should_investigate, ["investigation", END])
    graph.add_edge("investigation", "policy")
    graph.add_conditional_edges("policy", _should_escalate, ["planning", "learning"])
    graph.add_edge("planning", "execution")
    graph.add_edge("execution", "learning")
    graph.add_edge("learning", END)

    return graph


def build_prevention_graph() -> StateGraph:
    """Build the listing prevention check graph."""
    graph = StateGraph(AgentState)
    graph.add_node("prevention", _prevention)
    graph.add_edge(START, "prevention")
    graph.add_edge("prevention", END)
    return graph


# Compile once at module load — these are the shared compiled graphs
investigation_graph = build_investigation_graph().compile()
prevention_graph = build_prevention_graph().compile()
