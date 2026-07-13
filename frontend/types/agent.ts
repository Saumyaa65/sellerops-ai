export type AgentType =
  | "prevention"
  | "monitoring"
  | "investigation"
  | "policy"
  | "planning"
  | "execution"
  | "learning";

export type AgentStatus = "pending" | "running" | "completed" | "failed";

export type AgentEventType =
  | "started"
  | "step"
  | "tool_call"
  | "completed"
  | "error";

export interface AgentEvent {
  run_id: string;
  event_type: AgentEventType;
  agent: string;
  message: string;
  timestamp: string;
  data?: Record<string, unknown>;
}

export interface AgentRunRequest {
  agent_type: AgentType;
  input_data?: Record<string, unknown>;
}

export interface AgentRun {
  run_id: string;
  agent_type: AgentType;
  status: AgentStatus;
  created_at: string;
  output?: Record<string, unknown>;
  error?: string;
}
