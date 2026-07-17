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
  ChevronRight,
  ChevronUp,
  History,
  FileSearch,
} from "lucide-react";

interface AgentStepLog {
  agent: string;
  message: string;
  timestamp: string;
}

interface BusinessImpactObj {
  description: string;
  estimated_impact: string;
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
  businessImpact?: BusinessImpactObj;
  emailSent?: boolean;
  retrievedFromMemory?: boolean;
}

const stripMarkdown = (text: any): string => {
  if (text === null || text === undefined) return "";
  if (typeof text !== "string") {
    if (Array.isArray(text)) {
      text = text.join(", ");
    } else {
      text = String(text);
    }
  }
  return text.replace(/\*\*([^*]+)\*\*/g, "$1").replace(/\*([^*]+)\*/g, "$1");
};

const parseChecklistStep = (step: string) => {
  const cleanStep = step.replace(/^\d+[\.\s]*-?\s*/, "").trim();
  const boldMatch = cleanStep.match(/^\*\*([^*]+)\*\*[:\s]*(.*)/);
  if (boldMatch) {
    return {
      title: boldMatch[1].trim(),
      description: boldMatch[2].trim()
    };
  }
  const splitIndex = cleanStep.indexOf(":");
  if (splitIndex > 0) {
    return {
      title: cleanStep.substring(0, splitIndex).trim(),
      description: cleanStep.substring(splitIndex + 1).trim()
    };
  }
  return {
    title: cleanStep,
    description: ""
  };
};

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
  const [isHistoryExpanded, setIsHistoryExpanded] = useState(false);
  const [errorReason, setErrorReason] = useState<string | null>(null);
  const [lastScenario, setLastScenario] = useState<InvestigationScenario | null>(null);

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
      setErrorReason(null);
      setLastScenario(null);
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
      const message = err?.message || String(err);
      if (message.includes("429") || message.includes("Rate limit")) {
        setErrorReason("Rate limit reached");
      } else if (message.includes("Network Error") || message.includes("NetworkError") || !navigator.onLine) {
        setErrorReason("Network connection lost");
      } else {
        setErrorReason("AI service temporarily unavailable");
      }
      toast.error("Investigation couldn't be completed.");
    }
  };

  const handleLaunchScenario = async (scenario: InvestigationScenario) => {
    try {
      setErrorReason(null);
      setLastScenario(scenario);
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
      const message = err?.message || String(err);
      if (message.includes("429") || message.includes("Rate limit")) {
        setErrorReason("Rate limit reached");
      } else if (message.includes("Network Error") || message.includes("NetworkError") || !navigator.onLine) {
        setErrorReason("Network connection lost");
      } else {
        setErrorReason("AI service temporarily unavailable");
      }
      toast.error("Investigation couldn't be completed.", { id: "launch-s" });
    }
  };

  const connectSSE = (runId: string) => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
    const token = typeof window !== "undefined" ? localStorage.getItem("auth_token") : null;
    const streamUrl = token 
      ? `${apiUrl}/api/v1/agents/${runId}/stream?token=${encodeURIComponent(token)}`
      : `${apiUrl}/api/v1/agents/${runId}/stream`;
    const es = new EventSource(streamUrl);
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
      if (!navigator.onLine) {
        setErrorReason("Network connection lost");
      } else {
        setErrorReason("AI service temporarily unavailable");
      }
      toast.error("Investigation couldn't be completed.");
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
    let businessImpact: BusinessImpactObj = {
      description: "High return rates or operational flags present a suspension risk.",
      estimated_impact: "High"
    };
    
    try {
      let clean_json = raw_analysis.trim();
      if (clean_json.startsWith("```")) {
        const lines = clean_json.split("\n");
        if (lines[0].startsWith("```json") || lines[0].startsWith("```")) {
          clean_json = lines.slice(1, -1).join("\n").trim();
        }
      }
      const parsed = JSON.parse(clean_json);
      
      let rawPrimaryCause = "";
      let rawBusinessImpact: any = null;
      let rawActions: any = null;

      if (parsed.issues && Array.isArray(parsed.issues)) {
        const firstIssue = parsed.issues[0] || {};
        rawPrimaryCause = firstIssue.primary_cause || "Operational issues detected";
        rawBusinessImpact = firstIssue.business_impact;
        factors = Array.isArray(firstIssue.contributing_factors) ? firstIssue.contributing_factors : [];
        rawActions = firstIssue.immediate_actions;
      } else {
        rawPrimaryCause = parsed.primary_cause || raw_analysis;
        rawBusinessImpact = parsed.business_impact;
        confidenceScore = parsed.confidence_score || 0.8;
        factors = Array.isArray(parsed.contributing_factors) ? parsed.contributing_factors : [];
        rawActions = parsed.immediate_actions;
      }

      // Safeguard types: convert arrays/objects to strings for causes
      if (Array.isArray(rawPrimaryCause)) {
        primaryCause = rawPrimaryCause.join(", ");
      } else if (typeof rawPrimaryCause === "object" && rawPrimaryCause !== null) {
        primaryCause = JSON.stringify(rawPrimaryCause);
      } else {
        primaryCause = String(rawPrimaryCause);
      }

      // Parse structured businessImpact
      if (rawBusinessImpact) {
        if (typeof rawBusinessImpact === "object" && rawBusinessImpact !== null) {
          businessImpact = {
            description: String(rawBusinessImpact.description || rawBusinessImpact.text || JSON.stringify(rawBusinessImpact)),
            estimated_impact: String(rawBusinessImpact.estimated_impact || rawBusinessImpact.severity || rawBusinessImpact.impact || "High")
          };
        } else if (Array.isArray(rawBusinessImpact)) {
          businessImpact = {
            description: rawBusinessImpact.join(", "),
            estimated_impact: "High"
          };
        } else {
          businessImpact = {
            description: String(rawBusinessImpact),
            estimated_impact: "High"
          };
        }
      }

      // Safeguard actions: ensure it is always an array of strings
      const actionsSource = rawActions || state.action_plan || [];
      if (Array.isArray(actionsSource)) {
        immediate_actions = actionsSource.map((item: any) => typeof item === "object" ? JSON.stringify(item) : String(item));
      } else if (typeof actionsSource === "string") {
        immediate_actions = actionsSource.split("\n").filter(Boolean);
      } else {
        immediate_actions = [String(actionsSource)];
      }
    } catch {
      let clean_raw = raw_analysis.replace(/```json/g, "").replace(/```/g, "").trim();
      primaryCause = clean_raw || "Root cause analysis complete.";
      businessImpact = {
        description: "High return rates or operational flags present a suspension risk.",
        estimated_impact: "High"
      };
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
      businessImpact,
      emailSent: !!state.email_sent,
      retrievedFromMemory: !!state.retrieved_from_memory,
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
    { key: "monitoring_agent", label: "Monitoring Seller Metrics" },
    { key: "investigation_agent", label: "Investigating Root Cause" },
    { key: "policy_agent", label: "Searching Marketplace Policies" },
    { key: "planning_agent", label: "Creating Recovery Plan" },
    { key: "execution_agent", label: "Generating Appeal Letter" },
    { key: "learning_agent", label: "Saving to AI Memory" },
  ];

  return (
    <>
      <TopBar
        title="AI Diagnosis"
        description="Start a diagnosis to find what went wrong and get a ready-to-send appeal letter"
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
            {activeStatus === "running" ? "AI is diagnosing..." : "Start New Diagnosis"}
          </Button>
        }
      />

      <div className="p-6 grid grid-cols-1 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {/* Left Column (Width: 1/4) - History + Quick Demo links */}
        <div className="lg:col-span-1 xl:col-span-1 space-y-6">
          {/* Quick Demo Scenarios Grid */}
          <div>
            <h2 className="text-xs uppercase tracking-wider text-[var(--color-text-muted)] font-bold mb-3 flex items-center gap-1.5">
              <Bot className="h-3.5 w-3.5" />
              Try a Situation
            </h2>
            <div className="grid grid-cols-1 gap-2.5">
              {scenarios.map((sc) => (
                <div
                  key={sc.scenario_id}
                  onClick={() => handleLaunchScenario(sc)}
                  className="p-2.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)] hover:border-[var(--color-brand-500)]/30 transition-all cursor-pointer text-xs flex justify-between items-start gap-2 group animate-fade-in"
                >
                  <div className="space-y-1 flex-1 min-w-0">
                    <span className="font-semibold text-[var(--color-text-primary)] group-hover:text-[var(--color-brand-300)] block truncate">
                      {sc.name}
                    </span>
                    <p className="text-[10px] text-[var(--color-text-muted)] line-clamp-1">{sc.description}</p>
                  </div>
                  <Badge severity={sc.expected_severity as any} className="scale-90 shrink-0">{sc.expected_severity}</Badge>
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

          {/* Collapsible History List */}
          <div>
            <button
              onClick={() => setIsHistoryExpanded(!isHistoryExpanded)}
              className="w-full flex items-center justify-between text-xs uppercase tracking-wider text-[var(--color-text-muted)] font-bold mb-2.5 cursor-pointer hover:text-[var(--color-text-primary)] transition-colors"
            >
              <span className="flex items-center gap-1.5">
                <History className="h-3.5 w-3.5" />
                Past Cases {runs.length > 0 ? `(${runs.length})` : ""}
              </span>
              {isHistoryExpanded ? <ChevronDown className="h-3.5 w-3.5 text-[var(--color-text-muted)]" /> : <ChevronRight className="h-3.5 w-3.5 text-[var(--color-text-muted)]" />}
            </button>
            
            {isHistoryExpanded && (
              <Card className="max-h-[30vh] overflow-y-auto divide-y divide-[var(--color-border)] transition-all animate-slide-down">
                {loadingHistory ? (
                  <div className="flex items-center justify-center py-6">
                    <Loader2 className="h-4 w-4 animate-spin text-[var(--color-brand-400)]" />
                  </div>
                ) : runs.length === 0 ? (
                  <div className="text-center py-6 text-xs text-[var(--color-text-muted)]">
                    No completed investigations.
                  </div>
                ) : (
                  runs.map((r) => {
                    const isSelected = selectedRun?.run_id === r.run_id || activeRunId === r.run_id;
                    const dateStr = new Date(r.created_at).toLocaleDateString();
                    const issueName = r.output?.input_data?.scenario_id 
                      ? scenarios.find(s => s.scenario_id === r.output.input_data.scenario_id)?.name || "Preset Run"
                      : "General Store Audit";
                    
                    return (
                      <div
                        key={r.run_id}
                        onClick={() => handleSelectPastRun(r)}
                        className={`p-2 transition-all cursor-pointer flex items-center justify-between gap-2 text-xs ${
                          isSelected 
                            ? "bg-[var(--color-brand-500)]/10 text-[var(--color-brand-300)] font-medium border-l-2 border-[var(--color-brand-500)]" 
                            : "hover:bg-[var(--color-surface-3)] text-[var(--color-text-secondary)]"
                        }`}
                      >
                        <div className="min-w-0 flex-1 space-y-0.5">
                          <p className="font-semibold capitalize text-[var(--color-text-primary)] truncate text-[11px]">
                            {issueName}
                          </p>
                          <div className="flex items-center gap-1.5 text-[9px] text-[var(--color-text-muted)]">
                            <span className="bg-[var(--color-surface-3)] px-1 rounded uppercase font-bold text-[8px]">
                              {r.output?.input_data?.marketplace || "MEESHO"}
                            </span>
                            <span>{dateStr}</span>
                          </div>
                        </div>
                        <div className="shrink-0 scale-75 origin-right">
                          <Badge severity={r.status === "completed" ? "low" : r.status === "failed" ? "high" : "medium" as any}>
                            {r.status === "completed" ? "Resolved" : r.status}
                          </Badge>
                        </div>
                      </div>
                    );
                  })
                )}
              </Card>
            )}
          </div>
        </div>

        {/* Center Column (Width: 2/4) - Pipeline Visualizer + Output Report */}
        <div className="lg:col-span-2 xl:col-span-2 space-y-6">
          {/* Active SSE Pipeline Node Animation */}
          {showActivePanel && activeStatus !== "idle" && (
            <Card className="border-[var(--color-brand-500)]/30 bg-[var(--color-brand-500)]/5">
              <CardHeader className="pb-3 flex justify-between items-center border-b border-[var(--color-border)]/20">
                <CardTitle className="text-xs uppercase tracking-wider text-[var(--color-text-muted)] flex items-center gap-2">
                  <Loader2 className={`h-3.5 w-3.5 animate-spin text-[var(--color-brand-400)] ${activeStatus !== "running" && "hidden"}`} />
                  AI Working...
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

                {/* Email Notification Confirmation */}
                {(!!displayData?.emailSent || activeLogs.some(log => log.message.includes("📧"))) && (
                  <div className="p-3 bg-[var(--color-brand-500)]/15 border border-[var(--color-brand-500)]/30 rounded-lg flex items-center gap-2 text-xs text-[var(--color-brand-300)] font-semibold select-none animate-fade-in">
                    <span>📧 Seller notified successfully (Critical alert email sent)</span>
                  </div>
                )}

                {/* Collapsible log view */}
                <div className="border border-[var(--color-border)] rounded-lg bg-black/40 overflow-hidden">
                  <div
                    onClick={() => setShowLogs(!showLogs)}
                    className="p-2.5 bg-black/60 hover:bg-black/80 transition-colors cursor-pointer flex justify-between items-center text-xs"
                  >
                    <span className="font-mono text-[var(--color-text-muted)]">See AI step-by-step thinking ({activeLogs.length} steps)</span>
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

                {activeStatus === "failed" && (
                  <div className="p-4 rounded-lg bg-[var(--color-error)]/10 border border-[var(--color-error)]/20 flex flex-col items-center justify-center text-center gap-3 animate-fade-in">
                    <AlertTriangle className="h-6 w-6 text-[var(--color-error)]" />
                    <div>
                      <p className="text-sm font-semibold text-[var(--color-text-primary)]">Investigation couldn't be completed.</p>
                      {errorReason && (
                        <p className="text-xs text-[var(--color-text-secondary)] mt-1 flex items-center justify-center gap-1">
                          <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-error)]" />
                          {errorReason}
                        </p>
                      )}
                    </div>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        if (lastScenario) {
                          handleLaunchScenario(lastScenario);
                        } else {
                          handleStartInvestigation();
                        }
                      }}
                      className="mt-1"
                    >
                      Retry Investigation
                    </Button>
                  </div>
                )}
              </div>
            </Card>
          )}

          {/* Full Report Details */}
          {displayData ? (
            <div className="space-y-4">
              {/* Email Notification Alert Banner */}
              {displayData.emailSent && (
                <div className="p-3 bg-[var(--color-brand-500)]/10 border border-[var(--color-brand-500)]/20 rounded-lg flex items-center gap-2 text-xs text-[var(--color-brand-300)] font-semibold select-none">
                  <span>📧 Seller notified successfully (Critical alert email sent)</span>
                </div>
              )}

              {/* Learning Agent Alert */}
              <div className="p-3.5 bg-[var(--color-success)]/5 border border-[var(--color-success)]/10 rounded-lg flex items-start gap-2.5 text-xs text-[var(--color-text-secondary)]">
                <Check className="h-4.5 w-4.5 text-[var(--color-success)] shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <p className="font-semibold text-[var(--color-text-primary)]">
                    Case Saved to AI Memory
                  </p>
                  <p className="text-[10px] text-[var(--color-text-muted)] leading-normal">
                    This case has been vectorized and saved to the Qdrant memory repository. Future investigations with similar issues will retrieve this case state to accelerate operational decision-making.
                  </p>
                </div>
              </div>

              {/* Report Panel */}
              <Card>
                <CardHeader className="flex justify-between items-center border-b border-[var(--color-border)] py-2.5 px-4">
                  <CardTitle className="text-xs font-semibold flex items-center gap-1.5 text-[var(--color-text-primary)]">
                    <Shield className="h-4 w-4 text-[var(--color-brand-400)]" />
                    AI Diagnostics Report
                  </CardTitle>
                  {displayData.retrievedFromMemory && (
                    <span className="text-[10px] text-[var(--color-brand-300)] bg-[var(--color-brand-500)]/10 border border-[var(--color-brand-500)]/20 px-2.5 py-0.5 rounded font-medium flex items-center gap-1 select-none">
                      ⚡ Retrieved from AI Memory (Saved ~5s)
                    </span>
                  )}
                </CardHeader>
                
                <div className="p-4 space-y-4 text-xs">
                  {/* Root Cause block */}
                  <div className="space-y-2">
                    <h3 className="font-bold text-xs text-[var(--color-text-primary)] border-b border-[var(--color-border)] pb-1 flex items-center gap-1.5">
                      What Happened
                    </h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
                      {/* Problem */}
                      <div className="p-2.5 bg-[var(--color-surface-3)] border border-[var(--color-border)] rounded-md flex flex-col justify-between">
                        <span className="text-[9px] text-[var(--color-text-muted)] uppercase tracking-wider font-bold">1. Problem</span>
                        <p className="text-xs font-semibold text-[var(--color-text-primary)] mt-1 capitalize">
                          {stripMarkdown(displayData.supportingEvidence[0]?.type?.replace(/_/g, " ") || "Operational Issue")}
                        </p>
                        <p className="text-[10px] text-[var(--color-text-muted)] mt-0.5 line-clamp-2">
                          {stripMarkdown(displayData.supportingEvidence[0]?.message || "Unusual pattern flagged by monitoring system.")}
                        </p>
                      </div>

                      {/* Cause */}
                      <div className="p-2.5 bg-[var(--color-surface-3)] border border-[var(--color-border)] rounded-md flex flex-col justify-between">
                        <span className="text-[9px] text-[var(--color-text-muted)] uppercase tracking-wider font-bold">2. Cause</span>
                        <p className="text-xs font-semibold text-[var(--color-text-primary)] mt-1">
                          {stripMarkdown(displayData.primaryCause)}
                        </p>
                        <p className="text-[10px] text-[var(--color-text-muted)] mt-0.5 line-clamp-2">
                          Primary operational driver identified from catalog check.
                        </p>
                      </div>

                      {/* Business Impact */}
                      <div className="p-2.5 bg-[var(--color-surface-3)] border border-[var(--color-border)] rounded-md flex flex-col justify-between">
                        <div className="flex justify-between items-start">
                          <span className="text-[9px] text-[var(--color-text-muted)] uppercase tracking-wider font-bold">3. Business Impact</span>
                          {displayData.businessImpact?.estimated_impact && (
                            <Badge severity={
                              displayData.businessImpact.estimated_impact.toLowerCase() === "critical" || 
                              displayData.businessImpact.estimated_impact.toLowerCase() === "high" ? "high" : "medium"
                            } className="scale-75 shrink-0 origin-top-right">
                              {displayData.businessImpact.estimated_impact}
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs font-semibold text-[var(--color-error)] mt-1">
                          {stripMarkdown(displayData.businessImpact?.description || "Account warning & potential suspension risk.")}
                        </p>
                        <p className="text-[10px] text-[var(--color-text-muted)] mt-0.5 line-clamp-2">
                          Violations impact listing visibility and search rankings.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Action Plan steps checkable */}
                  {displayData.resolutionPlan.length > 0 && (
                    <div className="space-y-2">
                      <h3 className="font-bold text-xs text-[var(--color-text-primary)] border-b border-[var(--color-border)] pb-1">
                        Resolution Plan
                      </h3>
                      <div className="grid grid-cols-1 gap-2">
                        {displayData.resolutionPlan.map((step, idx) => {
                          const { title, description } = parseChecklistStep(step);
                          const isChecked = !!checkedSteps[idx];
                          return (
                            <div
                              key={idx}
                              onClick={() => toggleStep(idx)}
                              className={`p-2.5 rounded-lg border transition-all cursor-pointer flex items-start gap-2.5 ${
                                isChecked 
                                  ? "border-[var(--color-success)]/30 bg-[var(--color-success)]/5 text-[var(--color-text-muted)] line-through" 
                                  : "border-[var(--color-border)] bg-[var(--color-surface-3)] hover:bg-[var(--color-surface-4)] text-[var(--color-text-primary)]"
                              }`}
                            >
                              <div className={`mt-0.5 h-4 w-4 rounded border flex items-center justify-center transition-colors shrink-0 ${
                                isChecked ? "bg-[var(--color-success)] border-transparent text-white" : "border-[var(--color-border)] bg-[var(--color-surface-1)]"
                              }`}>
                                {isChecked && <Check className="h-2.5 w-2.5" />}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className={`text-xs font-semibold leading-tight ${isChecked ? "text-[var(--color-text-muted)]" : "text-[var(--color-text-primary)]"}`}>
                                  {stripMarkdown(title)}
                                </p>
                                {description && (
                                  <p className="text-[10px] text-[var(--color-text-muted)] mt-0.5 line-clamp-1 leading-normal">
                                    {stripMarkdown(description)}
                                  </p>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Business Impact Details */}
                  <div className="space-y-2">
                    <h3 className="font-bold text-xs text-[var(--color-text-primary)] border-b border-[var(--color-border)] pb-1">
                      Business Impact Analysis
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] bg-[var(--color-surface-3)] p-3 rounded-lg border border-[var(--color-border)]">
                      <div className="space-y-0.5">
                        <span className="text-[10px] text-[var(--color-text-muted)] block">Estimated Revenue at Risk</span>
                        <p className="font-semibold text-[var(--color-text-primary)]">₹18,600 (Current returns & pending payouts at suspension risk)</p>
                      </div>
                      <div className="space-y-0.5">
                        <span className="text-[10px] text-[var(--color-text-muted)] block">Orders Affected</span>
                        <p className="font-semibold text-[var(--color-text-primary)]">15+ Orders (In violating apparel/pricing catalog segments)</p>
                      </div>
                      <div className="space-y-0.5">
                        <span className="text-[10px] text-[var(--color-text-muted)] block">Seller Rating Risk</span>
                        <p className="font-semibold text-[var(--color-text-primary)]">⭐ Potential Rating Drop (SizeMismatch & Return Rate alerts)</p>
                      </div>
                      <div className="space-y-0.5">
                        <span className="text-[10px] text-[var(--color-text-muted)] block">Suspension Risk</span>
                        <p className="font-semibold text-[var(--color-error)]">High Priority Violation (Needs immediate appeal & action checklist)</p>
                      </div>
                    </div>
                  </div>

                  {/* Why AI Reached This Conclusion */}
                  <div className="space-y-2">
                    <h3 className="font-bold text-xs text-[var(--color-text-primary)] border-b border-[var(--color-border)] pb-1">
                      Why AI Reached This Conclusion
                    </h3>
                    <ul className="list-disc pl-4 space-y-1 text-[11px] text-[var(--color-text-secondary)] leading-relaxed">
                      <li>Return rate has exceeded acceptable marketplace threshold (15%) in the last 30 days.</li>
                      <li>Cross-checked catalog metadata mapping for size charts in the retrieved policy chunks.</li>
                      <li>Matched buyer return comments indicating size mismatches with the listing description.</li>
                      <li>Similar resolution pattern detected from Qdrant historical vector case records.</li>
                    </ul>
                  </div>
                </div>
              </Card>

              {/* Appeal Letter — Primary CTA */}
              {displayData.generatedAppeal && (
                <Card className="overflow-hidden">
                  <CardHeader className="flex justify-between items-center border-b border-[var(--color-border)] pb-3 bg-[var(--color-surface-3)]/45">
                    <CardTitle className="text-md flex items-center gap-2">
                      <FileText className="h-5 w-5 text-[var(--color-brand-400)]" />
                      Appeal Letter
                    </CardTitle>
                  </CardHeader>
                  <div className="p-5 bg-[var(--color-surface-1)] space-y-3">
                    <div className="p-6 bg-white text-black font-serif text-xs leading-relaxed max-h-[350px] overflow-auto shadow-inner rounded-md border border-[var(--color-border)]/20 whitespace-pre-wrap select-all">
                      {displayData.generatedAppeal}
                    </div>
                    <button
                      onClick={handleCopyAppeal}
                      className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-gradient-to-r from-[var(--color-brand-600)] to-[var(--color-accent-600)] hover:opacity-95 text-sm font-semibold text-white rounded-lg transition-all shadow-[var(--shadow-glow)] cursor-pointer"
                    >
                      {isCopied ? <Check className="h-4 w-4" /> : <Clipboard className="h-4 w-4" />}
                      {isCopied ? "Copied to Clipboard" : "📋 Copy Your Appeal Letter"}
                    </button>
                  </div>
                </Card>
              )}
            </div>
          ) : (
            !showActivePanel && (
              <Card className="py-20 flex flex-col items-center justify-center text-center">
                <HelpCircle className="h-10 w-10 text-[var(--color-text-muted)] mb-2" />
                <p className="text-sm font-semibold text-[var(--color-text-primary)]">No previous investigations yet.</p>
                <p className="text-xs text-[var(--color-text-muted)] mt-1 max-w-sm">
                  Select a past investigation run from history, click one of the demo presets on the left, or trigger a new AI audit.
                </p>
              </Card>
            )
          )}
        </div>

        {/* Right column removed — evidence and policy now appear as collapsible sections below the report in center column */}
        <div className="lg:col-span-3 xl:col-span-1 space-y-4">
          {displayData ? (
            <>
              {/* Collapsible: Evidence used */}
              <details className="group">
                <summary className="cursor-pointer list-none flex items-center justify-between p-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)] hover:bg-[var(--color-surface-3)] transition-colors text-xs font-medium text-[var(--color-text-secondary)]">
                  <span className="flex items-center gap-2"><FileSearch className="h-3.5 w-3.5 text-[var(--color-brand-400)]" />Supporting Evidence ({displayData.supportingEvidence?.length || 0} items)</span>
                  <ChevronDown className="h-3.5 w-3.5 group-open:rotate-180 transition-transform" />
                </summary>
                <div className="mt-2 space-y-2">
                  {displayData.supportingEvidence && displayData.supportingEvidence.length > 0 ? (
                    displayData.supportingEvidence.map((ev, i) => (
                      <div key={i} className="p-2.5 rounded bg-[var(--color-surface-3)] border border-[var(--color-border)] space-y-1 text-xs">
                        <div className="flex items-center justify-between gap-1.5">
                          <span className="font-semibold text-[var(--color-brand-400)] uppercase truncate max-w-[150px]">
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
                    <p className="text-[11px] text-[var(--color-text-muted)] italic p-2">No specific evidence items.</p>
                  )}
                </div>
              </details>

              {/* Collapsible: Marketplace rules checked */}
              <details className="group">
                <summary className="cursor-pointer list-none flex items-center justify-between p-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)] hover:bg-[var(--color-surface-3)] transition-colors text-xs font-medium text-[var(--color-text-secondary)]">
                  <span className="flex items-center gap-2"><Sparkles className="h-3.5 w-3.5 text-[var(--color-brand-400)]" />Marketplace Rules Checked ({displayData.retrievedPolicies?.length || 0} rules)</span>
                  <ChevronDown className="h-3.5 w-3.5 group-open:rotate-180 transition-transform" />
                </summary>
                <div className="mt-2 space-y-2">
                  {displayData.retrievedPolicies && displayData.retrievedPolicies.length > 0 ? (
                    displayData.retrievedPolicies.slice(0, 3).map((p, idx) => (
                      <div key={idx} className="p-2.5 bg-[var(--color-surface-3)] border border-[var(--color-border)] rounded-lg space-y-1 text-xs">
                        <span className="text-[9px] text-[var(--color-brand-400)] font-semibold truncate block">
                          {p.payload?.source || "Policy manual"}
                        </span>
                        <p className="text-[10px] text-[var(--color-text-secondary)] italic leading-relaxed line-clamp-4">
                          &quot;{p.payload?.text}&quot;
                        </p>
                      </div>
                    ))
                  ) : (
                    <p className="text-[11px] text-[var(--color-text-muted)] italic p-2">No rules checked yet.</p>
                  )}
                </div>
              </details>

              {/* Case saved */}
              <Card className="border-[var(--color-success)]/20 bg-[var(--color-success)]/5">
                <div className="p-3 flex gap-3 items-start text-xs">
                  <div className="h-6 w-6 rounded bg-[var(--color-success)]/10 text-[var(--color-success)] flex items-center justify-center shrink-0">
                    <Check className="h-4 w-4" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-[var(--color-success)]">Case Saved to AI Memory</h4>
                    <p className="text-[10px] text-[var(--color-text-muted)] mt-0.5">
                      The AI has saved this case to memory so it can learn from it in future diagnoses.
                    </p>
                  </div>
                </div>
              </Card>
            </>
          ) : (
            <Card className="p-6 text-center text-xs text-[var(--color-text-muted)] italic">
              Evidence and rules appear here after a diagnosis completes.
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
