"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { TopBar } from "@/components/layout/TopBar";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { StatusDot } from "@/components/ui/StatusDot";
import { listingService } from "@/services/listingService";
import { reviewService, Review } from "@/services/reviewService";
import { chatService, CustomerChat } from "@/services/chatService";
import { ticketService, SupportTicket } from "@/services/ticketService";
import { agentService } from "@/services/agentService";
import type { Listing, ListingIssue } from "@/types/listing";
import { toast } from "sonner";
import {
  Package,
  AlertTriangle,
  CheckCircle,
  Scan,
  Loader2,
  Image as ImageIcon,
  MessageSquare,
  Star,
  Ticket as TicketIcon,
  RotateCcw,
  X,
  Bot,
  Filter,
} from "lucide-react";

export default function ListingsPage() {
  const router = useRouter();
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [scanResults, setScanResults] = useState<Record<string, ListingIssue[]>>({});
  const [hasScanned, setHasScanned] = useState(false);

  // Filters & Tabs
  const [activeTab, setActiveTab] = useState<"all" | "issues" | "healthy" | "draft">("all");
  const [selectedMarketplace, setSelectedMarketplace] = useState<string>("all");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  // Drawer
  const [selectedListing, setSelectedListing] = useState<Listing | null>(null);
  const [drawerReviews, setDrawerReviews] = useState<Review[]>([]);
  const [drawerChats, setDrawerChats] = useState<CustomerChat[]>([]);
  const [drawerTickets, setDrawerTickets] = useState<SupportTicket[]>([]);
  const [loadingDrawerData, setLoadingDrawerData] = useState(false);

  useEffect(() => {
    async function loadListings() {
      try {
        setLoading(true);
        const data = await listingService.getListings();
        setListings(data);
      } catch (err: any) {
        console.error(err);
        toast.error("Failed to load listings");
      } finally {
        setLoading(false);
      }
    }
    loadListings();
  }, []);

  const handleScanListings = async () => {
    try {
      setScanning(true);
      toast.info("Starting Prevention Agent listing check...");
      
      const results = await listingService.checkListings() as any[];
      const newResults: Record<string, ListingIssue[]> = {};
      
      for (const item of results) {
        newResults[item.listing_id] = item.issues;
      }
      
      setScanResults(newResults);
      setHasScanned(true);
      toast.success("Listing checks completed successfully!");
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to scan listings");
    } finally {
      setScanning(false);
    }
  };

  const handleOpenDrawer = async (listing: Listing) => {
    setSelectedListing(listing);
    setLoadingDrawerData(true);
    try {
      const [allReviews, allChats, allTickets] = await Promise.all([
        reviewService.getReviews(),
        chatService.getChats(),
        ticketService.getTickets(),
      ]);

      // filter for current product
      setDrawerReviews(allReviews.filter(r => r.product_id === listing.id));
      setDrawerChats(allChats.filter(c => c.product_id === listing.id));
      setDrawerTickets(allTickets.filter(t => t.related_listings?.includes(listing.id)));
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingDrawerData(false);
    }
  };

  const handleLaunchProductInvestigation = async (listing: Listing) => {
    try {
      toast.loading(`Launching audit for product ${listing.sku}...`, { id: "p-audit" });
      
      // Select appropriate scenario depending on listing's issues or characteristics
      let scenarioId = "SCN-008"; // default listing suppression / chart missing
      if (listing.id === "LST030") scenarioId = "SCN-005"; // counterfeit
      else if (listing.id === "LST016") scenarioId = "SCN-012"; // restricted health
      else if (listing.id === "LST013") scenarioId = "SCN-017"; // keyword stuffing
      else if (listing.id === "LST002" || listing.id === "LST005" || listing.id === "LST012") scenarioId = "SCN-001"; // return rate / size charts

      const run = await agentService.triggerRun({
        agent_type: "investigation",
        input_data: {
          marketplace: listing.marketplace,
          scenario_id: scenarioId,
        },
      });

      toast.success("AI pipeline launched!", { id: "p-audit" });
      setSelectedListing(null);
      router.push(`/investigations?run_id=${run.run_id}`);
    } catch (err: any) {
      console.error(err);
      toast.error(`Audit launch failed: ${err.message || err}`, { id: "p-audit" });
    }
  };

  // Filter listings
  const filteredListings = listings.filter((item) => {
    const issues = scanResults[item.id] || [];
    const hasIssues = issues.length > 0;

    const matchesTab =
      activeTab === "all" ||
      (activeTab === "issues" && (hasIssues || item.status === "suspended" || item.status === "under_review")) ||
      (activeTab === "healthy" && !hasIssues && item.status === "active") ||
      (activeTab === "draft" && item.status === "draft");

    const matchesMarketplace =
      selectedMarketplace === "all" ||
      item.marketplace.toLowerCase() === selectedMarketplace.toLowerCase();

    const matchesCategory =
      selectedCategory === "all" ||
      item.category.toLowerCase() === selectedCategory.toLowerCase();

    return matchesTab && matchesMarketplace && matchesCategory;
  });

  const totalCount = listings.length;
  const issuesCount = listings.filter(
    (item) => (scanResults[item.id]?.length || 0) > 0 || item.status === "suspended"
  ).length;
  const healthyCount = totalCount - issuesCount;

  if (loading) {
    return (
      <>
        <TopBar
          title="Listing Health"
          description="AI-powered catalog validation & safety scanner"
        />
        <div className="flex items-center justify-center min-h-[400px] flex-col gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-[var(--color-brand-400)]" />
          <p className="text-sm text-[var(--color-text-muted)]">Assembling catalog matrix...</p>
        </div>
      </>
    );
  }

  return (
    <>
      <TopBar
        title="Listing Health"
        description="Verify listing quality standards and run autonomous audits before policy compliance reviews"
        actions={
          <Button
            variant="gradient"
            size="sm"
            id="scan-listings-btn"
            onClick={handleScanListings}
            disabled={scanning}
          >
            {scanning ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Scan className="h-3.5 w-3.5" />
            )}
            {scanning ? "Scanning Listings..." : "Scan Catalog (Prevention)"}
          </Button>
        }
      />
      
      <div className="p-6 space-y-6">
        {/* Listings Stats Strip */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="flex items-center gap-4 p-4">
            <div className="h-10 w-10 rounded-xl bg-[var(--color-brand-500)]/10 flex items-center justify-center text-[var(--color-brand-400)]">
              <Package className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-[var(--color-text-muted)]">Tracked Catalog Listings</p>
              <p className="text-xl font-extrabold mt-0.5 tabular-nums">{totalCount}</p>
            </div>
          </Card>
          
          <Card className="flex items-center gap-4 p-4 border-[var(--color-error)]/25">
            <div className="h-10 w-10 rounded-xl bg-[var(--color-error)]/10 flex items-center justify-center text-[var(--color-error)]">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-[var(--color-text-muted)]">Issues / Flagged Listings</p>
              <p className="text-xl font-extrabold mt-0.5 text-[var(--color-error)] tabular-nums">{issuesCount}</p>
            </div>
          </Card>

          <Card className="flex items-center gap-4 p-4 border-[var(--color-success)]/25">
            <div className="h-10 w-10 rounded-xl bg-[var(--color-success)]/10 flex items-center justify-center text-[var(--color-success)]">
              <CheckCircle className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-[var(--color-text-muted)]">Verified Clean Listings</p>
              <p className="text-xl font-extrabold mt-0.5 text-[var(--color-success)] tabular-nums">{healthyCount}</p>
            </div>
          </Card>
        </div>

        {/* Tab & Filter bar */}
        <Card className="p-4 flex flex-col md:flex-row justify-between gap-4 items-center">
          {/* Tabs */}
          <div className="flex bg-[var(--color-surface-3)] p-1 rounded-lg border border-[var(--color-border)] w-full md:w-auto">
            {[
              { id: "all", label: "All Listings" },
              { id: "issues", label: "Flawed / Flags" },
              { id: "healthy", label: "Healthy" },
              { id: "draft", label: "Drafts" },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex-1 md:flex-initial px-4 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                  activeTab === tab.id 
                    ? "bg-[var(--color-surface-1)] text-[var(--color-brand-300)]" 
                    : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Filters */}
          <div className="flex gap-3 w-full md:w-auto">
            <select
              value={selectedMarketplace}
              onChange={(e) => setSelectedMarketplace(e.target.value)}
              className="flex-1 md:flex-initial bg-[var(--color-surface-3)] border border-[var(--color-border)] rounded-lg px-3 py-1.5 text-xs text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-brand-400)] transition-colors h-[34px]"
            >
              <option value="all">All Marketplaces</option>
              <option value="meesho">Meesho</option>
              <option value="amazon">Amazon</option>
              <option value="flipkart">Flipkart</option>
            </select>

            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="flex-1 md:flex-initial bg-[var(--color-surface-3)] border border-[var(--color-border)] rounded-lg px-3 py-1.5 text-xs text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-brand-400)] transition-colors h-[34px]"
            >
              <option value="all">All Categories</option>
              <option value="clothing">Clothing</option>
              <option value="footwear">Footwear</option>
              <option value="electronics">Electronics</option>
              <option value="kitchen">Kitchen</option>
              <option value="home">Home Decor</option>
            </select>
          </div>
        </Card>

        {/* Listings Grid/List */}
        <div className="space-y-4">
          {filteredListings.length === 0 ? (
            <Card className="py-12 text-center text-xs text-[var(--color-text-muted)] italic">
              No matching listings in this category or tab.
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {filteredListings.map((listing) => {
                const issues = scanResults[listing.id] || [];
                const isChecked = hasScanned;
                const hasIssues = issues.length > 0 || listing.status === "suspended" || listing.status === "under_review";
                
                let cardBorderClass = "hover:border-[var(--color-brand-500)]/30 border-[var(--color-border)]";
                if (isChecked || listing.status === "suspended") {
                  cardBorderClass = hasIssues 
                    ? "border-[var(--color-error)]/40 hover:border-[var(--color-error)]/60 bg-[var(--color-error)]/5"
                    : "border-[var(--color-success)]/40 hover:border-[var(--color-success)]/60";
                }

                return (
                  <Card
                    key={listing.id}
                    onClick={() => handleOpenDrawer(listing)}
                    className={`transition-all duration-200 cursor-pointer ${cardBorderClass}`}
                  >
                    <div className="flex flex-col md:flex-row justify-between gap-4">
                      {/* Product Overview */}
                      <div className="flex items-start gap-4">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[var(--color-surface-3)] border border-[var(--color-border)] overflow-hidden">
                          {listing.images && listing.images.length > 0 ? (
                            <img 
                              src={listing.images[0]} 
                              alt={listing.name} 
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <ImageIcon className="h-6 w-6 text-[var(--color-text-muted)]" />
                          )}
                        </div>
                        
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">{listing.name}</h3>
                            <Badge severity={listing.status === "active" ? "low" : listing.status === "suspended" ? "high" : "medium"}>{listing.status}</Badge>
                            <Badge severity="neutral" className="uppercase">{listing.marketplace}</Badge>
                          </div>
                          
                          <p className="text-xs text-[var(--color-text-muted)] mt-1">
                            SKU: <span className="font-mono text-[var(--color-text-secondary)]">{listing.sku}</span> · 
                            Category: <span className="text-[var(--color-text-secondary)]">{listing.category}</span>
                          </p>
                          
                          <div className="flex items-center gap-4 mt-2 text-xs text-[var(--color-text-muted)]">
                            <span>Price: <strong className="text-[var(--color-text-primary)]">₹{listing.price}</strong> <span className="line-through">₹{listing.mrp}</span></span>
                            <span>Stock: <strong className="text-[var(--color-text-primary)]">{listing.stock}</strong></span>
                            {listing.rating && <span>Rating: ⭐{listing.rating.toFixed(1)}</span>}
                          </div>
                        </div>
                      </div>

                      {/* Diagnostic Status */}
                      <div className="flex flex-col md:items-end justify-center min-w-[150px]">
                        {!isChecked && listing.status !== "suspended" ? (
                          <span className="text-xs text-[var(--color-text-muted)] flex items-center gap-1.5 font-medium">
                            <StatusDot status="pending" />
                            Awaiting validation
                          </span>
                        ) : hasIssues ? (
                          <span className="text-xs text-[var(--color-error)] font-semibold flex items-center gap-1.5">
                            <AlertTriangle className="h-4 w-4 text-[var(--color-error)] shrink-0" />
                            Alert Flag Active
                          </span>
                        ) : (
                          <span className="text-xs text-[var(--color-success)] font-semibold flex items-center gap-1.5">
                            <CheckCircle className="h-4 w-4 text-[var(--color-success)] shrink-0" />
                            Passed Checks
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Scanner Issue List */}
                    {isChecked && issues.length > 0 && (
                      <div className="mt-4 pt-3 border-t border-[var(--color-border)] space-y-2">
                        <p className="text-xs font-semibold text-[var(--color-text-secondary)]">Validation Errors:</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          {issues.map((issue, idx) => (
                            <div 
                              key={idx} 
                              className="p-2 rounded bg-[var(--color-surface-1)] border border-[var(--color-border)] flex items-start gap-2"
                            >
                              <AlertTriangle className={`h-4 w-4 shrink-0 mt-0.5 ${issue.severity === "error" ? "text-[var(--color-error)]" : "text-[var(--color-warning)]"}`} />
                              <div>
                                <p className="text-xs font-medium text-[var(--color-text-primary)]">
                                  {issue.message}
                                </p>
                                <p className="text-[10px] text-[var(--color-text-muted)]">
                                  Severity: <span className="capitalize">{issue.severity}</span>
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Slide-over product drawer */}
      {selectedListing && (
        <div className="fixed inset-0 z-50 overflow-hidden" role="dialog" aria-modal="true">
          <div className="absolute inset-0 overflow-hidden">
            <div onClick={() => setSelectedListing(null)} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

            <div className="pointer-events-none fixed inset-y-0 right-0 flex max-w-full pl-10">
              <div className="pointer-events-auto w-screen max-w-lg">
                <div className="flex h-full flex-col overflow-y-scroll bg-[var(--color-surface-2)] border-l border-[var(--color-border)] shadow-2xl">
                  {/* Header */}
                  <div className="p-6 border-b border-[var(--color-border)] flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded bg-[var(--color-surface-3)] overflow-hidden shrink-0 border border-[var(--color-border)]">
                        {selectedListing.images && selectedListing.images.length > 0 ? (
                          <img src={selectedListing.images[0]} className="h-full w-full object-cover" />
                        ) : (
                          <ImageIcon className="h-5 w-5 text-[var(--color-text-muted)]" />
                        )}
                      </div>
                      <div>
                        <h2 className="text-sm font-bold text-[var(--color-text-primary)] leading-tight">{selectedListing.name}</h2>
                        <p className="text-xs text-[var(--color-text-muted)] mt-0.5">SKU: {selectedListing.sku}</p>
                      </div>
                    </div>
                    <button onClick={() => setSelectedListing(null)} className="rounded-md p-1 text-[var(--color-text-muted)] hover:bg-[var(--color-surface-3)] transition-colors">
                      <X className="h-5 w-5" />
                    </button>
                  </div>

                  {/* Body */}
                  <div className="flex-1 p-6 space-y-6">
                    {/* Trigger audit block */}
                    <div className="p-4 bg-[var(--color-brand-500)]/5 border border-[var(--color-brand-500)]/10 rounded-lg space-y-3">
                      <div className="flex gap-2">
                        <Bot className="h-4.5 w-4.5 text-[var(--color-brand-400)] shrink-0 mt-0.5" />
                        <div className="text-xs">
                          <h4 className="font-semibold text-[var(--color-text-primary)]">Trigger Autonomous Product Audit</h4>
                          <p className="text-[10px] text-[var(--color-text-muted)] mt-0.5">
                            Launch an Investigation Agent flow specifically to diagnose return rate spikes or regulatory risks for this product.
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleLaunchProductInvestigation(selectedListing)}
                        className="w-full py-2 px-3 bg-gradient-to-r from-[var(--color-brand-600)] to-[var(--color-accent-600)] text-xs font-semibold text-white rounded-lg hover:opacity-90 shadow-[var(--shadow-glow)] cursor-pointer"
                      >
                        Start Diagnostic Audit
                      </button>
                    </div>

                    {loadingDrawerData ? (
                      <div className="flex items-center justify-center py-10 flex-col gap-2">
                        <Loader2 className="h-6 w-6 animate-spin text-[var(--color-brand-400)]" />
                        <span className="text-xs text-[var(--color-text-muted)]">Loading historical references...</span>
                      </div>
                    ) : (
                      <>
                        {/* Return rate details */}
                        <div className="space-y-2">
                          <span className="text-[10px] uppercase font-bold text-[var(--color-text-muted)] tracking-wider flex items-center gap-1">
                            <RotateCcw className="h-3 w-3" /> Returns Breakdown
                          </span>
                          <div className="p-3 bg-[var(--color-surface-3)] rounded-lg border border-[var(--color-border)] flex items-center justify-between text-xs">
                            <div>
                              <p className="text-[var(--color-text-muted)]">Estimated SKU Return Rate</p>
                              <p className="text-lg font-bold text-[var(--color-text-primary)] mt-1">
                                {selectedListing.id === "LST002" ? "61.5%" : selectedListing.id === "LST005" ? "45.0%" : selectedListing.id === "LST012" ? "52.3%" : "4.2%"}
                              </p>
                            </div>
                            <Badge severity={selectedListing.id === "LST002" || selectedListing.id === "LST012" ? "high" : "low"}>
                              {selectedListing.id === "LST002" || selectedListing.id === "LST012" ? "High Risk" : "Healthy"}
                            </Badge>
                          </div>
                        </div>

                        {/* Customer Chats */}
                        <div className="space-y-2">
                          <span className="text-[10px] uppercase font-bold text-[var(--color-text-muted)] tracking-wider flex items-center gap-1">
                            <MessageSquare className="h-3 w-3" /> Customer Conversations
                          </span>
                          <div className="space-y-2 max-h-[180px] overflow-y-auto pr-1">
                            {drawerChats.map(chat => (
                              <div key={chat.chat_id} className="p-2.5 bg-[var(--color-surface-3)] border border-[var(--color-border)] rounded-lg text-xs space-y-1">
                                <div className="flex justify-between font-semibold">
                                  <span className="text-[var(--color-brand-400)]">Category: {chat.category.replace("_", " ")}</span>
                                  <span className="text-[9px] text-[var(--color-text-muted)]">{chat.status}</span>
                                </div>
                                <p className="text-[11px] text-[var(--color-text-secondary)] line-clamp-2">
                                  Customer: &quot;{chat.messages[0]?.text}&quot;
                                </p>
                              </div>
                            ))}
                            {drawerChats.length === 0 && (
                              <p className="text-[10px] text-[var(--color-text-muted)] italic text-center py-2">No recent customer chats for this product.</p>
                            )}
                          </div>
                        </div>

                        {/* Support Tickets */}
                        <div className="space-y-2">
                          <span className="text-[10px] uppercase font-bold text-[var(--color-text-muted)] tracking-wider flex items-center gap-1">
                            <TicketIcon className="h-3 w-3" /> Platform Tickets
                          </span>
                          <div className="space-y-2">
                            {drawerTickets.map(t => (
                              <div key={t.ticket_id} className="p-2.5 bg-[var(--color-surface-3)] border border-[var(--color-border)] rounded-lg text-xs space-y-1">
                                <div className="flex justify-between font-semibold">
                                  <span>{t.subject}</span>
                                  <Badge severity={t.priority === "critical" ? "high" : "medium" as any}>{t.priority}</Badge>
                                </div>
                                <p className="text-[11px] text-[var(--color-text-secondary)]">{t.description}</p>
                              </div>
                            ))}
                            {drawerTickets.length === 0 && (
                              <p className="text-[10px] text(--color-text-muted) italic text-center py-2">No active platform tickets associated.</p>
                            )}
                          </div>
                        </div>

                        {/* Customer Reviews */}
                        <div className="space-y-2">
                          <span className="text-[10px] uppercase font-bold text-[var(--color-text-muted)] tracking-wider flex items-center gap-1">
                            <Star className="h-3 w-3" /> Recent Product Reviews
                          </span>
                          <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                            {drawerReviews.map(r => (
                              <div key={r.review_id} className="p-2.5 bg-[var(--color-surface-3)] border border-[var(--color-border)] rounded-lg text-xs space-y-1">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-0.5 text-yellow-500">
                                    {[...Array(5)].map((_, i) => (
                                      <Star key={i} className={`h-3 w-3 fill-current ${i < r.rating ? "text-yellow-500" : "text-zinc-600"}`} />
                                    ))}
                                  </div>
                                  {r.flagged && <Badge variant="error" className="scale-90">Flagged</Badge>}
                                </div>
                                <h4 className="font-semibold text-[var(--color-text-primary)] mt-1">{r.title}</h4>
                                <p className="text-[11px] text-[var(--color-text-secondary)] leading-relaxed mt-0.5">{r.body}</p>
                              </div>
                            ))}
                            {drawerReviews.length === 0 && (
                              <p className="text-[10px] text-[var(--color-text-muted)] italic text-center py-2">No reviews indexed for this item.</p>
                            )}
                          </div>
                        </div>
                      </>
                    )}
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
