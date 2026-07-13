"""
Pydantic schemas for API request/response validation.
Separated from ORM models to keep API contracts independent of DB schema.
"""

from datetime import datetime
from typing import Any, Dict, Generic, List, Optional, TypeVar

from pydantic import BaseModel, Field

T = TypeVar("T")


# --------------------------------------------------------------------------- #
#  Generic API Wrappers
# --------------------------------------------------------------------------- #

class ApiResponse(BaseModel, Generic[T]):
    success: bool = True
    data: T
    message: Optional[str] = None


class ApiError(BaseModel):
    success: bool = False
    error: str
    detail: Optional[str] = None


# --------------------------------------------------------------------------- #
#  Agent Schemas
# --------------------------------------------------------------------------- #

class AgentRunRequest(BaseModel):
    agent_type: str = Field(..., description="One of: prevention, monitoring, investigation, planning, execution, learning")
    input_data: Dict[str, Any] = Field(default_factory=dict)


class AgentRunResponse(BaseModel):
    run_id: str
    agent_type: str
    status: str
    created_at: datetime


class AgentEvent(BaseModel):
    run_id: str
    event_type: str  # started | step | tool_call | completed | error
    agent_name: str
    message: str
    data: Optional[Dict[str, Any]] = None
    timestamp: datetime


# --------------------------------------------------------------------------- #
#  Listing Schemas
# --------------------------------------------------------------------------- #

class ListingIssue(BaseModel):
    field: str
    severity: str  # warning | error
    message: str


class ListingCheckResult(BaseModel):
    listing_id: str
    product_name: str
    issues: List[ListingIssue]
    overall_status: str  # ok | warning | error
    score: int = Field(ge=0, le=100)


# --------------------------------------------------------------------------- #
#  Investigation Schemas
# --------------------------------------------------------------------------- #

class InvestigationSummary(BaseModel):
    id: str
    issue_type: str
    marketplace: str
    severity: str
    resolution_status: str
    created_at: datetime


class InvestigationDetail(InvestigationSummary):
    run_id: Optional[str]
    root_cause: Optional[str]
    action_plan: Optional[str]
    generated_appeal: Optional[str]
    stored_in_memory: bool


# --------------------------------------------------------------------------- #
#  Policy Schemas
# --------------------------------------------------------------------------- #

class PolicyQueryRequest(BaseModel):
    query: str = Field(..., min_length=5, max_length=500)
    marketplace: Optional[str] = "meesho"
    top_k: int = Field(default=5, ge=1, le=20)


class PolicyQueryResult(BaseModel):
    query: str
    results: List[Dict[str, Any]]
    answer: Optional[str] = None


# --------------------------------------------------------------------------- #
#  Health Schema
# --------------------------------------------------------------------------- #

class HealthResponse(BaseModel):
    status: str = "ok"
    version: str
    environment: str
    services: Dict[str, str]
