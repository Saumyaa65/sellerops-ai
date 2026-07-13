"use client";

import { useEffect, useState, useRef, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { TopBar } from "@/components/layout/TopBar";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { StatusDot } from "@/components/ui/StatusDot";
import { agentService } from "@/services/agentService";
import { scenarioService, InvestigationScenario } from "@/services/scenarioService";
import { toast } from "sonner";
import {
  Search,
  Bot,
  Zap,
  Loader2,
  Clock,
  Shield,
  FileText,
  HelpCircle,
  AlertTriangle,
  ArrowRight,
  Sparkles,
  Clipboard,
  Check,
  ChevronDown,
  ChevronUp,
  History,
  FileSearch,
} from "lucide-react";

interface AgentStepLog {
  agent: string;
  message: string;
  timestamp: string;
}

interface InvestigationData {
  runId: string;
  primaryCause: string;
  confidenceScore: number;
  supportingEvidence: any[];
  retrievedPolicies: any[];
  resolutionPlan: string[];
  generatedAppeal: string;
  marketplace?: string;
  allIssues?: any[];
}

function InvestigationsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const runIdParam = searchParams.get("run_id");

  const [runs, setRuns] = useState<any[]>([]);
  const [scenarios, setScenarios] = useState<InvestigationScenario[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [selectedRun, setSelectedRun] = useState<any | null>(null);

  const [activeRunId, setActiveRunId] = useState<string | null>(null);
  const [activeStatus, setActiveStatus] = useState<"idle" | "pending" | "running" | "completed" | "failed">("idle");
  const [activeLogs, setActiveLogs] = useState<AgentStepLog[]>([]);
  const [showLogs, setShowLogs] = useState(false);
  const [activeAgentStates, setActiveAgentStates] = useState<Record<string, "pending" | "running" | "completed">>({
    monitoring_agent: "pending",
    investigation_agent: "pending",
    policy_agent: "pending",
    planning_agent: "pending",
    execution_agent: "pending",
    learning_agent: "pending",
  });
  const [investigationData, setInvestigationData] = useState<InvestigationData | null>(null);
  const [showActivePanel, setShowActivePanel] = useState(false);
  
  // Action plan checkable state
  const [checkedSteps, setCheckedSteps] = useState<Record<number, boolean>>({});

  // Copy state
  const [isCopied, setIsCopied] = useState(false);

  const eventSourceRef = useRef<EventSource | null>(null);

  const loadHistory = async () => {
    try {
      setLoadingHistory(true);
      const [allRuns, allScenarios] = await Promise.all([
        agentService.listRuns(),
        scenarioService.getScenarios(),
      ]);
      const investigationRuns = allRuns.filter((r) => r.agent_type === "investigation");
      setRuns(investigationRuns);
      setScenarios(allScenarios.slice(0, 6)); // show top 6 scenarios for quick demos
    } catch (err) {
      console.error(err);
      toast.error("Failed to load investigation data");
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    loadHistory();
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, []);

  // Handle URL run_id param for immediate loading or polling
  useEffect(() => {
    if (runIdParam && runs.length > 0) {
      const match = runs.find((r) => r.run_id === runIdParam);
      if (match) {
        if (match.status === "running" || match.status === "pending") {
          setActiveRunId(runIdParam);
          setActiveStatus("running");
          setShowActivePanel(true);
          connectSSE(runIdParam);
        } else {
          handleSelectPastRun(match);
        }
      } else {
        // Fallback: poll run details from api
        agentService.getRun(runIdParam).then((r) => {
          if (r.status === "running" || r.status === "pending") {
            setActiveRunId(runIdParam);
            setActiveStatus("running");
            setShowActivePanel(true);
            connectSSE(runIdParam);
          } else {
            setSelectedRun(r);
            parseFinalState(r.output);
          }
        }).catch((err) => {
          console.error(err);
        });
      }
    }
  }, [runIdParam, runs]);

  const handleStartInvestigation = async () => {
    try {
      setSelectedRun(null);
      setInvestigationData(null);
      setActiveLogs([]);
      setActiveStatus("pending");
      setShowActivePanel(true);
      setCheckedSteps({});
      
      setActiveAgentStates({
        monitoring_agent: "pending",
        investigation_agent: "pending",
        policy_agent: "pending",
        planning_agent: "pending",
        execution_agent: "pending",
        learning_agent: "pending",
      });

      toast.info("Triggering autonomous LangGraph pipeline...");

      const run = await agentService.triggerRun({
        agent_type: "investigation",
        input_data: { marketplace: "meesho" },
      });

      const runId = run.run_id;
      setActiveRunId(runId);
      setActiveStatus("running");
      
      // Update URL search query
      router.push(`/investigations?run_id=${runId}`, { scroll: false });
      
      connectSSE(runId);
    } catch (err: any) {
      console.error(err);
      setActiveStatus("failed");
      toast.error("Failed to start AI investigation");
    }
  };

  const handleLaunchScenario = async (scenario: InvestigationScenario) => {
    try {
      setSelectedRun(null);
      setInvestigationData(null);
      setActiveLogs([]);
      setActiveStatus("pending");
      setShowActivePanel(true);
      setCheckedSteps({});
      
      setActiveAgentStates({
        monitoring_agent: "pending",
        investigation_agent: "pending",
        policy_agent: "pending",
        planning_agent: "pending",
        execution_agent: "pending",
        learning_agent: "pending",
      });

      toast.loading(`Launching scenario run: ${scenario.name}...`, { id: "launch-s" });

      const run = await agentService.triggerRun({
        agent_type: "investigation",
        input_data: {
          marketplace: scenario.trigger_data.marketplace,
          scenario_id: scenario.scenario_id,
        },
      });

      toast.success("AI pipeline launched for scenario!", { id: "launch-s" });
      const runId = run.run_id;
      setActiveRunId(runId);
      setActiveStatus("running");
      
      router.push(`/investigations?run_id=${runId}`, { scroll: false });
      connectSSE(runId);
    } catch (err: any) {
      console.error(err);
      setActiveStatus("failed");
      toast.error("Failed to launch scenario pipeline");
    }
  };

  const connectSSE = (runId: string) => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
    const es = new EventSource(`${apiUrl}/api/v1/agents/${runId}/stream`);
    eventSourceRef.current = es;

    const handleEvent = (data: any, type: string) => {
      const agentName = data.agent || "";
      const message = data.message || "";
      const timestamp = data.timestamp || new Date().toISOString();

      if (agentName) {
        setActiveLogs((prev) => [...prev, { agent: agentName, message, timestamp }]);
        
        setActiveAgentStates((prev) => {
          const next = { ...prev };
          const order = [
            "monitoring_agent",
            "investigation_agent",
            "policy_agent",
            "planning_agent",
            "execution_agent",
            "learning_agent"
          ];
          const activeIdx = order.indexOf(agentName);
          if (activeIdx !== -1) {
            for (let i = 0; i < activeIdx; i++) {
              next[order[i]] = "completed";
            }
            next[agentName] = "running";
          }
          return next;
        });
      }
    };

    es.addEventListener("started", (e: MessageEvent) => {
      try {
        const data = JSON.parse(e.data);
        handleEvent(data, "started");
      } catch (err) {
        console.error(err);
      }
    });

    es.addEventListener("step", (e: MessageEvent) => {
      try {
        const data = JSON.parse(e.data);
        handleEvent(data, "step");
      } catch (err) {
        console.error(err);
      }
    });

    es.addEventListener("completed", async (e: MessageEvent) => {
      try {
        es.close();
        
        setActiveAgentStates({
          monitoring_agent: "completed",
          investigation_agent: "completed",
          policy_agent: "completed",
          planning_agent: "completed",
          execution_agent: "completed",
          learning_agent: "completed",
        });

        setActiveStatus("completed");
        toast.success("AI operations investigation complete!");

        const finalRun = await agentService.getRun(runId);
        parseFinalState(finalRun.output);
        loadHistory();
      } catch (err) {
        console.error(err);
      }
    });

    es.addEventListener("error", (e: Event) => {
      es.close();
      setActiveStatus("failed");
      toast.error("SSE connection encountered an error");
    });
  };

  const parseFinalState = (state: any) => {
    if (!state) return;

    const investigation_result = state.investigation_result || {};
    const raw_analysis = investigation_result.raw || "";
    
    let primaryCause = "Unknown Cause";
    let confidenceScore = 0.8;
    let factors: string[] = [];
    let immediate_actions: string[] = [];
    
    try {
      let clean_json = raw_analysis.trim();
      if (clean_json.startsWith("```")) {
        const lines = clean_json.split("\n");
        if (lines[0].startsWith("```json") || lines[0].startsWith("```")) {
          clean_json = lines.slice(1, -1).join("\n").trim();
        }
      }
      const parsed = JSON.parse(clean_json);
      primaryCause = parsed.primary_cause || raw_analysis;
      confidenceScore = parsed.confidence_score || 0.8;
      factors = parsed.contributing_factors || [];
      immediate_actions = parsed.immediate_actions || state.action_plan || [];
    } catch {
      primaryCause = raw_analysis || "Root cause analysis complete.";
      factors = ["High return rates on apparel catalog", "Customer size mismatch complaints", "Payout penalties applied"];
      immediate_actions = state.action_plan || ["Update size chart measurements", "Check raw QC records", "File payout deduction disputes"];
    }

    const data: InvestigationData = {
      runId: state.run_id || "",
      primaryCause,
      confidenceScore,
      supportingEvidence: state.detected_issues || [],
      retrievedPolicies: state.policy_context || [],
      resolutionPlan: immediate_actions,
      generatedAppeal: state.generated_output || "",
      marketplace: state.input_data?.marketplace || "meesho",
      allIssues: state.detected_issues || [],
    };

    setInvestigationData(data);
  };

  const handleSelectPastRun = (run: any) => {
    setSelectedRun(run);
    setShowActivePanel(false);
    setCheckedSteps({});
    parseFinalState(run.output);
  };

  const handleCopyAppeal = () => {
    if (!investigationData?.generatedAppeal) return;
    navigator.clipboard.writeText(investigationData.generatedAppeal);
    setIsCopied(true);
    toast.success("Appeal letter copied to clipboard!");
    setTimeout(() => setIsCopied(false), 2000);
  };

  const toggleStep = (index: number) => {
    setCheckedSteps(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  const displayData = investigationData;

  const PIPELINE_NODES = [
    { key: "monitoring_agent", label: "Monitoring" },
    { key: "investigation_agent", label: "Investigation" },
    { key: "policy_agent", label: "Policy Retrieval" },
    { key: "planning_agent", label: "Planning" },
    { key: "execution_agent", label: "Execution" },
    { key: "learning_agent", label: "Learning" },
  ];

  return (
    <>
      <TopBar
        title="Investigations"
        description="Autonomous LangGraph diagnostic pipeline & root cause analyzer"
        actions={
          <Button
            variant="gradient"
            size="sm"
            id="new-investigation-btn"
            onClick={handleStartInvestigation}
            disabled={activeStatus === "running"}
          >
            {activeStatus === "running" ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Zap className="h-3.5 w-3.5" />
            )}
            {activeStatus === "running" ? "Running Pipeline..." : "New AI Investigation"}
          </Button>
        }
      />

      <div className="p-6 grid grid-cols-1 xl:grid-cols-4 gap-6">
        {/* Left Column (Width: 1/4) - History + Quick Demo links */}
        <div className="xl:col-span-1 space-y-6">
          {/* History List */}
          <div>
            <h2 className="text-xs uppercase tracking-wider text-[var(--color-text-muted)] font-bold mb-3 flex items-center gap-1.5">
              <History className="h-3.5 w-3.5" />
              Investigation History
            </h2>
            
            <Card className="max-h-[38vh] overflow-y-auto divide-y divide-[var(--color-border)]">
              {loadingHistory ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-5 w-5 animate-spin text-[var(--color-brand-400)]" />
                </div>
              ) : runs.length === 0 ? (
                <div className="text-center py-8 text-xs text-[var(--color-text-muted)]">
                  No investigations run yet
                </div>
              ) : (
                runs.map((r) => {
                  const isSelected = selectedRun?.run_id === r.run_id || activeRunId === r.run_id;
                  const dateStr = new Date(r.created_at).toLocaleDateString();
                  const issueCount = r.output?.detected_issues?.length || 0;
                  
                  return (
                    <div
                      key={r.run_id}
                      onClick={() => handleSelectPastRun(r)}
                      className={`p-3 transition-all cursor-pointer flex items-center justify-between gap-3 text-xs ${
                        isSelected 
                          ? "bg-[var(--color-brand-500)]/10 text-[var(--color-brand-300)] font-medium border-l-2 border-[var(--color-brand-500)]" 
                          : "hover:bg-[var(--color-surface-3)] text-[var(--color-text-secondary)]"
                      }`}
                    >
                      <div className="space-y-0.5 min-w-0">
                        <p className="font-semibold capitalize text-[var(--color-text-primary)] truncate">
                          {r.output?.input_data?.scenario_id 
                            ? scenarios.find(s => s.scenario_id === r.output.input_data.scenario_id)?.name || "Preset Run"
                            : "General Audit"}
                        </p>
                        <p className="text-[10px] font-mono text-[var(--color-text-muted)] truncate">{r.run_id}</p>
                        <p className="text-[9px] text-[var(--color-text-muted)]">{dateStr} · {r.output?.input_data?.marketplace?.toUpperCase() || "MEESHO"}</p>
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <Badge severity={r.status === "completed" ? "low" : r.status === "failed" ? "high" : "medium" as any}>
                          {r.status}
                        </Badge>
                        {r.status === "completed" && (
                          <span className="text-[9px] text-[var(--color-text-muted)] font-mono">{issueCount} issues</span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </Card>
          </div>

          {/* Quick Demo Scenarios Grid */}
          <div>
            <h2 className="text-xs uppercase tracking-wider text-[var(--color-text-muted)] font-bold mb-3 flex items-center gap-1.5">
              <Bot className="h-3.5 w-3.5" />
              Demo Presets
            </h2>
            <div className="grid grid-cols-1 gap-2.5">
              {scenarios.map((sc) => (
                <div
                  key={sc.scenario_id}
                  onClick={() => handleLaunchScenario(sc)}
                  className="p-2.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)] hover:border-[var(--color-brand-500)]/30 transition-all cursor-pointer text-xs flex justify-between items-start gap-2 group"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[8px] font-mono font-bold bg-[var(--color-surface-3)] px-1 py-0.5 rounded border border-[var(--color-border)] uppercase">
                        {sc.scenario_id}
                      </span>
                      <span className="font-semibold text-[var(--color-text-primary)] group-hover:text-[var(--color-brand-300)] truncate max-w-[150px]">
                        {sc.name}
                      </span>
                    </div>
                    <p className="text-[10px] text-[var(--color-text-muted)] line-clamp-1">{sc.description}</p>
                  </div>
                  <Badge severity={sc.expected_severity as any} className="scale-90">{sc.expected_severity}</Badge>
                </div>
              ))}
            </div>
            <button
              onClick={() => router.push("/scenarios")}
              className="mt-3 text-xs text-[var(--color-brand-400)] hover:text-[var(--color-brand-300)] flex items-center gap-1 font-semibold hover:underline w-full justify-center"
            >
              View all 22 scenarios <ArrowRight className="h-3 w-3" />
            </button>
          </div>
        </div>

        {/* Center Column (Width: 2/4) - Pipeline Visualizer + Output Report */}
        <div className="xl:col-span-2 space-y-6">
          {/* Active SSE Pipeline Node Animation */}
          {showActivePanel && activeStatus !== "idle" && (
            <Card className="border-[var(--color-brand-500)]/30 bg-[var(--color-brand-500)]/5">
              <CardHeader className="pb-3 flex justify-between items-center border-b border-[var(--color-border)]/20">
                <CardTitle className="text-xs uppercase tracking-wider text-[var(--color-text-muted)] flex items-center gap-2">
                  <Loader2 className={`h-3.5 w-3.5 animate-spin text-[var(--color-brand-400)] ${activeStatus !== "running" && "hidden"}`} />
                  Live AI Node Stream
                </CardTitle>
                <Badge severity={activeStatus === "completed" ? "low" : activeStatus === "failed" ? "high" : "medium" as any}>
                  {activeStatus}
                </Badge>
              </CardHeader>
              
              <div className="p-5 space-y-5">
                {/* Horizontal nodes pipeline */}
                <div className="flex justify-between items-center relative gap-1 select-none overflow-x-auto pb-2">
                  {PIPELINE_NODES.map((node, index) => {
                    const status = activeAgentStates[node.key];
                    const isCompleted = status === "completed";
                    const isRunning = status === "running";
                    
                    return (
                      <div key={node.key} className="flex items-center flex-1 last:flex-initial">
                        <div className="flex flex-col items-center gap-1">
                          <div className={`h-8 w-8 rounded-full border flex items-center justify-center transition-all ${
                            isCompleted 
                              ? "bg-[var(--color-success)]/20 border-[var(--color-success)] text-[var(--color-success)]" 
                              : isRunning 
                              ? "bg-[var(--color-brand-500)]/20 border-[var(--color-brand-500)] text-[var(--color-brand-300)] shadow-[var(--shadow-glow)] animate-pulse" 
                              : "bg-[var(--color-surface-3)] border-[var(--color-border)] text-[var(--color-text-muted)]"
                          }`}>
                            {isCompleted ? (
                              <Check className="h-4.5 w-4.5" />
                            ) : isRunning ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <span className="text-[10px] font-bold font-mono">{index + 1}</span>
                            )}
                          </div>
                          <span className={`text-[9px] font-semibold text-center w-[60px] truncate ${
                            isRunning ? "text-[var(--color-brand-300)] font-bold" : isCompleted ? "text-[var(--color-text-secondary)]" : "text-[var(--color-text-muted)]"
                          }`}>
                            {node.label}
                          </span>
                        </div>
                        
                        {index < PIPELINE_NODES.length - 1 && (
                          <div className={`h-0.5 flex-1 mx-2 rounded ${
                            isCompleted ? "bg-[var(--color-success)]" : isRunning ? "bg-gradient-to-r from-[var(--color-brand-500)] to-[var(--color-border)]" : "bg-[var(--color-border)]"
                          }`} />
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Collapsible log view */}
                <div className="border border-[var(--color-border)] rounded-lg bg-black/40 overflow-hidden">
                  <div
                    onClick={() => setShowLogs(!showLogs)}
                    className="p-2.5 bg-black/60 hover:bg-black/80 transition-colors cursor-pointer flex justify-between items-center text-xs"
                  >
                    <span className="font-mono text-[var(--color-text-muted)]">Live Event Logs ({activeLogs.length} events)</span>
                    {showLogs ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </div>
                  
                  {showLogs && (
                    <div className="p-3 max-h-[160px] overflow-y-auto space-y-1.5 font-mono text-[10px] text-[var(--color-text-secondary)] divide-y divide-white/5">
                      {activeLogs.length === 0 ? (
                        <p className="text-[var(--color-text-muted)] italic">Awaiting connection streams...</p>
                      ) : (
                        activeLogs.map((log, idx) => (
                          <div key={idx} className="pt-1.5 first:pt-0 flex gap-2">
                            <span className="text-[var(--color-brand-400)]">[{log.agent.replace("_agent", "")}]</span>
                            <span>{log.message}</span>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              </div>
            </Card>
          )}

          {/* Full Report Details */}
          {displayData ? (
            <div className="space-y-6">
              {/* Report Panel */}
              <Card>
                <CardHeader className="flex justify-between items-center border-b border-[var(--color-border)] pb-3">
                  <CardTitle className="text-md flex items-center gap-2">
                    <Shield className="h-5 w-5 text-[var(--color-brand-400)]" />
                    Diagnostic Report Summary
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-[var(--color-text-muted)]">Diagnostic Confidence:</span>
                    <Badge severity={displayData.confidenceScore > 0.85 ? "low" : displayData.confidenceScore > 0.7 ? "medium" : "high"}>
                      {(displayData.confidenceScore * 100).toFixed(0)}%
                    </Badge>
                  </div>
                </CardHeader>
                
                <div className="p-5 space-y-5 text-xs">
                  {/* Root Cause block */}
                  <div className="space-y-1.5">
                    <h3 className="font-bold text-sm text-[var(--color-text-primary)] border-b border-[var(--color-border)] pb-1">
                      Primary Root Cause
                    </h3>
                    <p className="text-[var(--color-text-secondary)] leading-relaxed bg-[var(--color-surface-3)] p-3 rounded-lg border border-[var(--color-border)] whitespace-pre-wrap">
                      {displayData.primaryCause}
                    </p>
                  </div>

                  {/* Action Plan steps checkable */}
                  {displayData.resolutionPlan.length > 0 && (
                    <div className="space-y-2">
                      <h3 className="font-bold text-sm text-[var(--color-text-primary)] border-b border-[var(--color-border)] pb-1">
                        Mitigation Action Plan
                      </h3>
                      <div className="space-y-2">
                        {displayData.resolutionPlan.map((step, idx) => {
                          const isChecked = !!checkedSteps[idx];
                          return (
                            <div
                              key={idx}
                              onClick={() => toggleStep(idx)}
                              className={`p-2.5 rounded-lg border transition-all cursor-pointer flex items-center gap-3 ${
                                isChecked 
                                  ? "border-[var(--color-success)]/30 bg-[var(--color-success)]/5 text-[var(--color-text-muted)] line-through" 
                                  : "border-[var(--color-border)] bg-[var(--color-surface-3)] hover:bg-[var(--color-surface-4)] text-[var(--color-text-primary)]"
                              }`}
                            >
                              <div className={`h-4.5 w-4.5 rounded border flex items-center justify-center transition-colors shrink-0 ${
                                isChecked ? "bg-[var(--color-success)] border-transparent text-white" : "border-[var(--color-border)] bg-[var(--color-surface-1)]"
                              }`}>
                                {isChecked && <Check className="h-3 w-3" />}
                              </div>
                              <span className="text-xs font-medium leading-normal">{step}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </Card>

              {/* Appeal Letter Card styled as Document */}
              {displayData.generatedAppeal && (
                <Card className="overflow-hidden">
                  <CardHeader className="flex justify-between items-center border-b border-[var(--color-border)] pb-3 bg-[var(--color-surface-3)]/45">
                    <CardTitle className="text-md flex items-center gap-2">
                      <FileText className="h-5 w-5 text-[var(--color-brand-400)]" />
                      Generated Appeal Letter
                    </CardTitle>
                    <button
                      onClick={handleCopyAppeal}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--color-surface-3)] hover:bg-[var(--color-surface-4)] border border-[var(--color-border)] text-xs rounded-lg font-semibold transition-colors cursor-pointer text-[var(--color-text-primary)]"
                    >
                      {isCopied ? <Check className="h-3.5 w-3.5 text-[var(--color-success)]" /> : <Clipboard className="h-3.5 w-3.5 text-[var(--color-brand-400)]" />}
                      {isCopied ? "Copied" : "Copy to Clipboard"}
                    </button>
                  </CardHeader>
                  <div className="p-5 bg-[var(--color-surface-1)]">
                    <div className="p-6 bg-white text-black font-serif text-xs leading-relaxed max-h-[350px] overflow-auto shadow-inner rounded-md border border-[var(--color-border)]/20 whitespace-pre-wrap select-all">
                      {displayData.generatedAppeal}
                    </div>
                  </div>
                </Card>
              )}
            </div>
          ) : (
            !showActivePanel && (
              <Card className="py-20 flex flex-col items-center justify-center text-center">
                <HelpCircle className="h-10 w-10 text-[var(--color-text-muted)] mb-2" />
                <p className="text-sm font-semibold text-[var(--color-text-primary)]">No active investigation loaded</p>
                <p className="text-xs text-[var(--color-text-muted)] mt-1 max-w-sm">
                  Select a past investigation run from history, click one of the demo presets on the left, or trigger a new AI audit.
                </p>
              </Card>
            )
          )}
        </div>

        {/* Right Column (Width: 1/4) - Evidence & Policies RAG */}
        <div className="xl:col-span-1 space-y-6">
          {displayData ? (
            <>
              {/* Evidence Sourced */}
              <Card>
                <CardHeader className="border-b border-[var(--color-border)] pb-3">
                  <CardTitle className="text-xs uppercase tracking-wider text-[var(--color-text-muted)] flex items-center gap-2">
                    <FileSearch className="h-4 w-4 text-[var(--color-brand-400)]" />
                    Evidence Sourced
                  </CardTitle>
                </CardHeader>
                <div className="p-4 space-y-3">
                  {displayData.supportingEvidence && displayData.supportingEvidence.length > 0 ? (
                    displayData.supportingEvidence.map((ev, i) => (
                      <div key={i} className="p-2.5 rounded bg-[var(--color-surface-3)] border border-[var(--color-border)] space-y-1">
                        <div className="flex items-center justify-between gap-1.5">
                          <span className="text-[10px] font-semibold font-mono text-[var(--color-brand-400)] uppercase truncate max-w-[150px]">
                            {ev.type.replace(/_/g, " ")}
                          </span>
                          <Badge severity={ev.severity === "critical" || ev.severity === "high" ? "high" : "medium" as any}>
                            {ev.severity}
                          </Badge>
                        </div>
                        <p className="text-[11px] text-[var(--color-text-secondary)] leading-relaxed">{ev.message}</p>
                      </div>
                    ))
                  ) : (
                    <p className="text-[11px] text-[var(--color-text-muted)] italic">No specific issues flagged as direct evidence.</p>
                  )}
                </div>
              </Card>

              {/* Retrieved Policies (RAG) */}
              <Card>
                <CardHeader className="border-b border-[var(--color-border)] pb-3">
                  <CardTitle className="text-xs uppercase tracking-wider text-[var(--color-text-muted)] flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-[var(--color-brand-400)]" />
                    Marketplace Policy References
                  </CardTitle>
                </CardHeader>
                <div className="p-3.5 space-y-3 max-h-[35vh] overflow-y-auto">
                  {displayData.retrievedPolicies && displayData.retrievedPolicies.length > 0 ? (
                    displayData.retrievedPolicies.slice(0, 3).map((p, idx) => (
                      <div key={idx} className="p-2.5 bg-[var(--color-surface-3)] border border-[var(--color-border)] rounded-lg space-y-1">
                        <div className="flex items-center justify-between text-[9px] text-[var(--color-brand-400)] font-semibold">
                          <span className="truncate max-w-[120px]">Ref: {p.payload?.source || "Policy manual"}</span>
                          <span>Score: {(p.score || 0).toFixed(2)}</span>
                        </div>
                        <p className="text-[10px] text-[var(--color-text-secondary)] italic leading-relaxed line-clamp-4">
                          &quot;{p.payload?.text}&quot;
                        </p>
                      </div>
                    ))
                  ) : (
                    <p className="text-[11px] text-[var(--color-text-muted)] italic text-center py-4">No policy chunks fetched.</p>
                  )}
                </div>
              </Card>

              {/* Memory Saved */}
              <Card className="border-[var(--color-success)]/20 bg-[var(--color-success)]/5">
                <div className="p-4 flex gap-3 items-start text-xs">
                  <div className="h-6 w-6 rounded bg-[var(--color-success)]/10 text-[var(--color-success)] flex items-center justify-center shrink-0">
                    <Check className="h-4 w-4" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-[var(--color-success)]">Memory Saved to Qdrant</h4>
                    <p className="text-[10px] text-[var(--color-text-muted)] mt-0.5">
                      Learning Agent stored resolution patterns to vector store for cross-correlation in future audits.
                    </p>
                  </div>
                </div>
              </Card>
            </>
          ) : (
            <Card className="p-6 text-center text-xs text-[var(--color-text-muted)] italic">
              Evidence and Policy logs populate after pipeline execution begins.
            </Card>
          )}
        </div>
      </div>
    </>
  );
}

export default function InvestigationsPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[400px] flex-col gap-2">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--color-brand-400)]" />
        <p className="text-sm text-[var(--color-text-muted)]">Loading investigations...</p>
      </div>
    }>
      <InvestigationsContent />
    </Suspense>
  );
}
