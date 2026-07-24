import apiClient from "@/lib/api-client";
import type { AgentRun, AgentRunRequest } from "@/types/agent";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export const agentService = {
  /** Trigger a new agent pipeline run. */
  async triggerRun(body: AgentRunRequest): Promise<AgentRun> {
    const res = await apiClient.post<AgentRun>("/agents/run", body);
    console.info("[SellerOps run] POST /agents/run returned", {
      runId: res.data.run_id,
      agentType: res.data.agent_type,
      status: res.data.status,
    });
    return res.data;
  },

  /** List all agent runs. */
  async listRuns(): Promise<AgentRun[]> {
    const res = await apiClient.get<AgentRun[]>("/agents/");
    return res.data;
  },

  /** Get a specific agent run. */
  async getRun(runId: string): Promise<AgentRun> {
    console.info("[SellerOps run] GET /agents/{run_id}", { runId });
    const res = await apiClient.get<AgentRun>(`/agents/${runId}`);
    return res.data;
  },

  /** Returns the SSE stream URL for a run (consumed by useSSE hook). */
  getStreamUrl(runId: string): string {
    console.info("[SellerOps run] opening SSE stream", { runId });
    return `${API_URL}/api/v1/agents/${runId}/stream`;
  },
};
