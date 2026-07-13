"""
LangGraph AgentState — the shared state TypedDict passed between all agent nodes.
Every agent reads from and writes to this state within the graph.
"""

from typing import Annotated, Any, Dict, List, Optional, TypedDict

from langgraph.graph.message import add_messages


class AgentState(TypedDict):
    """Shared state flowing through the LangGraph agent pipeline."""

    # Run metadata
    run_id: str
    agent_type: str

    # Input context
    input_data: Dict[str, Any]

    # Conversation / LLM messages
    messages: Annotated[List[Any], add_messages]

    # Agent outputs (populated as the graph progresses)
    monitoring_result: Optional[Dict[str, Any]]
    investigation_result: Optional[Dict[str, Any]]
    policy_context: Optional[List[Dict[str, Any]]]
    action_plan: Optional[List[str]]
    generated_output: Optional[str]  # appeal letter, customer reply, etc.

    # Control flow
    detected_issues: List[Dict[str, Any]]
    severity: str  # low | medium | high | critical
    should_escalate: bool
    is_complete: bool
    error: Optional[str]
