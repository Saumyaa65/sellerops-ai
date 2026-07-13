import { create } from "zustand";
import type { AgentEvent, AgentRun } from "@/types/agent";

interface AgentStore {
  runs: AgentRun[];
  activeRunId: string | null;
  events: Record<string, AgentEvent[]>; // run_id → events

  setRuns: (runs: AgentRun[]) => void;
  addRun: (run: AgentRun) => void;
  updateRunStatus: (runId: string, status: AgentRun["status"]) => void;
  setActiveRun: (runId: string | null) => void;
  appendEvent: (runId: string, event: AgentEvent) => void;
  clearEvents: (runId: string) => void;
}

export const useAgentStore = create<AgentStore>((set) => ({
  runs: [],
  activeRunId: null,
  events: {},

  setRuns: (runs) => set({ runs }),

  addRun: (run) =>
    set((state) => ({ runs: [run, ...state.runs] })),

  updateRunStatus: (runId, status) =>
    set((state) => ({
      runs: state.runs.map((r) => (r.run_id === runId ? { ...r, status } : r)),
    })),

  setActiveRun: (runId) => set({ activeRunId: runId }),

  appendEvent: (runId, event) =>
    set((state) => ({
      events: {
        ...state.events,
        [runId]: [...(state.events[runId] ?? []), event],
      },
    })),

  clearEvents: (runId) =>
    set((state) => {
      const { [runId]: _, ...rest } = state.events;
      return { events: rest };
    }),
}));
