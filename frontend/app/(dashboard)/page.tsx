"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import apiClient from "@/lib/api-client";
import { listingService } from "@/services/listingService";
import { payoutService } from "@/services/payoutService";
import { ticketService, SupportTicket } from "@/services/ticketService";
import { agentService } from "@/services/agentService";
import { TopBar } from "@/components/layout/TopBar";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { toast } from "sonner";
import {
  TrendingDown,
  TrendingUp,
  AlertTriangle,
  Package,
  RotateCcw,
  Wallet,
  Bot,
  Loader2,
  X,
  ShieldAlert,
  ArrowRight,
  ChevronDown,
  ChevronRight,
  TrendingUp as TrendingUpIcon,
} from "lucide-react";

interface SellerMetrics {
  seller_id: string;
  seller_name: string;
  seller_tier: string;
  marketplace: string;
  seller_rating: number;
  total_orders: number;
  total_returns: number;
  return_rate: number;
  active_listings: number;
  total_revenue_30d: number;
  total_payouts_30d: number;
  pending_payouts: number;
  account_health: string;
  cancellation_rate?: number;
  late_shipment_rate?: number;
  on_time_delivery_rate?: number;
  violations?: Array<{
    type: string;
    description: string;
    date: string;
    status: string;
    severity: string;
  }>;
  last_updated: string;
}

interface OperationalCase {
  id: string;
  title: string;
  description: string;
  severity: "critical" | "high" | "medium" | "low";
  evidence: string[];
  scenarioId: string;
}

// Map violation types to scenario IDs for demo routing
const mapViolationToScenario = (type: string): string => {
  const t = type.toLowerCase();
  if (t.includes("return_rate")) return "SCN-001";
  if (t.includes("rating")) return "SCN-002";
  if (t.includes("suspension") || t.includes("health")) return "SCN-003";
  if (t.includes("counterfeit")) return "SCN-005";
  if (t.includes("payout")) return "SCN-009";
  if (t.includes("keyword")) return "SCN-017";
  return "SCN-001";
};

// Human-readable violation type
function violationTitle(type: string) {
  return type.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
}

