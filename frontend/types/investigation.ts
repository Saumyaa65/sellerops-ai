export type Severity = "low" | "medium" | "high" | "critical";
export type ResolutionStatus = "open" | "resolved" | "dismissed";

export interface Investigation {
  id: string;
  run_id?: string;
  issue_type: string;
  marketplace: string;
  severity: Severity;
  root_cause?: string;
  action_plan?: string[];
  generated_appeal?: string;
  resolution_status: ResolutionStatus;
  stored_in_memory: boolean;
  created_at: string;
}
