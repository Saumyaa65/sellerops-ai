"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { TopBar } from "@/components/layout/TopBar";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { StatusDot } from "@/components/ui/StatusDot";
import { orderService } from "@/services/orderService";
import { payoutService } from "@/services/payoutService";
import { agentService } from "@/services/agentService";
import type { Order } from "@/types/order";
import type { Payout } from "@/types/payout";
import { toast } from "sonner";
import {
  Search,
  AlertTriangle,
  Loader2,
  RefreshCw,
  Wallet,
  TrendingDown,
  ArrowRight,
  ShieldCheck,
  ShoppingBag,
  TrendingUp,
  FileText,
  DollarSign,
  RotateCcw,
  Bot,
} from "lucide-react";

export default function OperationsPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"orders" | "returns" | "payouts" | "anomalies">("orders");
  const [orders, setOrders] = useState<Order[]>([]);
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [loading, setLoading] = useState(true);

  // Search & Filter state
  const [orderSearch, setOrderSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [marketplaceFilter, setMarketplaceFilter] = useState("all");

  const loadData = async () => {
    try {
      setLoading(true);
      const [orderData, payoutData] = await Promise.all([
        orderService.getOrders(),
        payoutService.getPayouts(),
      ]);
      setOrders(orderData);
      setPayouts(payoutData);
    } catch (err: any) {
      console.error(err);
      toast.error("Failed to load operations data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleLaunchPayoutDispute = async (payoutId: string) => {
    try {
      toast.loading(`Triggering investigation for dispute payload PAY-2024-005...`, { id: "payout-dispute" });
      const run = await agentService.triggerRun({
        agent_type: "investigation",
        input_data: {
          marketplace: "meesho",
          scenario_id: "SCN-009", // Payout deduction dispute
        },
      });
      toast.success("AI pipeline launched for payout dispute!", { id: "payout-dispute" });
      router.push(`/investigations?run_id=${run.run_id}`);
    } catch (err: any) {
      console.error(err);
      toast.error(`Dispute trigger failed: ${err.message || err}`, { id: "payout-dispute" });
    }
  };

  const handleLaunchReturnAppeal = async (order: Order) => {
    try {
      toast.loading(`Launching return fraud investigation for ${order.order_id}...`, { id: "return-fraud" });
      
      let scenarioId = "SCN-014"; // Fraud detection return abuse default
      if (order.return_reason?.toLowerCase().includes("size")) {
        scenarioId = "SCN-001"; // apparel return size chart missing
      } else if (order.return_reason?.toLowerCase().includes("defect") || order.return_reason?.toLowerCase().includes("quality")) {
        scenarioId = "SCN-006"; // Sku quality issues
      }

      const run = await agentService.triggerRun({
        agent_type: "investigation",
        input_data: {
          marketplace: order.marketplace,
          scenario_id: scenarioId,
        },
      });

      toast.success("Return fraud audit started!", { id: "return-fraud" });
      router.push(`/investigations?run_id=${run.run_id}`);
    } catch (err: any) {
      console.error(err);
      toast.error(`Audit launch failed: ${err.message || err}`, { id: "return-fraud" });
    }
  };

  // Filters
  const filteredOrders = orders.filter((o) => {
    const matchesSearch =
      o.order_id.toLowerCase().includes(orderSearch.toLowerCase()) ||
      o.product_name.toLowerCase().includes(orderSearch.toLowerCase());
    
    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "returned" && o.is_return) ||
      (statusFilter === "suspicious" && (o.fraud_suspected || o.suspicious)) ||
      (statusFilter === "delivered" && o.status === "delivered" && !o.is_return);

    const matchesMarketplace =
      marketplaceFilter === "all" ||
      o.marketplace.toLowerCase() === marketplaceFilter.toLowerCase();

    return matchesSearch && matchesStatus && matchesMarketplace;
  });

  const returns = orders.filter((o) => o.is_return);
  const anomalies = payouts.filter((p) => p.is_anomaly);
  const suspiciousOrders = orders.filter((o) => o.fraud_suspected || o.suspicious);

  if (loading) {
    return (
      <>
        <TopBar title="Operations & Ledgers" description="Financial settlements and sales monitoring" />
        <div className="flex items-center justify-center min-h-[400px] flex-col gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-[var(--color-brand-400)]" />
          <p className="text-sm text-[var(--color-text-muted)]">Reconciling transaction logs...</p>
        </div>
      </>
    );
  }

  return (
    <>
      <TopBar 
        title="Operations & Ledgers" 
        description="Monitor cashflow parameters, payout anomalies, and product returns"
        actions={
          <button
            onClick={loadData}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--color-surface-3)] hover:bg-[var(--color-surface-4)] text-xs font-semibold rounded-lg border border-[var(--color-border)] transition-colors text-[var(--color-text-primary)] cursor-pointer"
          >
            <RefreshCw className="h-3.5 w-3.5 text-[var(--color-brand-400)]" />
            Sync Ledger
          </button>
        }
      />
      
      <div className="p-6 space-y-6">
        {/* Statistics Horizontal Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="p-4 flex items-center gap-3.5">
            <div className="h-9 w-9 rounded-xl bg-[var(--color-brand-500)]/10 flex items-center justify-center text-[var(--color-brand-400)]">
              <ShoppingBag className="h-4.5 w-4.5" />
            </div>
            <div>
              <p className="text-[10px] text-[var(--color-text-muted)] uppercase tracking-wider font-semibold">Total Orders (30d)</p>
              <p className="text-lg font-bold mt-0.5 tabular-nums">{orders.length}</p>
            </div>
          </Card>

          <Card className={`p-4 flex items-center gap-3.5 ${returns.length > 0 ? "border-[var(--color-error)]/25" : ""}`}>
            <div className="h-9 w-9 rounded-xl bg-[var(--color-error)]/10 flex items-center justify-center text-[var(--color-error)]">
              <RotateCcw className="h-4.5 w-4.5" />
            </div>
            <div>
              <p className="text-[10px] text-[var(--color-text-muted)] uppercase tracking-wider font-semibold">Returned SKUs</p>
              <div className="flex items-baseline gap-1.5">
                <p className="text-lg font-bold mt-0.5 tabular-nums text-[var(--color-error)]">{returns.length}</p>
                <span className="text-[10px] text-[var(--color-text-muted)]">({((returns.length / Math.max(orders.length, 1)) * 100).toFixed(0)}%)</span>
              </div>
            </div>
          </Card>

          <Card className="p-4 flex items-center gap-3.5">
            <div className="h-9 w-9 rounded-xl bg-[var(--color-brand-500)]/10 flex items-center justify-center text-[var(--color-brand-400)]">
              <Wallet className="h-4.5 w-4.5" />
            </div>
            <div>
              <p className="text-[10px] text-[var(--color-text-muted)] uppercase tracking-wider font-semibold">Disbursed cycles</p>
              <p className="text-lg font-bold mt-0.5 tabular-nums">{payouts.length}</p>
            </div>
          </Card>

          <Card className={`p-4 flex items-center gap-3.5 ${anomalies.length > 0 ? "border-[var(--color-error)]/25 animate-pulse" : ""}`}>
            <div className={`h-9 w-9 rounded-xl flex items-center justify-center ${anomalies.length > 0 ? "bg-[var(--color-error)]/10 text-[var(--color-error)]" : "bg-[var(--color-success)]/10 text-[var(--color-success)]"}`}>
              <AlertTriangle className="h-4.5 w-4.5" />
            </div>
            <div>
              <p className="text-[10px] text-[var(--color-text-muted)] uppercase tracking-wider font-semibold">Payout Anomalies</p>
              <p className={`text-lg font-bold mt-0.5 tabular-nums ${anomalies.length > 0 ? "text-[var(--color-error)]" : "text-[var(--color-success)]"}`}>
                {anomalies.length} Flagged
              </p>
            </div>
          </Card>
        </div>

        {/* Tab switcher */}
        <Card className="p-3 flex bg-[var(--color-surface-3)] border border-[var(--color-border)] rounded-xl w-full">
          {[
            { id: "orders", label: `Fulfillment Logs (${filteredOrders.length})` },
            { id: "returns", label: `Returned Items (${returns.length})` },
            { id: "payouts", label: `Payout Settlements (${payouts.length})` },
            { id: "anomalies", label: `Payout Discrepancies (${anomalies.length})` },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex-1 text-center py-2 px-3 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                activeTab === tab.id
                  ? "bg-[var(--color-surface-1)] text-[var(--color-brand-300)] shadow"
                  : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </Card>

        {/* Tab content */}
        
        {/* ORDERS TAB */}
        {activeTab === "orders" && (
          <div className="space-y-4">
            <Card className="p-4 flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--color-text-muted)]" />
                <input
                  type="text"
                  placeholder="Filter by Order ID or Product Name..."
                  value={orderSearch}
                  onChange={(e) => setOrderSearch(e.target.value)}
                  className="w-full bg-[var(--color-surface-3)] border border-[var(--color-border)] rounded-lg pl-9 pr-4 py-2 text-xs text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-brand-400)] transition-colors h-[34px]"
                />
              </div>
              <div className="flex gap-3">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="bg-[var(--color-surface-3)] border border-[var(--color-border)] rounded-lg px-3 py-1.5 text-xs text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-brand-400)] transition-colors h-[34px]"
                >
                  <option value="all">All Statuses</option>
                  <option value="delivered">Delivered Only</option>
                  <option value="returned">Returns Only</option>
                  <option value="suspicious">Fraud Flags Only</option>
                </select>
                <select
                  value={marketplaceFilter}
                  onChange={(e) => setMarketplaceFilter(e.target.value)}
                  className="bg-[var(--color-surface-3)] border border-[var(--color-border)] rounded-lg px-3 py-1.5 text-xs text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-brand-400)] transition-colors h-[34px]"
                >
                  <option value="all">All Marketplaces</option>
                  <option value="meesho">Meesho</option>
                  <option value="amazon">Amazon</option>
                  <option value="flipkart">Flipkart</option>
                </select>
              </div>
            </Card>

            <Card>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-[var(--color-border)] text-[var(--color-text-muted)]">
                      <th className="py-3 px-4 font-semibold">Order ID</th>
                      <th className="py-3 px-4 font-semibold">Product Name</th>
                      <th className="py-3 px-4 font-semibold">Marketplace</th>
                      <th className="py-3 px-4 font-semibold">Order Date</th>
                      <th className="py-3 px-4 font-semibold">Value</th>
                      <th className="py-3 px-4 font-semibold">Status</th>
                      <th className="py-3 px-4 font-semibold">Flags/Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--color-border)]">
                    {filteredOrders.map((o) => {
                      const isSuspicious = o.fraud_suspected || o.suspicious;
                      return (
                        <tr key={o.order_id} className={`hover:bg-[var(--color-surface-3)]/50 transition-colors ${isSuspicious ? "bg-[var(--color-error)]/[0.03]" : ""}`}>
                          <td className="py-3 px-4 font-mono text-[11px] text-[var(--color-text-primary)]">
                            {o.order_id}
                          </td>
                          <td className="py-3 px-4 text-[var(--color-text-secondary)] font-medium">
                            {o.product_name}
                            <span className="block text-[10px] font-mono text-[var(--color-text-muted)] mt-0.5">
                              SKU: {o.product_id}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <Badge severity="neutral" className="capitalize">{o.marketplace}</Badge>
                          </td>
                          <td className="py-3 px-4 text-[var(--color-text-muted)]">
                            {new Date(o.order_date).toLocaleDateString()}
                          </td>
                          <td className="py-3 px-4 font-semibold text-[var(--color-text-primary)]">
                            ₹{o.order_value}
                          </td>
                          <td className="py-3 px-4">
                            <Badge severity={o.is_return ? "critical" : isSuspicious ? "high" : o.status === "delivered" ? "low" : "medium"}>
                              {o.is_return ? "returned" : isSuspicious ? "suspected fraud" : o.status}
                            </Badge>
                          </td>
                          <td className="py-3 px-4 text-[var(--color-text-muted)]">
                            {o.is_return && o.return_reason ? (
                              <span className="flex items-center gap-1 text-[var(--color-error)] text-[10px]">
                                <AlertTriangle className="h-3 w-3 shrink-0" />
                                {o.return_reason}
                              </span>
                            ) : isSuspicious ? (
                              <span className="flex items-center gap-1 text-[var(--color-warning)] text-[10px] font-semibold">
                                <AlertTriangle className="h-3 w-3 shrink-0" />
                                Suspected Return Abuse Flag
                              </span>
                            ) : (
                              "-"
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        )}

        {/* RETURNS TAB */}
        {activeTab === "returns" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left panels: return categorization */}
            <div className="lg:col-span-1 space-y-4">
              <Card className="p-4">
                <CardTitle className="text-xs uppercase tracking-wider text-[var(--color-text-muted)] font-semibold mb-3">
                  Return Claims Summary
                </CardTitle>
                <div className="space-y-3">
                  <div className="p-2.5 rounded bg-[var(--color-surface-3)] flex justify-between items-center text-xs">
                    <span>Seller-Responsible Returns</span>
                    <span className="font-bold text-[var(--color-error)]">{returns.filter(r => r.return_reason?.toLowerCase().includes("wrong") || r.return_reason?.toLowerCase().includes("defect") || r.return_reason?.toLowerCase().includes("size")).length}</span>
                  </div>
                  <div className="p-2.5 rounded bg-[var(--color-surface-3)] flex justify-between items-center text-xs">
                    <span>Buyer-Responsible / Changed Mind</span>
                    <span className="font-bold text-[var(--color-text-secondary)]">{returns.filter(r => r.return_reason?.toLowerCase().includes("change") || r.return_reason?.toLowerCase().includes("mistake") || !r.return_reason).length}</span>
                  </div>
                  <div className="p-2.5 rounded bg-[var(--color-surface-3)] flex justify-between items-center text-xs">
                    <span>Suspicious Return Attempts</span>
                    <span className="font-bold text-[var(--color-warning)]">{suspiciousOrders.length}</span>
                  </div>
                </div>
              </Card>

              <Card className="p-4 border-[var(--color-brand-500)]/20">
                <CardTitle className="text-xs uppercase tracking-wider text-[var(--color-text-muted)] font-semibold mb-2">
                  Return Policy Safeguards
                </CardTitle>
                <p className="text-[11px] text-[var(--color-text-secondary)] leading-relaxed">
                  Meesho and Amazon policies permit sellers to appeal returns categorised as seller-responsible if proof of correct shipment is provided within 14 days.
                </p>
              </Card>
            </div>

            {/* Right panel: returns logs table */}
            <div className="lg:col-span-2">
              <Card>
                <CardHeader className="pb-3 border-b border-[var(--color-border)]">
                  <CardTitle>Return Incident Log</CardTitle>
                </CardHeader>
                <div className="divide-y divide-[var(--color-border)]">
                  {returns.slice(0, 10).map((r) => (
                    <div key={r.order_id} className="p-4 flex items-center justify-between gap-4 text-xs hover:bg-[var(--color-surface-3)] transition-colors group">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-semibold text-[var(--color-text-primary)]">{r.order_id}</span>
                          <Badge severity="neutral" className="uppercase scale-90">{r.marketplace}</Badge>
                        </div>
                        <p className="font-medium text-[var(--color-text-secondary)] mt-1">{r.product_name}</p>
                        <p className="text-[10px] text-[var(--color-error)] font-medium mt-0.5 flex items-center gap-1">
                          <AlertTriangle className="h-3 w-3 shrink-0" /> Reason: {r.return_reason || "Not specified"}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <span className="font-bold text-[var(--color-text-primary)]">₹{r.order_value}</span>
                        <button
                          onClick={() => handleLaunchReturnAppeal(r)}
                          className="flex items-center gap-1 px-2.5 py-1 bg-[var(--color-surface-3)] hover:bg-[var(--color-surface-4)] rounded border border-[var(--color-border)] hover:border-[var(--color-brand-500)]/40 text-[10px] font-semibold text-[var(--color-text-secondary)] group-hover:text-[var(--color-brand-300)] transition-all cursor-pointer"
                        >
                          Launch Appeal Audit
                          <ArrowRight className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          </div>
        )}

        {/* PAYOUTS TAB */}
        {activeTab === "payouts" && (
          <div className="space-y-6">
            {/* Payouts list table */}
            <Card>
              <CardHeader className="pb-3 border-b border-[var(--color-border)]">
                <CardTitle>Payout Reconciliation Ledger</CardTitle>
              </CardHeader>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-[var(--color-border)] text-[var(--color-text-muted)]">
                      <th className="py-3 px-4 font-semibold">Payout ID</th>
                      <th className="py-3 px-4 font-semibold">Settlement Period</th>
                      <th className="py-3 px-4 font-semibold">Marketplace</th>
                      <th className="py-3 px-4 font-semibold">Gross Sales</th>
                      <th className="py-3 px-4 font-semibold">Deductions Breakdown</th>
                      <th className="py-3 px-4 font-semibold">Net Received</th>
                      <th className="py-3 px-4 font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--color-border)]">
                    {payouts.map((p) => {
                      const net = p.net_amount;
                      const exp = p.expected_amount;
                      const isDiscrepancy = p.is_anomaly;

                      return (
                        <tr key={p.payout_id} className={`hover:bg-[var(--color-surface-3)]/50 transition-colors ${isDiscrepancy ? "bg-[var(--color-error)]/[0.03]" : ""}`}>
                          <td className="py-3.5 px-4 font-mono text-[11px] text-[var(--color-text-primary)]">
                            {p.payout_id}
                          </td>
                          <td className="py-3.5 px-4 text-[var(--color-text-secondary)] font-medium">
                            {p.period}
                          </td>
                          <td className="py-3.5 px-4">
                            <Badge severity="neutral" className="uppercase">{p.marketplace}</Badge>
                          </td>
                          <td className="py-3.5 px-4 font-semibold text-[var(--color-text-muted)]">
                            ₹{p.gross_amount.toLocaleString()}
                          </td>
                          {/* Deductions visual breakdown bar */}
                          <td className="py-3.5 px-4 min-w-[200px]">
                            <div className="space-y-1">
                              <div className="flex justify-between text-[9px] text-[var(--color-text-muted)]">
                                <span>Total: ₹{p.deductions.toLocaleString()}</span>
                                <span>Platform/Return/Penalty</span>
                              </div>
                              <div className="h-2 w-full rounded-full bg-zinc-800 flex overflow-hidden">
                                <div className="bg-purple-600 h-full w-[45%]" title="Platform Fee" />
                                <div className="bg-orange-500 h-full w-[25%]" title="Return Shipping" />
                                <div className="bg-red-500 h-full w-[30%]" title="Penalties" />
                              </div>
                            </div>
                          </td>
                          <td className="py-3.5 px-4 font-bold text-[var(--color-text-primary)]">
                            ₹{net.toLocaleString()}
                          </td>
                          <td className="py-3.5 px-4">
                            <Badge severity={isDiscrepancy ? "high" : p.status === "settled" ? "low" : "medium"}>
                              {isDiscrepancy ? "discrepancy" : p.status}
                            </Badge>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        )}

        {/* ANOMALIES TAB */}
        {activeTab === "anomalies" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {anomalies.map((an) => (
              <Card
                key={an.payout_id}
                className="border-[var(--color-error)]/30 bg-[var(--color-error)]/5 hover:border-[var(--color-error)]/50 transition-all flex flex-col justify-between"
              >
                <div className="p-5 space-y-4">
                  {/* Header */}
                  <div className="flex justify-between items-start gap-3 border-b border-[var(--color-border)]/30 pb-3">
                    <div>
                      <span className="text-[10px] font-mono font-bold text-[var(--color-text-muted)] uppercase bg-[var(--color-surface-3)] px-1.5 py-0.5 rounded border border-[var(--color-border)]">
                        {an.payout_id}
                      </span>
                      <h3 className="text-xs font-semibold text-[var(--color-text-muted)] mt-1.5">
                        Period: {an.period} · {an.marketplace.toUpperCase()}
                      </h3>
                    </div>
                    <Badge severity="high">Discrepancy</Badge>
                  </div>

                  {/* Financial discrepancy */}
                  <div className="grid grid-cols-3 gap-2 py-2 text-center border-b border-[var(--color-border)]/30 pb-4">
                    <div className="p-2 rounded bg-[var(--color-surface-3)]">
                      <p className="text-[9px] text-[var(--color-text-muted)] uppercase">Expected</p>
                      <p className="text-sm font-bold text-[var(--color-text-secondary)] mt-1">₹{an.expected_amount.toLocaleString()}</p>
                    </div>
                    <div className="p-2 rounded bg-[var(--color-surface-3)]">
                      <p className="text-[9px] text-[var(--color-text-muted)] uppercase">Settled</p>
                      <p className="text-sm font-bold text-[var(--color-text-secondary)] mt-1">₹{an.net_amount.toLocaleString()}</p>
                    </div>
                    <div className="p-2 rounded bg-[var(--color-error)]/10 text-[var(--color-error)] border border-[var(--color-error)]/20">
                      <p className="text-[9px] uppercase">Variance</p>
                      <p className="text-sm font-extrabold mt-1">₹{an.variance.toLocaleString()}</p>
                    </div>
                  </div>

                  {/* Reason description */}
                  <div className="space-y-1">
                    <span className="text-[9px] uppercase tracking-wider text-[var(--color-text-muted)] font-bold">Audit findings:</span>
                    <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed italic">
                      &quot;{an.anomaly_reason}&quot;
                    </p>
                  </div>
                </div>

                {/* Dispute trigger button */}
                <div className="p-4 border-t border-[var(--color-border)]/30 bg-[var(--color-surface-3)]/20 rounded-b-xl">
                  <button
                    onClick={() => handleLaunchPayoutDispute(an.payout_id)}
                    className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-[var(--color-surface-3)] hover:bg-[var(--color-surface-4)] text-xs font-semibold rounded-lg border border-[var(--color-border)] hover:border-[var(--color-brand-500)]/40 transition-colors text-[var(--color-text-primary)] cursor-pointer"
                  >
                    <Bot className="h-4 w-4 text-[var(--color-brand-400)]" />
                    Trigger Settlement Audit
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </Card>
            ))}
            {anomalies.length === 0 && (
              <Card className="col-span-2 py-16 text-center">
                <ShieldCheck className="h-10 w-10 text-[var(--color-success)] mx-auto mb-2" />
                <p className="text-sm font-medium text-[var(--color-text-primary)]">All payouts fully reconciled</p>
                <p className="text-xs text-[var(--color-text-muted)] mt-1">No discrepancies detected in payout cycles.</p>
              </Card>
            )}
          </div>
        )}
      </div>
    </>
  );
}