export default function CommandCenterPage() {
  const router = useRouter();
  const [metrics, setMetrics] = useState<SellerMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeListingsCount, setActiveListingsCount] = useState(0);
  const [payoutAnomalyCount, setPayoutAnomalyCount] = useState(0);
  const [openTickets, setOpenTickets] = useState<SupportTicket[]>([]);
  const [recentRuns, setRecentRuns] = useState<any[]>([]);
  const [severityFilter, setSeverityFilter] = useState<string>("all");

  // AI Activity collapsed by default
  const [isActivityExpanded, setIsActivityExpanded] = useState(false);

  // Drawer state
  const [selectedIssue, setSelectedIssue] = useState<any | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        setError(null);

        const [metricsRes, listingsRes, anomaliesRes, ticketsRes, runsRes] = await Promise.all([
          apiClient.get<SellerMetrics>("/seller-metrics"),
          listingService.getListings(),
          payoutService.getAnomalies(),
          ticketService.getOpenTickets(),
          agentService.listRuns(),
        ]);

        setMetrics(metricsRes.data);
        setActiveListingsCount(listingsRes.length);
        setPayoutAnomalyCount(anomaliesRes.length);
        setOpenTickets(ticketsRes);
        setRecentRuns(runsRes.slice(0, 5));
      } catch (err: any) {
        console.error(err);
        setError(err.message || "Failed to load dashboard metrics");
        toast.error("Error loading dashboard data");
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  const handleLaunchInvestigation = async (scenarioId: string) => {
    try {
      toast.loading("Starting AI Diagnosis...", { id: "trigger-run" });
      const run = await agentService.triggerRun({
        agent_type: "investigation",
        input_data: { marketplace: metrics?.marketplace || "meesho", scenario_id: scenarioId },
      });
      toast.success("AI Diagnosis started!", { id: "trigger-run" });
      router.push(`/investigations?run_id=${run.run_id}`);
    } catch (err: any) {
      console.error(err);
      toast.error(`Could not start diagnosis: ${err.message || err}`, { id: "trigger-run" });
    }
  };

  if (loading) {
    return (
      <>
        <TopBar
          title="My Store"
          description="Overview · AI Operations Desk"
        />
        <div className="flex items-center justify-center min-h-[400px] flex-col gap-2">
          <Loader2 className="h-6 w-6 animate-spin text-indigo-400" />
          <p className="text-xs text-slate-500">Loading store analytics...</p>
        </div>
      </>
    );
  }

  if (error || !metrics) {
    return (
      <>
        <TopBar
          title="My Store"
          description="Overview · AI Operations Desk"
        />
        <div className="p-6">
          <div className="rounded-xl border border-slate-800 bg-slate-900/20 p-12 flex flex-col items-center gap-4 text-center">
            <AlertTriangle className="h-8 w-8 text-slate-600" />
            <div>
              <p className="text-sm font-semibold text-slate-200">No store metrics available.</p>
              <p className="text-xs text-slate-500 mt-1">{error || "Data load failed"}</p>
            </div>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-850 text-xs rounded-lg border border-slate-800 transition-colors text-slate-200 cursor-pointer"
            >
              Try Again
            </button>
          </div>
        </div>
      </>
    );
  }

  const returnRate = metrics.return_rate;
  const violationCount = metrics.violations?.length || 0;
  const totalProblems = violationCount + (payoutAnomalyCount > 0 ? 1 : 0) + openTickets.length;

  // Build the health headline
  let healthHeadline = "";
  let healthBg = "bg-slate-900/20 border-slate-800/80";

  if (totalProblems === 0) {
    healthHeadline = "Your store status is operational. No issues detected.";
  } else if (totalProblems === 1) {
    healthHeadline = "Store alert: 1 issue requires review.";
  } else {
    healthHeadline = `Store alert: ${totalProblems} active operational issues detected.`;
  }

  // Consolidate related issues into operational cases
  const cases: OperationalCase[] = [];

  // Group 1: High Return Rate & Performance Warning
  const hasHighReturn = metrics.violations?.some(v => v.type === "high_return_rate");
  const returnTicket = openTickets.find(t => t.ticket_id === "TKT-001" || t.ticket_id === "TKT-006" || t.subject.toLowerCase().includes("return"));
  if (hasHighReturn || returnTicket) {
    const evidenceList: string[] = [];
    if (hasHighReturn) {
      const v = metrics.violations?.find(v => v.type === "high_return_rate");
      if (v) evidenceList.push(v.description);
    }
    if (returnTicket) {
      evidenceList.push(`Ticket ${returnTicket.ticket_id}: ${returnTicket.subject}`);
    }
    cases.push({
      id: "case-return-rate",
      title: "High Return Rate Warning",
      description: "Customer return rate has exceeded the 15% threshold. Size charts mismatch or QC issues suspected.",
      severity: "critical",
      evidence: evidenceList,
      scenarioId: "SCN-001"
    });
  }

  // Group 2: Counterfeit Brand Suspicion & Suppression Ticket
  const hasCounterfeit = metrics.violations?.some(v => v.type === "counterfeit_suspicion");
  const counterfeitTicket = openTickets.find(t => t.ticket_id === "TKT-002" || t.subject.toLowerCase().includes("counterfeit"));
  if (hasCounterfeit || counterfeitTicket) {
    const evidenceList: string[] = [];
    if (hasCounterfeit) {
      const v = metrics.violations?.find(v => v.type === "counterfeit_suspicion");
      if (v) evidenceList.push(v.description);
    }
    if (counterfeitTicket) {
      evidenceList.push(`Ticket ${counterfeitTicket.ticket_id}: ${counterfeitTicket.subject}`);
    }
    cases.push({
      id: "case-counterfeit",
      title: "Brand Authenticity Appeal",
      description: "Listing suppressed due to generic vs brand catalog flags. Requires authorization docs appeal.",
      severity: "critical",
      evidence: evidenceList,
      scenarioId: "SCN-002"
    });
  }

  // Group 3: Payout disputes and discrepancies
  const hasPayoutDispute = metrics.violations?.some(v => v.type === "payout_disputes");
  const payoutTicket = openTickets.find(t => t.ticket_id === "TKT-003" || t.subject.toLowerCase().includes("payout") || t.subject.toLowerCase().includes("payment"));
  if (hasPayoutDispute || payoutAnomalyCount > 0 || payoutTicket) {
    const evidenceList: string[] = [];
    if (payoutAnomalyCount > 0) {
      evidenceList.push(`${payoutAnomalyCount} payout settlements do not match expected earnings`);
    }
    if (payoutTicket) {
      evidenceList.push(`Ticket ${payoutTicket.ticket_id}: ${payoutTicket.subject}`);
    }
    cases.push({
      id: "case-payout",
      title: "Payout Settlement Mismatch",
      description: "Discrepancy detected between disbursed settlements and expected rates. Penalty audit needed.",
      severity: "high",
      evidence: evidenceList,
      scenarioId: "SCN-009"
    });
  }

  // Group 4: Low Seller Rating & Account Suspension Warning
  const hasLowRating = metrics.violations?.some(v => v.type === "low_seller_rating");
  const suspensionTicket = openTickets.find(t => t.ticket_id === "TKT-004" || t.subject.toLowerCase().includes("suspension"));
  if (hasLowRating || suspensionTicket) {
    const evidenceList: string[] = [];
    if (hasLowRating) {
      const v = metrics.violations?.find(v => v.type === "low_seller_rating");
      if (v) evidenceList.push(v.description);
    }
    if (suspensionTicket) {
      evidenceList.push(`Ticket ${suspensionTicket.ticket_id}: ${suspensionTicket.subject}`);
    }
    cases.push({
      id: "case-suspension",
      title: "Account Health Suspension Risk",
      description: "Overall rating dropped to 3.2. Suspension warning active. Customer service rating audit recommended.",
      severity: "critical",
      evidence: evidenceList,
      scenarioId: "SCN-003"
    });
  }

  // Group 5: Other violations (listing_violations, keyword_stuffing)
  const otherViolations = metrics.violations?.filter(v => v.type === "listing_violations" || v.type === "keyword_stuffing");
  if (otherViolations && otherViolations.length > 0) {
    otherViolations.forEach(v => {
      cases.push({
        id: `case-violation-${v.type}`,
        title: violationTitle(v.type),
        description: v.description,
        severity: v.severity as any,
        evidence: [`Flagged in catalog audit on ${v.date}`],
        scenarioId: mapViolationToScenario(v.type)
      });
    });
  }

  // Group 6: All other support tickets
  openTickets.forEach(t => {
    if (
      t.ticket_id !== "TKT-001" &&
      t.ticket_id !== "TKT-002" &&
      t.ticket_id !== "TKT-003" &&
      t.ticket_id !== "TKT-004" &&
      t.ticket_id !== "TKT-006"
    ) {
      cases.push({
        id: `case-ticket-${t.ticket_id}`,
        title: t.subject,
        description: t.description || "Marketplace ticket requiring review.",
        severity: t.priority === "critical" ? "critical" : t.priority === "high" ? "high" : t.priority === "medium" ? "medium" : "low",
        evidence: [`Ticket ${t.ticket_id} (${t.marketplace}) is in status ${t.status}`],
        scenarioId: "SCN-003"
      });
    }
  });

  // Sort: Critical -> High -> Medium -> Low
  const severityRank: Record<string, number> = {
    critical: 0,
    high: 1,
    medium: 2,
    low: 3,
  };
  const sortedCases = [...cases].sort((a, b) => severityRank[a.severity] - severityRank[b.severity]);

  // Filter by severity
  const filteredCases = sortedCases.filter(c => {
    if (severityFilter === "all") return true;
    return c.severity === severityFilter;
  });

  return (
    <>
      <TopBar
        title="Command Center"
        description={`${metrics.seller_name} · ${metrics.marketplace.toUpperCase()} Workspace`}
      />

      <div className="p-6 space-y-6">

        {/* ─── Store Performance Stats Block (Unified stats grid) ─── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4.5 rounded-xl border border-slate-900 bg-slate-950 flex flex-col gap-1">
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">30d Revenue</span>
            <span className="text-lg font-bold text-slate-100 tabular-nums">₹{metrics.total_revenue_30d.toLocaleString()}</span>
            <span className="text-[10px] text-slate-500">{metrics.total_orders} processed orders</span>
          </div>
          <div className={`p-4.5 rounded-xl border flex flex-col gap-1 ${returnRate > 0.15 ? "border-rose-950/80 bg-rose-950/5" : "border-slate-900 bg-slate-950"}`}>
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Store Return Rate</span>
            <span className={`text-lg font-bold tabular-nums ${returnRate > 0.15 ? "text-rose-400" : "text-slate-100"}`}>
              {(returnRate * 100).toFixed(1)}%
            </span>
            <span className="text-[10px] text-slate-500">Target threshold: &lt;15%</span>
          </div>
          <div className="p-4.5 rounded-xl border border-slate-900 bg-slate-950 flex flex-col gap-1">
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Active Catalog</span>
            <span className="text-lg font-bold text-slate-100 tabular-nums">{activeListingsCount}</span>
            <span className="text-[10px] text-slate-500">active SKU listings</span>
          </div>
          <div className={`p-4.5 rounded-xl border flex flex-col gap-1 ${payoutAnomalyCount > 0 ? "border-amber-950/80 bg-amber-950/5" : "border-slate-900 bg-slate-950"}`}>
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Pending Payouts</span>
            <span className="text-lg font-bold text-slate-100 tabular-nums">₹{metrics.pending_payouts.toLocaleString()}</span>
            <span className="text-[10px] text-slate-500">
              {payoutAnomalyCount > 0 ? `${payoutAnomalyCount} discrepancies detected` : "Fully reconciled"}
            </span>
          </div>
        </div>

        {/* ─── Store Health Banner (Clean status alert banner) ─── */}
        <div className={`rounded-xl border p-4.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${healthBg}`}>
          <div className="flex items-center gap-3">
            <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${totalProblems > 0 ? "bg-amber-500/10 text-amber-400" : "bg-emerald-500/10 text-emerald-400"}`}>
              <AlertTriangle className="h-4.5 w-4.5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-200 leading-snug">
                {healthHeadline}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Potential Revenue at Risk: ₹{((metrics.total_revenue_30d * 0.15) + metrics.pending_payouts).toLocaleString()} · Seller rating: ⭐ {metrics.seller_rating.toFixed(1)}/5.0
              </p>
            </div>
          </div>
          {totalProblems > 0 && (
            <button
              onClick={() => handleLaunchInvestigation(mapViolationToScenario(metrics.violations?.[0]?.type || "return_rate"))}
              className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-xs font-semibold rounded-lg text-white transition-all shrink-0 cursor-pointer shadow-md"
            >
              <Bot className="h-3.5 w-3.5" />
              Resolve with AI
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* ─── Active Operational Alerts Panel ─── */}
        {sortedCases.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-4 border-b border-slate-900 pb-2.5">
              <h2 className="text-xs uppercase tracking-wider text-slate-400 font-bold flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-rose-500 shrink-0" />
                Active Alerts
              </h2>
              
              <div className="flex gap-1.5 bg-slate-900/60 p-0.5 rounded-lg border border-slate-800 text-[10px] font-semibold text-slate-400">
                {["all", "critical", "high", "medium"].map((filter) => (
                  <button
                    key={filter}
                    onClick={() => setSeverityFilter(filter)}
                    className={`px-2 py-1 rounded transition-colors cursor-pointer capitalize ${
                      severityFilter === filter
                        ? "bg-slate-800 text-slate-200"
                        : "text-slate-500 hover:text-slate-300"
                    }`}
                  >
                    {filter}
                  </button>
                ))}
              </div>
            </div>
            
            {filteredCases.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500 border border-slate-900 rounded-xl bg-slate-950">
                No active issues match the selected filter.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredCases.map((c) => (
                  <div
                    key={c.id}
                    className="p-4 rounded-xl border border-slate-900 bg-slate-950 hover:bg-slate-900/20 transition-all flex flex-col justify-between gap-4 group"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-3">
                        <h3 className="text-xs font-bold text-slate-200 group-hover:text-indigo-400 transition-colors leading-tight">
                          {c.title}
                        </h3>
                        <span className={`text-[8px] uppercase tracking-wider font-bold px-2 py-0.5 rounded shrink-0 ${
                          c.severity === "critical"
                            ? "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                            : c.severity === "high"
                            ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                            : "bg-slate-800 text-slate-400"
                        }`}>
                          {c.severity}
                        </span>
                      </div>
                      
                      <p className="text-xs text-slate-400 leading-relaxed">
                        {c.description}
                      </p>
                      
                      {/* Supporting Evidence Checklist */}
                      {c.evidence.length > 0 && (
                        <div className="pt-2">
                          <span className="text-[9px] uppercase font-bold tracking-wider text-slate-500 block mb-1">Evidence Summary</span>
                          <ul className="space-y-1">
                            {c.evidence.map((ev, idx) => (
                              <li key={idx} className="text-[10px] text-slate-500 flex items-start gap-1.5 leading-snug">
                                <span className="mt-1 h-1 w-1 rounded-full bg-slate-700 shrink-0" />
                                {ev}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                    
                    <button
                      onClick={() => handleLaunchInvestigation(c.scenarioId)}
                      className="flex items-center gap-1 text-xs font-bold text-indigo-400 hover:text-indigo-300 transition-colors self-start cursor-pointer border-t border-slate-900/50 pt-2.5 w-full"
                    >
                      Diagnose root cause
                      <ArrowRight className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ─── AI Activity (Recent diagnostics - collapsed audit log style) ─── */}
        <Card className="overflow-hidden border-slate-900 bg-slate-950">
          <div
            onClick={() => setIsActivityExpanded(!isActivityExpanded)}
            className="p-3 hover:bg-slate-900/40 transition-colors cursor-pointer flex items-center justify-between"
          >
            <div className="flex items-center gap-2">
              <Bot className="h-4 w-4 text-indigo-400" />
              <span className="text-xs font-bold text-slate-300">AI Diagnosis Log</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-slate-500">
                {recentRuns.length > 0
                  ? `Last operation: ${recentRuns[0].status}`
                  : "No activity records"}
              </span>
              {isActivityExpanded ? <ChevronDown className="h-3.5 w-3.5 text-slate-500" /> : <ChevronRight className="h-3.5 w-3.5 text-slate-500" />}
            </div>
          </div>

          {isActivityExpanded && (
            <div className="border-t border-slate-900 p-4 space-y-3.5">
              {recentRuns.length === 0 ? (
                <p className="text-xs text-slate-500 italic text-center py-4">No AI diagnoses records found.</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-5 gap-3.5">
                  {recentRuns.map((run) => (
                    <div
                      key={run.run_id}
                      onClick={(e) => { e.stopPropagation(); router.push(`/investigations?run_id=${run.run_id}`); }}
                      className="p-3 rounded-lg bg-slate-950 border border-slate-900 hover:border-indigo-500/20 transition-all cursor-pointer flex flex-col justify-between gap-2"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[9px] uppercase font-bold text-slate-400 truncate">
                          {run.agent_type === "investigation" ? "Full Diagnosis" : "Listing Audit"}
                        </span>
                        <span className={`text-[8px] font-semibold px-1.5 py-0.5 rounded ${
                          run.status === "completed" ? "bg-emerald-500/10 text-emerald-400" : "bg-slate-800 text-slate-400"
                        }`}>
                          {run.status}
                        </span>
                      </div>
                      <p className="text-[9px] text-slate-500 font-mono">{new Date(run.created_at).toLocaleString()}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </Card>
      </div>

      {/* ─── Issue Detail Drawer ─── */}
      {isDrawerOpen && selectedIssue && (
        <div className="fixed inset-0 z-50 overflow-hidden" role="dialog" aria-modal="true">
          <div className="absolute inset-0 overflow-hidden">
            <div
              onClick={() => setIsDrawerOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <div className="pointer-events-none fixed inset-y-0 right-0 flex max-w-full pl-10">
              <div className="pointer-events-auto w-screen max-w-md">
                <div className="flex h-full flex-col overflow-y-scroll bg-slate-950 border-l border-slate-900 shadow-2xl">
                  {/* Header */}
                  <div className="p-6 border-b border-slate-900 flex items-center justify-between">
                    <div>
                      <h2 className="text-sm font-bold text-slate-200">
                        {selectedIssue.title}
                      </h2>
                      <p className="text-xs text-slate-500 mt-1">
                        Detected {selectedIssue.date}
                      </p>
                    </div>
                    <button
                      onClick={() => setIsDrawerOpen(false)}
                      className="rounded-lg p-1 text-slate-500 hover:bg-slate-900 transition-colors"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>

                  {/* Body */}
                  <div className="flex-1 p-6 space-y-6">
                    <div className="space-y-2">
                      <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Description</span>
                      <p className="text-xs text-slate-400 leading-relaxed bg-slate-900/40 p-3.5 rounded-lg border border-slate-900">
                        {selectedIssue.description}
                      </p>
                    </div>

                    <div className="space-y-3">
                      <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">AI Operations Solution</span>
                      <div className="p-4 rounded-lg bg-indigo-500/5 border border-indigo-500/10 space-y-3.5">
                        <div className="flex gap-2.5">
                          <Bot className="h-4.5 w-4.5 text-indigo-400 shrink-0 mt-0.5" />
                          <div className="text-xs">
                            <p className="font-semibold text-slate-200">Run AI Diagnosis</p>
                            <p className="text-[10px] text-slate-500 mt-0.5 leading-normal">
                              Automate platform compliance checks and draft an appeal letter.
                            </p>
                          </div>
                        </div>

                        <button
                          onClick={() => {
                            setIsDrawerOpen(false);
                            handleLaunchInvestigation(selectedIssue.scenarioId);
                          }}
                          className="w-full flex items-center justify-center gap-1.5 py-2.5 px-4 bg-indigo-600 hover:bg-indigo-755 text-xs font-semibold text-white rounded-lg transition-all shadow-md cursor-pointer"
                        >
                          Start AI Diagnosis
                          <ArrowRight className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
