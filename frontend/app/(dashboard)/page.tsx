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
  Calendar,
  X,
  ShieldAlert,
  ArrowRight,
  Ticket,
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

export default function CommandCenterPage() {
  const router = useRouter();
  const [metrics, setMetrics] = useState<SellerMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeListingsCount, setActiveListingsCount] = useState(0);
  const [payoutAnomalyCount, setPayoutAnomalyCount] = useState(0);
  const [openTickets, setOpenTickets] = useState<SupportTicket[]>([]);
  const [recentRuns, setRecentRuns] = useState<any[]>([]);
  const [isActivityCollapsed, setIsActivityCollapsed] = useState(false);

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

  if (loading) {
    return (
      <>
        <TopBar
          title="Command Center"
          description="SellerOps AI is monitoring your seller account 24/7"
        />
        <div className="flex items-center justify-center min-h-[400px] flex-col gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-[var(--color-brand-400)]" />
          <p className="text-sm text-[var(--color-text-muted)]">Assembling operational control panel...</p>
        </div>
      </>
    );
  }

  if (error || !metrics) {
    return (
      <>
        <TopBar
          title="Command Center"
          description="SellerOps AI is monitoring your seller account 24/7"
        />
        <div className="p-6">
          <div className="rounded-xl border border-[var(--color-error)]/30 bg-[var(--color-error)]/5 p-6 flex flex-col items-center gap-4 text-center">
            <AlertTriangle className="h-10 w-10 text-[var(--color-error)]" />
            <div>
              <p className="text-lg font-semibold text-[var(--color-error)]">Failed to Load Command Center</p>
              <p className="text-sm text-[var(--color-text-secondary)] mt-1">{error || "Data load failed"}</p>
            </div>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-[var(--color-surface-3)] hover:bg-[var(--color-surface-4)] text-sm rounded-lg border border-[var(--color-border)] transition-colors text-[var(--color-text-primary)]"
            >
              Retry Loading
            </button>
          </div>
        </div>
      </>
    );
  }

  // Calculate Risk Score (0 - 100)
  // Based on Return Rate, Seller Rating, and Payout Anomalies
  const rating = metrics.seller_rating;
  const returnRate = metrics.return_rate;
  const violationCount = metrics.violations?.length || 0;

  let calculatedRisk = 10; // base risk
  if (returnRate > 0.15) {
    calculatedRisk += Math.min((returnRate - 0.15) * 150, 40);
  }
  if (rating < 4.0) {
    calculatedRisk += Math.min((4.0 - rating) * 50, 30);
  }
  calculatedRisk += Math.min(violationCount * 8, 20);
  if (payoutAnomalyCount > 0) {
    calculatedRisk += 10;
  }
  const riskScore = Math.min(Math.round(calculatedRisk), 100);

  // Risk Rating styling
  let riskColor = "text-[var(--color-success)]";
  let riskBg = "bg-[var(--color-success)]/10";
  let riskBorder = "border-[var(--color-success)]/20";
  let riskLabel = "Low Risk";

  if (riskScore >= 70) {
    riskColor = "text-[var(--color-error)]";
    riskBg = "bg-[var(--color-error)]/10";
    riskBorder = "border-[var(--color-error)]/20";
    riskLabel = "Critical Risk";
  } else if (riskScore >= 40) {
    riskColor = "text-[var(--color-warning)]";
    riskBg = "bg-[var(--color-warning)]/10";
    riskBorder = "border-[var(--color-warning)]/20";
    riskLabel = "High Risk";
  }

  // Map backend violations to preset scenarios for demo click-through
  const mapViolationToScenario = (type: string): string => {
    const t = type.toLowerCase();
    if (t.includes("return_rate")) return "SCN-001";
    if (t.includes("rating")) return "SCN-002";
    if (t.includes("suspension") || t.includes("health")) return "SCN-003";
    if (t.includes("counterfeit")) return "SCN-005";
    if (t.includes("payout")) return "SCN-009";
    if (t.includes("keyword")) return "SCN-017";
    return "SCN-001"; // fallback
  };

  const handleLaunchInvestigation = async (scenarioId: string) => {
    try {
      toast.loading("Triggering autonomous scenario run...", { id: "trigger-run" });
      const run = await agentService.triggerRun({
        agent_type: "investigation",
        input_data: { marketplace: metrics.marketplace, scenario_id: scenarioId },
      });
      toast.success("AI pipeline launched for scenario!", { id: "trigger-run" });
      router.push(`/investigations?run_id=${run.run_id}`);
    } catch (err: any) {
      console.error(err);
      toast.error(`Launch failed: ${err.message || err}`, { id: "trigger-run" });
    }
  };

  return (
    <>
      <TopBar
        title="Command Center"
        description={`Rohan Enterprises Operations Dashboard · ${metrics.marketplace.toUpperCase()} ${metrics.seller_tier} Tier`}
        actions={
          <button
            onClick={() => router.push("/scenarios")}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-[var(--color-brand-600)] to-[var(--color-accent-600)] text-xs font-semibold rounded-lg text-white shadow-[var(--shadow-glow)] hover:opacity-90 transition-all cursor-pointer border border-transparent"
          >
            <Bot className="h-3.5 w-3.5" />
            Run Demo Preset
          </button>
        }
      />

      <div className="p-6 space-y-6">
        {/* Top health + summary block */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Risk Score Donut Gauge */}
          <Card className="flex flex-col items-center justify-center p-6 text-center relative overflow-hidden">
            <div className="absolute top-3 left-4">
              <span className="text-[10px] uppercase tracking-wider text-[var(--color-text-muted)] font-semibold">Account Security</span>
            </div>
            
            <div className="relative flex items-center justify-center h-40 w-40 mt-2">
              {/* Circular progress bar */}
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  className="stroke-[var(--color-surface-3)] fill-none"
                  strokeWidth="8"
                />
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  className={riskScore >= 70 ? "stroke-[var(--color-error)] fill-none" : riskScore >= 40 ? "stroke-[var(--color-warning)] fill-none" : "stroke-[var(--color-success)] fill-none"}
                  strokeWidth="8"
                  strokeDasharray={`${2 * Math.PI * 40}`}
                  strokeDashoffset={`${2 * Math.PI * 40 * (1 - riskScore / 100)}`}
                  strokeLinecap="round"
                  style={{ transition: "stroke-dashoffset 1s ease-out" }}
                />
              </svg>
              <div className="absolute flex flex-col items-center justify-center">
                <span className="text-3xl font-extrabold tracking-tight tabular-nums">{riskScore}</span>
                <span className="text-[10px] text-[var(--color-text-muted)] font-medium mt-0.5">RISK INDEX</span>
              </div>
            </div>

            <div className={`mt-4 px-3 py-1 rounded-full text-xs font-semibold border ${riskBg} ${riskColor} ${riskBorder}`}>
              {riskLabel}
            </div>
            
            <p className="text-[11px] text-[var(--color-text-muted)] mt-2.5 max-w-[200px]">
              {riskScore >= 70 
                ? "Imminent suspension risk. Review active alerts immediately." 
                : riskScore >= 40 
                ? "Elevated operational risks detected. Corrective actions required."
                : "Operational parameters normal. Continuous monitoring active."}
            </p>
          </Card>

          {/* Quick Stats Strip */}
          <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Card className="hover:border-[var(--color-brand-500)]/20 transition-all flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-[var(--color-text-muted)]">Marketplace Sales (30d)</span>
                  <div className="h-7 w-7 rounded-lg bg-[var(--color-brand-500)]/10 flex items-center justify-center text-[var(--color-brand-400)]">
                    <TrendingUp className="h-4 w-4" />
                  </div>
                </div>
                <h3 className="text-2xl font-bold mt-2 tabular-nums">₹{metrics.total_revenue_30d.toLocaleString()}</h3>
              </div>
              <p className="text-[10px] text-[var(--color-text-muted)] mt-4">
                Total completed orders: <span className="font-semibold text-[var(--color-text-secondary)]">{metrics.total_orders}</span>
              </p>
            </Card>

            <Card className={`hover:border-[var(--color-brand-500)]/20 transition-all flex flex-col justify-between ${returnRate > 0.15 ? "border-[var(--color-error)]/30" : ""}`}>
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-[var(--color-text-muted)]">Return Rate (30d)</span>
                  <div className={`h-7 w-7 rounded-lg flex items-center justify-center ${returnRate > 0.15 ? "bg-[var(--color-error)]/10 text-[var(--color-error)]" : "bg-[var(--color-success)]/10 text-[var(--color-success)]"}`}>
                    <RotateCcw className="h-4 w-4" />
                  </div>
                </div>
                <div className="flex items-baseline gap-2 mt-2">
                  <h3 className={`text-2xl font-bold tabular-nums ${returnRate > 0.15 ? "text-[var(--color-error)]" : ""}`}>
                    {(returnRate * 100).toFixed(1)}%
                  </h3>
                  <span className="text-[10px] text-[var(--color-text-muted)]">Target: &lt;15%</span>
                </div>
              </div>
              <p className="text-[10px] text-[var(--color-text-muted)] mt-4">
                Returned orders: <span className="font-semibold text-[var(--color-text-secondary)]">{metrics.total_returns}</span>
              </p>
            </Card>

            <Card className="hover:border-[var(--color-brand-500)]/20 transition-all flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-[var(--color-text-muted)]">Monitored Listings</span>
                  <div className="h-7 w-7 rounded-lg bg-[var(--color-brand-500)]/10 flex items-center justify-center text-[var(--color-brand-400)]">
                    <Package className="h-4 w-4" />
                  </div>
                </div>
                <h3 className="text-2xl font-bold mt-2 tabular-nums">{activeListingsCount}</h3>
              </div>
              <p className="text-[10px] text-[var(--color-text-muted)] mt-4">
                Active catalog size: <span className="font-semibold text-[var(--color-text-secondary)]">{metrics.active_listings}</span>
              </p>
            </Card>

            <Card className={`hover:border-[var(--color-brand-500)]/20 transition-all flex flex-col justify-between ${payoutAnomalyCount > 0 ? "border-[var(--color-error)]/30" : ""}`}>
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-[var(--color-text-muted)]">Pending Settlements</span>
                  <div className={`h-7 w-7 rounded-lg flex items-center justify-center ${payoutAnomalyCount > 0 ? "bg-[var(--color-error)]/10 text-[var(--color-error)]" : "bg-[var(--color-success)]/10 text-[var(--color-success)]"}`}>
                    <Wallet className="h-4 w-4" />
                  </div>
                </div>
                <div className="flex items-baseline gap-2 mt-2">
                  <h3 className="text-2xl font-bold tabular-nums">₹{metrics.pending_payouts.toLocaleString()}</h3>
                  {payoutAnomalyCount > 0 && (
                    <Badge variant="error" className="animate-pulse">{payoutAnomalyCount} Anomalies</Badge>
                  )}
                </div>
              </div>
              <p className="text-[10px] text-[var(--color-text-muted)] mt-4">
                Expected next payment: <span className="font-semibold text-[var(--color-text-secondary)]">₹{(metrics.total_payouts_30d / 4).toFixed(0).toLocaleString()}</span>
              </p>
            </Card>
          </div>
        </div>

        {/* Main Work Area */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Active Issues Panel */}
          <div className="lg:col-span-2">
            <Card className="h-full">
              <CardHeader className="flex justify-between items-center border-b border-[var(--color-border)] pb-3">
                <div>
                  <CardTitle>Active Operational Issues</CardTitle>
                  <p className="text-xs text-[var(--color-text-muted)] mt-0.5">Click any issue to inspect and launch diagnostic agents</p>
                </div>
                <Badge variant={violationCount > 0 ? "error" : "success"}>
                  {violationCount + (payoutAnomalyCount > 0 ? 1 : 0)} Open
                </Badge>
              </CardHeader>
              
              <div className="divide-y divide-[var(--color-border)]">
                {metrics.violations && metrics.violations.map((violation, idx) => {
                  const isHigh = violation.severity === "critical" || violation.severity === "high";
                  return (
                    <div
                      key={idx}
                      onClick={() => {
                        setSelectedIssue({
                          title: violation.type.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase()),
                          description: violation.description,
                          date: violation.date,
                          severity: violation.severity,
                          type: violation.type,
                          scenarioId: mapViolationToScenario(violation.type),
                          category: "marketplace_violation",
                        });
                        setIsDrawerOpen(true);
                      }}
                      className="py-3.5 px-4 flex items-center justify-between gap-3 hover:bg-[var(--color-surface-3)] transition-colors cursor-pointer group"
                    >
                      <div className="flex items-center gap-3">
                        <StatusDot status={isHigh ? "failed" : "completed"} pulse={isHigh} />
                        <div>
                          <p className="text-sm font-semibold text-[var(--color-text-primary)] group-hover:text-[var(--color-brand-300)] transition-colors">
                            {violation.type.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())}
                          </p>
                          <p className="text-xs text-[var(--color-text-muted)] mt-0.5">{violation.description}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge severity={violation.severity as any}>{violation.severity}</Badge>
                        <ArrowRight className="h-4 w-4 text-[var(--color-text-muted)] opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </div>
                  );
                })}

                {payoutAnomalyCount > 0 && (
                  <div
                    onClick={() => {
                      setSelectedIssue({
                        title: "Payout Reconciliation Discrepancy",
                        description: `${payoutAnomalyCount} settlements were flagged as anomalous by the financial monitoring scanner.`,
                        date: "December 2024",
                        severity: "high",
                        type: "payout_discrepancy",
                        scenarioId: "SCN-009",
                        category: "payout_anomaly",
                      });
                      setIsDrawerOpen(true);
                    }}
                    className="py-3.5 px-4 flex items-center justify-between gap-3 hover:bg-[var(--color-surface-3)] transition-colors cursor-pointer group"
                  >
                    <div className="flex items-center gap-3">
                      <StatusDot status="failed" pulse />
                      <div>
                        <p className="text-sm font-semibold text-[var(--color-text-primary)] group-hover:text-[var(--color-brand-300)] transition-colors">
                          Payout Reconciliation Discrepancies
                        </p>
                        <p className="text-xs text-[var(--color-text-muted)] mt-0.5">Payout cycle amounts do not match calculated marketplace invoices.</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge severity="high">high</Badge>
                      <ArrowRight className="h-4 w-4 text-[var(--color-text-muted)] opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </div>
                )}

                {(!metrics.violations || metrics.violations.length === 0) && payoutAnomalyCount === 0 && (
                  <div className="py-12 text-center flex flex-col items-center justify-center">
                    <ShieldAlert className="h-8 w-8 text-[var(--color-success)] mb-2" />
                    <p className="text-sm font-medium text-[var(--color-text-primary)]">All operational checks normal</p>
                    <p className="text-xs text-[var(--color-text-muted)] mt-1">No violations or payment anomalies detected.</p>
                  </div>
                )}
              </div>
            </Card>
          </div>

          {/* Right Rail: Support Tickets & Timeline */}
          <div className="space-y-6">
            {/* Open Support Tickets */}
            <Card>
              <CardHeader className="flex justify-between items-center border-b border-[var(--color-border)] pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Ticket className="h-4 w-4 text-[var(--color-brand-400)]" />
                  Marketplace Tickets
                </CardTitle>
                <Badge variant="default">{openTickets.length} Active</Badge>
              </CardHeader>
              <div className="p-3 space-y-2 max-h-[250px] overflow-y-auto">
                {openTickets.map((t) => (
                  <div key={t.ticket_id} className="p-2.5 rounded bg-[var(--color-surface-3)] border border-[var(--color-border)] text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-[var(--color-text-primary)] truncate max-w-[150px]">{t.subject}</span>
                      <Badge severity={t.priority === "critical" || t.priority === "high" ? "high" : "medium" as any}>
                        {t.priority}
                      </Badge>
                    </div>
                    <p className="text-[10px] text-[var(--color-text-muted)]">{t.marketplace.toUpperCase()} · Ticket ID: {t.ticket_id}</p>
                    <p className="text-[11px] text-[var(--color-text-secondary)] line-clamp-2 mt-1">{t.description}</p>
                  </div>
                ))}
                {openTickets.length === 0 && (
                  <p className="text-center py-6 text-[11px] text-[var(--color-text-muted)]">No open support tickets.</p>
                )}
              </div>
            </Card>

            {/* What Changed Today */}
            <Card>
              <CardHeader className="border-b border-[var(--color-border)] pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-[var(--color-brand-400)]" />
                  What Changed Today
                </CardTitle>
              </CardHeader>
              <div className="p-4 space-y-3.5 text-xs">
                {[
                  { time: "10:30 AM", type: "return", msg: "3 new returns registered for clothing items" },
                  { time: "09:15 AM", type: "alert", msg: "Payout dispute PAY-2025-002 escalated by AI Agent" },
                  { time: "08:00 AM", type: "payout", msg: "Weekly payout PAY-2025-010 settled for ₹13,140" },
                ].map((item, i) => (
                  <div key={i} className="flex gap-2.5 items-start">
                    <span className="text-[10px] font-mono text-[var(--color-text-muted)] pt-0.5 shrink-0 w-[55px]">{item.time}</span>
                    <div className="space-y-0.5">
                      <p className="text-[var(--color-text-secondary)] leading-normal">{item.msg}</p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>

        {/* Bottom Panel: Collapsible AI Activity Strip */}
        <Card className="overflow-hidden">
          <div
            onClick={() => setIsActivityCollapsed(!isActivityCollapsed)}
            className="p-3 bg-[var(--color-surface-3)] hover:bg-[var(--color-surface-4)] transition-colors cursor-pointer flex items-center justify-between border-b border-[var(--color-border)]"
          >
            <div className="flex items-center gap-2">
              <Bot className="h-4 w-4 text-[var(--color-brand-400)] animate-pulse" />
              <span className="text-xs font-semibold text-[var(--color-text-primary)]">AI Operations Engine Activity</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-[10px] text-[var(--color-text-muted)]">
                {recentRuns.length > 0 ? `Last action: ${recentRuns[0].agent_type} pipeline ${recentRuns[0].status}` : "Engine is idle"}
              </span>
              <button className="text-[11px] text-[var(--color-brand-400)] font-medium hover:underline">
                {isActivityCollapsed ? "Expand" : "Collapse"}
              </button>
            </div>
          </div>
          
          {!isActivityCollapsed && (
            <div className="p-4 space-y-3">
              {recentRuns.length === 0 ? (
                <p className="text-xs text-[var(--color-text-muted)] italic text-center py-4">No recent AI operations recorded.</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                  {recentRuns.map((run) => (
                    <div
                      key={run.run_id}
                      onClick={() => router.push(`/investigations?run_id=${run.run_id}`)}
                      className="p-2.5 rounded bg-[var(--color-surface-2)] border border-[var(--color-border)] hover:border-[var(--color-brand-500)]/30 transition-all cursor-pointer flex flex-col justify-between gap-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] uppercase font-bold text-[var(--color-text-secondary)]">{run.agent_type}</span>
                        <Badge severity={run.status === "completed" ? "low" : run.status === "failed" ? "high" : "medium" as any}>
                          {run.status}
                        </Badge>
                      </div>
                      <p className="text-[10px] font-mono text-[var(--color-text-muted)] truncate">{run.run_id}</p>
                      <p className="text-[9px] text-[var(--color-text-muted)]">{new Date(run.created_at).toLocaleString()}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </Card>
      </div>

      {/* Slide-over drawer for issue details and agent triggering */}
      {isDrawerOpen && selectedIssue && (
        <div className="fixed inset-0 z-50 overflow-hidden" aria-labelledby="slide-over-title" role="dialog" aria-modal="true">
          <div className="absolute inset-0 overflow-hidden">
            {/* Backdrop */}
            <div
              onClick={() => setIsDrawerOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
            />

            <div className="pointer-events-none fixed inset-y-0 right-0 flex max-w-full pl-10">
              <div className="pointer-events-auto w-screen max-w-md">
                <div className="flex h-full flex-col overflow-y-scroll bg-[var(--color-surface-2)] border-l border-[var(--color-border)] shadow-2xl">
                  {/* Header */}
                  <div className="p-6 border-b border-[var(--color-border)] flex items-center justify-between">
                    <div>
                      <h2 className="text-md font-bold text-[var(--color-text-primary)]" id="slide-over-title">
                        {selectedIssue.title}
                      </h2>
                      <p className="text-xs text-[var(--color-text-muted)] mt-1">Detected on {selectedIssue.date}</p>
                    </div>
                    <button
                      onClick={() => setIsDrawerOpen(false)}
                      className="rounded-md p-1 text-[var(--color-text-muted)] hover:bg-[var(--color-surface-3)] hover:text-[var(--color-text-primary)] transition-colors"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>

                  {/* Body */}
                  <div className="flex-1 p-6 space-y-6">
                    <div className="space-y-2">
                      <span className="text-[10px] uppercase font-bold text-[var(--color-text-muted)] tracking-wider">Severity</span>
                      <div>
                        <Badge severity={selectedIssue.severity}>{selectedIssue.severity}</Badge>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <span className="text-[10px] uppercase font-bold text-[var(--color-text-muted)] tracking-wider">Description</span>
                      <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed bg-[var(--color-surface-3)] p-3 rounded-lg border border-[var(--color-border)]">
                        {selectedIssue.description}
                      </p>
                    </div>

                    <div className="space-y-3">
                      <span className="text-[10px] uppercase font-bold text-[var(--color-text-muted)] tracking-wider">Autonomous Actions</span>
                      <div className="p-4 rounded-lg bg-[var(--color-brand-500)]/5 border border-[var(--color-brand-500)]/10 space-y-3">
                        <div className="flex gap-2">
                          <Bot className="h-4 w-4 text-[var(--color-brand-400)] shrink-0 mt-0.5" />
                          <div className="text-xs">
                            <p className="font-semibold text-[var(--color-text-primary)]">Trigger Investigation Pipeline</p>
                            <p className="text-[10px] text-[var(--color-text-muted)] mt-0.5">
                              This launches the Monitoring, Investigation, RAG Policy, and appeal drafting pipeline scoped to this issue.
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
                          Trigger AI Agent Run
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
