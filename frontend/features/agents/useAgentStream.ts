"use client";

import { useCallback } from "react";
import { useSSE } from "@/hooks/useSSE";
import { useAgentStore } from "@/store/useAgentStore";
import { agentService } from "@/services/agentService";
import type { AgentEvent } from "@/types/agent";

/**
 * Feature hook that connects an agent run to the SSE event bus.
 * Appends events to the agent store and updates the run status on completion.
 */
export function useAgentStream(runId: string | null) {
  const { appendEvent, updateRunStatus } = useAgentStore();

  const handleMessage = useCallback(
    (event: AgentEvent) => {
      if (!runId) return;
      appendEvent(runId, event);

      if (event.event_type === "completed") {
        updateRunStatus(runId, "completed");
      } else if (event.event_type === "error") {
        updateRunStatus(runId, "failed");
      } else if (event.event_type === "started" || event.event_type === "step") {
        updateRunStatus(runId, "running");
      }
    },
    [runId, appendEvent, updateRunStatus]
  );

  const streamUrl = runId ? agentService.getStreamUrl(runId) : null;

  return useSSE<AgentEvent>(streamUrl, {
    onMessage: handleMessage,
    enabled: !!runId,
  });
}
