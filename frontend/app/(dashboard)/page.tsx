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
import { StatusDot } from "@/components/ui/StatusDot";
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

// Human-readable severity label
function severityLabel(sev: string) {
  switch (sev?.toLowerCase()) {
    case "critical": return "🔴 Critical";
    case "high": return "🟠 High Priority";
    case "medium": return "🟡 Attention Needed";
    default: return "🟢 Normal";
  }
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
  // Store performance stats collapsed by default
  const [isStatsExpanded, setIsStatsExpanded] = useState(false);

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
          description="Rohan Enterprises · SellerOps AI is watching your account"
        />
        <div className="flex items-center justify-center min-h-[400px] flex-col gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-[var(--color-brand-400)]" />
          <p className="text-sm text-[var(--color-text-muted)]">Loading your store overview...</p>
        </div>
      </>
    );
  }

  if (error || !metrics) {
    return (
      <>
        <TopBar
          title="My Store"
          description="Rohan Enterprises · SellerOps AI is watching your account"
        />
        <div className="p-6">
          <div className="rounded-xl border border-[var(--color-error)]/30 bg-[var(--color-error)]/5 p-6 flex flex-col items-center gap-4 text-center">
            <AlertTriangle className="h-10 w-10 text-[var(--color-error)]" />
            <div>
              <p className="text-lg font-semibold text-[var(--color-error)]">Could not load your store</p>
              <p className="text-sm text-[var(--color-text-secondary)] mt-1">{error || "Data load failed"}</p>
            </div>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-[var(--color-surface-3)] hover:bg-[var(--color-surface-4)] text-sm rounded-lg border border-[var(--color-border)] transition-colors text-[var(--color-text-primary)]"
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
  let healthColor = "text-[var(--color-success)]";
  let healthBg = "bg-[var(--color-success)]/8 border-[var(--color-success)]/20";

  if (totalProblems === 0) {
    healthHeadline = "Your store looks healthy. No problems found.";
    healthColor = "text-[var(--color-success)]";
    healthBg = "bg-[var(--color-success)]/8 border-[var(--color-success)]/20";
  } else if (totalProblems === 1) {
    healthHeadline = "Your store has 1 problem that needs attention.";
    healthColor = "text-[var(--color-warning)]";
    healthBg = "bg-[var(--color-warning)]/8 border-[var(--color-warning)]/20";
  } else if (violationCount > 0 || payoutAnomalyCount > 0) {
    healthHeadline = `Your store needs attention. ${totalProblems} problem${totalProblems > 1 ? "s" : ""} found.`;
    healthColor = "text-[var(--color-error)]";
    healthBg = "bg-[var(--color-error)]/8 border-[var(--color-error)]/20";
  } else {
    healthHeadline = `${totalProblems} marketplace ticket${totalProblems > 1 ? "s" : ""} open. Review when possible.`;
    healthColor = "text-[var(--color-warning)]";
    healthBg = "bg-[var(--color-warning)]/8 border-[var(--color-warning)]/20";
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
      title: "High Return Rate & Performance Warning",
      description: "Customer return rate has exceeded the threshold. Correlated with buyer disputes and performance alerts.",
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
      title: "Counterfeit Brand Suspicion & Suppression Alert",
      description: "Listing temporarily suppressed due to Apple brand counterfeit flags. Action required to prevent account lock.",
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
      title: "Settlement Discrepancies & Payout Disputes",
      description: "Expected settlements differ from bank payout disbursement values. Correlated with active payment support cases.",
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
      title: "Account Suspension Warning & Low Rating",
      description: "Account health is compromised by a declining seller rating (3.2). Suspension appeal ticket is active.",
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
        evidence: [`Flagged in catalog check on ${v.date}`],
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
        title="My Store"
        description={`Rohan Enterprises · ${metrics.marketplace.toUpperCase()} ${metrics.seller_tier} Tier`}
      />

      <div className="p-6 space-y-5">

        {/* ─── Store Health Banner ─── */}
        <div className={`rounded-xl border p-5 space-y-3.5 ${healthBg}`}>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <span className="text-[10px] text-[var(--color-text-muted)] uppercase tracking-wider font-bold">Store Status</span>
              <h2 className={`text-lg font-bold leading-snug ${healthColor} mt-0.5`}>
                {healthHeadline}
              </h2>
            </div>
            {totalProblems > 0 && (
              <button
                onClick={() => handleLaunchInvestigation(mapViolationToScenario(metrics.violations?.[0]?.type || "return_rate"))}
                className="flex items-center gap-2 px-4.5 py-2 bg-gradient-to-r from-[var(--color-brand-600)] to-[var(--color-accent-600)] text-xs font-semibold rounded-lg text-white shadow-[var(--shadow-glow)] hover:opacity-90 transition-all shrink-0 cursor-pointer"
              >
                <Bot className="h-4 w-4 animate-pulse" />
                Resolve All Issues with AI
                <ArrowRight className="h-4 w-4" />
              </button>
            )}
          </div>
          
          <div className="border-t border-[var(--color-border)]/20 pt-3 grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div className="space-y-1">
              <span className="text-[10px] text-[var(--color-text-muted)] font-medium">Active Issues</span>
              <p className="font-semibold text-[var(--color-text-primary)]">
                {totalProblems} open issues
              </p>
            </div>
            <div className="space-y-1">
              <span className="text-[10px] text-[var(--color-text-muted)] font-medium">Potential Revenue at Risk</span>
              <p className="font-semibold text-[var(--color-text-primary)]">
                ₹{((metrics.total_revenue_30d * 0.15) + metrics.pending_payouts).toLocaleString()} (Estimated Risk)
              </p>
            </div>
            <div className="space-y-1">
              <span className="text-[10px] text-[var(--color-text-muted)] font-medium">Seller Rating Trend</span>
              <p className="font-semibold text-[var(--color-text-primary)] flex items-center gap-1">
                ⭐ {metrics.seller_rating.toFixed(1)} / 5.0
                <span className="text-[10px] text-[var(--color-error)]">(Declining)</span>
              </p>
            </div>
          </div>
        </div>

        {/* ─── Operational Alerts Panel ─── */}
        {sortedCases.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-4 border-b border-[var(--color-border)]/50 pb-2">
              <h2 className="text-xs uppercase tracking-wider text-[var(--color-text-muted)] font-bold flex items-center gap-1.5 px-1">
                <span className="h-2 w-2 rounded-full bg-[var(--color-error)] shrink-0" />
                Issues Requiring Attention
              </h2>
              
              <div className="flex gap-1.5 bg-[var(--color-surface-3)] p-0.5 rounded-lg border border-[var(--color-border)]/50 text-[10px] font-semibold">
                {["all", "critical", "high", "medium"].map((filter) => (
                  <button
                    key={filter}
                    onClick={() => setSeverityFilter(filter)}
                    className={`px-2 py-1 rounded transition-colors cursor-pointer capitalize ${
                      severityFilter === filter
                        ? "bg-[var(--color-surface-1)] text-[var(--color-brand-300)] animate-fade-in"
                        : "text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
                    }`}
                  >
                    {filter}
                  </button>
                ))}
              </div>
            </div>
            
            {filteredCases.length === 0 ? (
              <div className="p-8 text-center text-xs text-[var(--color-text-muted)] border border-[var(--color-border)]/50 rounded-xl bg-[var(--color-surface-2)]">
                No active issues match the selected filter.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {filteredCases.map((c) => (
                  <div
                    key={c.id}
                    className="p-3.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)] flex flex-col justify-between gap-2.5 transition-all hover:border-[var(--color-border-hover)]"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="text-sm font-bold text-[var(--color-text-primary)] leading-tight">{c.title}</h3>
                        <span className={`text-[8px] uppercase tracking-wider font-extrabold px-1.5 py-0.5 rounded shrink-0 ${
                          c.severity === "critical"
                            ? "bg-[var(--color-error)]/10 text-[var(--color-error)] border border-[var(--color-error)]/25"
                            : c.severity === "high"
                            ? "bg-[var(--color-warning)]/10 text-[var(--color-warning)] border border-[var(--color-warning)]/25"
                            : "bg-[var(--color-surface-3)] text-[var(--color-text-secondary)] border border-[var(--color-border)]"
                        }`}>
                          {c.severity}
                        </span>
                      </div>
                      <p className="text-xs text-[var(--color-text-muted)] leading-relaxed">{c.description}</p>
                      
                      {/* Supporting Evidence Checklist */}
                      {c.evidence.length > 0 && (
                        <div className="mt-2 text-[10px] text-[var(--color-text-muted)] bg-[var(--color-surface-3)]/60 px-2 py-1.5 rounded border border-[var(--color-border)]/40">
                          <span className="font-semibold block mb-0.5 text-[9px] uppercase tracking-wider">Supporting Evidence</span>
                          <ul className="list-disc pl-3.5 space-y-0.5">
                            {c.evidence.map((ev, idx) => (
                              <li key={idx} className="leading-snug">{ev}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                    
                    <button
                      onClick={() => handleLaunchInvestigation(c.scenarioId)}
                      className="flex items-center gap-1 text-xs font-semibold text-[var(--color-brand-400)] hover:text-[var(--color-brand-300)] transition-colors self-start mt-1 cursor-pointer"
                    >
                      Investigate
                      <ArrowRight className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ─── Store Stats Pills (collapsed by default) ─── */}
        <div>
          <button
            onClick={() => setIsStatsExpanded(!isStatsExpanded)}
            className="flex items-center gap-1.5 text-xs font-medium text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors mb-3"
          >
            {isStatsExpanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
            {isStatsExpanded ? "Hide store performance numbers" : "Show store performance numbers"}
          </button>

          {isStatsExpanded && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)] flex flex-col gap-1">
                <span className="text-[10px] text-[var(--color-text-muted)] uppercase tracking-wider">30d Sales</span>
                <span className="text-xl font-bold tabular-nums">₹{metrics.total_revenue_30d.toLocaleString()}</span>
                <span className="text-[10px] text-[var(--color-text-muted)]">{metrics.total_orders} orders</span>
              </div>
              <div className={`p-4 rounded-xl border flex flex-col gap-1 ${returnRate > 0.15 ? "border-[var(--color-error)]/30 bg-[var(--color-error)]/5" : "border-[var(--color-border)] bg-[var(--color-surface-2)]"}`}>
                <span className="text-[10px] text-[var(--color-text-muted)] uppercase tracking-wider">Return Rate</span>
                <span className={`text-xl font-bold tabular-nums ${returnRate > 0.15 ? "text-[var(--color-error)]" : ""}`}>
                  {(returnRate * 100).toFixed(1)}%
                </span>
                <span className="text-[10px] text-[var(--color-text-muted)]">Target: &lt;15%</span>
              </div>
              <div className="p-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)] flex flex-col gap-1">
                <span className="text-[10px] text-[var(--color-text-muted)] uppercase tracking-wider">Products</span>
                <span className="text-xl font-bold tabular-nums">{activeListingsCount}</span>
                <span className="text-[10px] text-[var(--color-text-muted)]">active listings</span>
              </div>
              <div className={`p-4 rounded-xl border flex flex-col gap-1 ${payoutAnomalyCount > 0 ? "border-[var(--color-warning)]/30 bg-[var(--color-warning)]/5" : "border-[var(--color-border)] bg-[var(--color-surface-2)]"}`}>
                <span className="text-[10px] text-[var(--color-text-muted)] uppercase tracking-wider">Pending Payment</span>
                <span className="text-xl font-bold tabular-nums">₹{metrics.pending_payouts.toLocaleString()}</span>
                <span className="text-[10px] text-[var(--color-text-muted)]">
                  {payoutAnomalyCount > 0 ? `${payoutAnomalyCount} discrepancies found` : "No discrepancies"}
                </span>
              </div>
            </div>
          )}
        </div>



        {/* ─── AI Activity (collapsed by default) ─── */}
        <Card className="overflow-hidden">
          <div
            onClick={() => setIsActivityExpanded(!isActivityExpanded)}
            className="p-3 hover:bg-[var(--color-surface-3)] transition-colors cursor-pointer flex items-center justify-between"
          >
            <div className="flex items-center gap-2">
              <Bot className="h-4 w-4 text-[var(--color-brand-400)]" />
              <span className="text-xs font-semibold text-[var(--color-text-primary)]">Recent AI Diagnoses</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-[10px] text-[var(--color-text-muted)]">
                {recentRuns.length > 0
                  ? `Last run: ${recentRuns[0].status}`
                  : "No recent runs"}
              </span>
              {isActivityExpanded ? <ChevronDown className="h-3.5 w-3.5 text-[var(--color-text-muted)]" /> : <ChevronRight className="h-3.5 w-3.5 text-[var(--color-text-muted)]" />}
            </div>
          </div>

          {isActivityExpanded && (
            <div className="border-t border-[var(--color-border)] p-4 space-y-3">
              {recentRuns.length === 0 ? (
                <p className="text-xs text-[var(--color-text-muted)] italic text-center py-4">No AI diagnoses have been run yet.</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                  {recentRuns.map((run) => (
                    <div
                      key={run.run_id}
                      onClick={(e) => { e.stopPropagation(); router.push(`/investigations?run_id=${run.run_id}`); }}
                      className="p-2.5 rounded bg-[var(--color-surface-2)] border border-[var(--color-border)] hover:border-[var(--color-brand-500)]/30 transition-all cursor-pointer flex flex-col justify-between gap-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] uppercase font-bold text-[var(--color-text-secondary)]">
                          {run.agent_type === "investigation" ? "Full Diagnosis" : "Listing Check"}
                        </span>
                        <Badge severity={run.status === "completed" ? "low" : run.status === "failed" ? "high" : "medium" as any}>
                          {run.status}
                        </Badge>
                      </div>
                      <p className="text-[9px] text-[var(--color-text-muted)]">{new Date(run.created_at).toLocaleString()}</p>
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
                <div className="flex h-full flex-col overflow-y-scroll bg-[var(--color-surface-2)] border-l border-[var(--color-border)] shadow-2xl">
                  {/* Header */}
                  <div className="p-6 border-b border-[var(--color-border)] flex items-center justify-between">
                    <div>
                      <h2 className="text-md font-bold text-[var(--color-text-primary)]">
                        {selectedIssue.title}
                      </h2>
                      <p className="text-xs text-[var(--color-text-muted)] mt-1">
                        {severityLabel(selectedIssue.severity)} · Detected {selectedIssue.date}
                      </p>
                    </div>
                    <button
                      onClick={() => setIsDrawerOpen(false)}
                      className="rounded-md p-1 text-[var(--color-text-muted)] hover:bg-[var(--color-surface-3)] transition-colors"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>

                  {/* Body */}
                  <div className="flex-1 p-6 space-y-6">
                    <div className="space-y-2">
                      <span className="text-[10px] uppercase font-bold text-[var(--color-text-muted)] tracking-wider">What happened</span>
                      <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed bg-[var(--color-surface-3)] p-3 rounded-lg border border-[var(--color-border)]">
                        {selectedIssue.description}
                      </p>
                    </div>

                    <div className="space-y-3">
                      <span className="text-[10px] uppercase font-bold text-[var(--color-text-muted)] tracking-wider">What to do</span>
                      <div className="p-4 rounded-lg bg-[var(--color-brand-500)]/5 border border-[var(--color-brand-500)]/10 space-y-3">
                        <div className="flex gap-2">
                          <Bot className="h-4 w-4 text-[var(--color-brand-400)] shrink-0 mt-0.5" />
                          <div className="text-xs">
                            <p className="font-semibold text-[var(--color-text-primary)]">Run AI Diagnosis</p>
                            <p className="text-[10px] text-[var(--color-text-muted)] mt-0.5">
                              The AI will analyse this issue, check marketplace rules, and write an appeal letter for you.
                            </p>
                          </div>
                        </div>

                        <button
                          onClick={() => {
                            setIsDrawerOpen(false);
                            handleLaunchInvestigation(selectedIssue.scenarioId);
                          }}
                          className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-gradient-to-r from-[var(--color-brand-600)] to-[var(--color-accent-600)] hover:opacity-95 text-xs font-semibold text-white rounded-lg transition-all shadow-[var(--shadow-glow)] cursor-pointer"
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
