import apiClient from "@/lib/api-client";
import type { AgentRun, AgentRunRequest } from "@/types/agent";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export const agentService = {
  /** Trigger a new agent pipeline run. */
  async triggerRun(body: AgentRunRequest): Promise<AgentRun> {
    const res = await apiClient.post<AgentRun>("/agents/run", body);
    return res.data;
  },

  /** List all agent runs. */
  async listRuns(): Promise<AgentRun[]> {
    const res = await apiClient.get<AgentRun[]>("/agents/");
    return res.data;
  },

  /** Get a specific agent run. */
  async getRun(runId: string): Promise<AgentRun> {
    const res = await apiClient.get<AgentRun>(`/agents/${runId}`);
    return res.data;
  },

  /** Returns the SSE stream URL for a run (consumed by useSSE hook). */
  getStreamUrl(runId: string): string {
    return `${API_URL}/api/v1/agents/${runId}/stream`;
  },
};
