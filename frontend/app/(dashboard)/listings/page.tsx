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
  Check,
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

  // Demo Upload Listing drawer states
  const [isUploadDrawerOpen, setIsUploadDrawerOpen] = useState(false);
  const [uploadProgressStep, setUploadProgressStep] = useState<number | null>(null);
  const [progressMessages] = useState([
    "Uploading metadata payload to staging registry...",
    "Executing rule-based AI Prevention checks...",
    "Analyzing listing images using guideline model...",
    "Computing audit health index...",
    "Verification complete!"
  ]);
  const [newProductForm, setNewProductForm] = useState({
    name: "",
    category: "clothing",
    price: "",
    mrp: "",
    description: "",
    imageCount: "1",
    sizeChart: "no"
  });

  const getListingHealth = (listing: Listing) => {
    const issues = scanResults[listing.id] || [];
    const isChecked = scanResults[listing.id] !== undefined;
    if (!isChecked && listing.status !== "suspended") return { score: 100, isChecked };
    
    let score = 100;
    if (listing.status === "suspended") score -= 30;
    else if (listing.status === "under_review") score -= 15;
    
    issues.forEach(issue => {
      if (issue.severity === "error") score -= 15;
      else if (issue.severity === "warning") score -= 7;
      else score -= 3;
    });
    
    return {
      score: Math.max(score, 0),
      isChecked
    };
  };

  const averageHealthScore = listings.length > 0
    ? Math.round(listings.reduce((acc, l) => acc + getListingHealth(l).score, 0) / listings.length)
    : 100;

  const handleDemoUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProductForm.name || !newProductForm.price) {
      toast.error("Please fill in the Product Name and Price");
      return;
    }

    setIsUploadDrawerOpen(false);
    setScanning(true);
    setUploadProgressStep(0);

    for (let step = 0; step < progressMessages.length; step++) {
      await new Promise(resolve => setTimeout(resolve, 600));
      setUploadProgressStep(step);
    }
    
    await new Promise(resolve => setTimeout(resolve, 400));
    setUploadProgressStep(null);
    setScanning(false);

    const tempId = `LST-NEW-${Date.now().toString().slice(-4)}`;
    const priceNum = parseFloat(newProductForm.price) || 0;
    const mrpNum = parseFloat(newProductForm.mrp) || 0;
    const imageCountNum = parseInt(newProductForm.imageCount) || 0;
    
    const newListingObj: Listing = {
      id: tempId,
      name: newProductForm.name,
      category: newProductForm.category as any,
      sku: `${newProductForm.name.slice(0, 3).toUpperCase()}-${Date.now().toString().slice(-4)}`,
      price: priceNum,
      mrp: mrpNum,
      images: imageCountNum > 0 ? ["https://images.unsplash.com/photo-1523381210434-271e8be1f52b?w=200&auto=format&fit=crop&q=60"] : [],
      description: newProductForm.description,
      size_chart: newProductForm.sizeChart === "yes",
      stock: 120,
      marketplace: "meesho",
      status: "draft",
      rating: 0,
      total_reviews: 0,
    };

    const mockIssues: ListingIssue[] = [];
    if (imageCountNum === 0) {
      mockIssues.push({ type: "missing_images", severity: "error", message: "No product images uploaded" });
    } else if (imageCountNum < 3) {
      mockIssues.push({ type: "low_image_count", severity: "warning", message: `Only ${imageCountNum} image(s) — recommend at least 3` });
    }

    if (priceNum <= 0) {
      mockIssues.push({ type: "invalid_price", severity: "error", message: "Selling price must be greater than 0" });
    }
    if (mrpNum > 0 && priceNum > mrpNum) {
      mockIssues.push({ type: "price_above_mrp", severity: "error", message: "Selling price exceeds MRP" });
    }

    if ((newProductForm.category === "clothing" || newProductForm.category === "footwear") && newProductForm.sizeChart === "no") {
      mockIssues.push({ type: "missing_size_chart", severity: "warning", message: "Size chart required for apparel/footwear" });
    }

    if (newProductForm.description.length < 50) {
      mockIssues.push({ type: "thin_description", severity: "warning", message: "Product description is too short" });
    }

    if (imageCountNum > 0) {
      if (newProductForm.name.length % 3 === 0) {
        mockIssues.push({ type: "blurry_image", severity: "warning", message: "Hero image appears blurry. Marketplace recommends replacing it before publishing." });
      }
      if (newProductForm.name.length % 4 === 0) {
        mockIssues.push({ type: "watermark_detected", severity: "error", message: "Watermark/logo detected in product image. Platform rules prohibit custom logos." });
      }
      if (newProductForm.name.length % 5 === 0) {
        mockIssues.push({ type: "missing_white_background", severity: "warning", message: "Missing pure white background. Guidelines require white background for main image." });
      }
      if (newProductForm.name.length % 7 === 0) {
        mockIssues.push({ type: "guideline_violation", severity: "warning", message: "Product occupies less than 85% of image frame. Adjust frame margin." });
      }
    }

    setListings(prev => [newListingObj, ...prev]);
    setScanResults(prev => ({
      ...prev,
      [tempId]: mockIssues
    }));
    setHasScanned(true);
    toast.success("Listing created and verified by AI Prevention Agent!");
  };

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
          title="My Products"
          description="Check listing quality and fix issues before the marketplace flags them"
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
        title="My Products"
        description="Check listing quality and fix issues before the marketplace flags them"
        actions={
          <div className="flex gap-2">
            <Button
              variant="secondary"
              size="sm"
              id="upload-listings-btn"
              onClick={() => setIsUploadDrawerOpen(true)}
              disabled={scanning}
            >
              <Bot className="h-3.5 w-3.5 shrink-0 mr-1 text-[var(--color-brand-400)]" />
              Demo Upload Product
            </Button>
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
              {scanning ? "Checking Products..." : "Check All Products"}
            </Button>
          </div>
        }
      />
      
      <div className="p-6 space-y-6">
        {/* ─── AI Prevention Agent Status Card ─── */}
        <div className="rounded-xl border border-[var(--color-brand-500)]/20 bg-[var(--color-brand-500)]/5 p-5 space-y-3 shadow-[0_0_12px_rgba(99,102,241,0.02)]">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <span className="text-[10px] text-[var(--color-text-muted)] uppercase tracking-wider font-bold">👀 AI Prevention Agent</span>
              <h2 className="text-base font-bold text-[var(--color-text-primary)] mt-0.5">
                {hasScanned ? `${averageHealthScore}/100 Healthy` : "Prevention Status: Pending Scan"}
              </h2>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-[var(--color-text-muted)] bg-[var(--color-surface-3)] px-2.5 py-1 rounded border border-[var(--color-border)]">
                {totalCount} products tracked
              </span>
              {issuesCount > 0 && (
                <span className="text-xs text-[var(--color-error)] bg-[var(--color-error)]/10 px-2.5 py-1 rounded border border-[var(--color-error)]/20 font-semibold">
                  {issuesCount} need attention
                </span>
              )}
              {healthyCount > 0 && (
                <span className="text-xs text-[var(--color-success)] bg-[var(--color-success)]/10 px-2.5 py-1 rounded border border-[var(--color-success)]/20 font-semibold">
                  {healthyCount} healthy
                </span>
              )}
            </div>
          </div>
          
          <div className="border-t border-[var(--color-border)]/20 pt-3 flex flex-col sm:flex-row justify-between gap-2 text-xs text-[var(--color-text-muted)] leading-relaxed">
            <p>
              "The Prevention Agent checks listings before they become operational problems."
            </p>
            <p className="font-semibold text-[var(--color-brand-400)]">
              Scan listings pre-live to maintain high health score & prevent platform suppressions.
            </p>
          </div>
        </div>

        {/* Tab & Filter bar */}
        <Card className="p-4 flex flex-col md:flex-row justify-between gap-4 items-center">
          {/* Tabs */}
          <div className="flex bg-[var(--color-surface-3)] p-1 rounded-lg border border-[var(--color-border)] w-full md:w-auto">
            {[
              { id: "all", label: "All" },
              { id: "issues", label: "Needs Attention" },
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
          {listings.length === 0 ? (
            <Card className="py-12 text-center text-xs text-[var(--color-text-muted)] italic">
              No listings available.
            </Card>
          ) : filteredListings.length === 0 ? (
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
                            Not checked yet
                          </span>
                        ) : hasIssues ? (
                          <span className="text-xs text-[var(--color-error)] font-semibold flex items-center gap-1.5">
                            <AlertTriangle className="h-4 w-4 text-[var(--color-error)] shrink-0" />
                            ⚠ Needs Attention
                          </span>
                        ) : (
                          <span className="text-xs text-[var(--color-success)] font-semibold flex items-center gap-1.5">
                            <CheckCircle className="h-4 w-4 text-[var(--color-success)] shrink-0" />
                            ✓ Looks Good
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Scanner Issue List */}
                    {isChecked && issues.length > 0 && (
                      <div className="mt-4 pt-3 border-t border-[var(--color-border)]/50 space-y-2">
                        <div className="space-y-1.5 text-xs">
                          {issues.map((issue, idx) => {
                            const isError = issue.severity === "error";
                            return (
                              <div key={idx} className="flex items-start gap-2 text-[var(--color-text-secondary)]">
                                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-current" style={{ color: isError ? "var(--color-error)" : "var(--color-warning)" }} />
                                <p className="leading-relaxed">
                                  <strong className={isError ? "text-[var(--color-error)]" : "text-[var(--color-warning)]"}>
                                    {isError ? "Critical: " : "Warning: "}
                                  </strong>
                                  {issue.message}
                                </p>
                              </div>
                            );
                          })}
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
      {/* Slide-over upload drawer */}
      {isUploadDrawerOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden" role="dialog" aria-modal="true">
          <div className="absolute inset-0 overflow-hidden">
            <div onClick={() => setIsUploadDrawerOpen(false)} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

            <div className="pointer-events-none fixed inset-y-0 right-0 flex max-w-full pl-10">
              <div className="pointer-events-auto w-screen max-w-md">
                <form 
                  onSubmit={handleDemoUpload}
                  className="flex h-full flex-col bg-[var(--color-surface-2)] border-l border-[var(--color-border)] shadow-2xl"
                >
                  {/* Header */}
                  <div className="p-6 border-b border-[var(--color-border)] flex items-center justify-between">
                    <div>
                      <h2 className="text-sm font-bold text-[var(--color-text-primary)] flex items-center gap-1.5">
                        <Bot className="h-4.5 w-4.5 text-[var(--color-brand-400)] shrink-0" />
                        👀 AI Prevention Agent · Demo Upload
                      </h2>
                      <p className="text-[10px] text-[var(--color-text-muted)] mt-0.5">
                        Validate custom listings through the AI Prevention Agent
                      </p>
                    </div>
                    <button type="button" onClick={() => setIsUploadDrawerOpen(false)} className="rounded-md p-1 text-[var(--color-text-muted)] hover:bg-[var(--color-surface-3)] transition-colors">
                      <X className="h-5 w-5" />
                    </button>
                  </div>

                  {/* Body */}
                  <div className="flex-1 p-6 space-y-4 overflow-y-auto text-xs">
                    <div className="space-y-1">
                      <label className="font-semibold text-[var(--color-text-secondary)]">Product Name</label>
                      <input 
                        type="text"
                        value={newProductForm.name}
                        onChange={e => setNewProductForm(prev => ({ ...prev, name: e.target.value }))}
                        className="w-full bg-[var(--color-surface-3)] border border-[var(--color-border)] rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-[var(--color-brand-400)] transition-colors"
                        placeholder="e.g. Cotton Polo Shirt"
                        required
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="font-semibold text-[var(--color-text-secondary)]">Category</label>
                      <select 
                        value={newProductForm.category}
                        onChange={e => setNewProductForm(prev => ({ ...prev, category: e.target.value }))}
                        className="w-full bg-[var(--color-surface-3)] border border-[var(--color-border)] rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-[var(--color-brand-400)] transition-colors"
                      >
                        <option value="clothing">Clothing & Apparel</option>
                        <option value="footwear">Footwear</option>
                        <option value="electronics">Electronics</option>
                        <option value="kitchen">Kitchen & Home</option>
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="font-semibold text-[var(--color-text-secondary)]">Price (₹)</label>
                        <input 
                          type="number"
                          value={newProductForm.price}
                          onChange={e => setNewProductForm(prev => ({ ...prev, price: e.target.value }))}
                          className="w-full bg-[var(--color-surface-3)] border border-[var(--color-border)] rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-[var(--color-brand-400)] transition-colors"
                          placeholder="e.g. 599"
                          required
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="font-semibold text-[var(--color-text-secondary)]">MRP (₹)</label>
                        <input 
                          type="number"
                          value={newProductForm.mrp}
                          onChange={e => setNewProductForm(prev => ({ ...prev, mrp: e.target.value }))}
                          className="w-full bg-[var(--color-surface-3)] border border-[var(--color-border)] rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-[var(--color-brand-400)] transition-colors"
                          placeholder="e.g. 999"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="font-semibold text-[var(--color-text-secondary)]">Description</label>
                      <textarea 
                        value={newProductForm.description}
                        onChange={e => setNewProductForm(prev => ({ ...prev, description: e.target.value }))}
                        rows={3}
                        className="w-full bg-[var(--color-surface-3)] border border-[var(--color-border)] rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-[var(--color-brand-400)] transition-colors"
                        placeholder="Detailed listing description..."
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="font-semibold text-[var(--color-text-secondary)]">Number of Images</label>
                        <select 
                          value={newProductForm.imageCount}
                          onChange={e => setNewProductForm(prev => ({ ...prev, imageCount: e.target.value }))}
                          className="w-full bg-[var(--color-surface-3)] border border-[var(--color-border)] rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-[var(--color-brand-400)] transition-colors"
                        >
                          <option value="0">0 Images</option>
                          <option value="1">1 Image</option>
                          <option value="2">2 Images</option>
                          <option value="3">3+ Images</option>
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="font-semibold text-[var(--color-text-secondary)]">Has Size Chart?</label>
                        <select 
                          value={newProductForm.sizeChart}
                          onChange={e => setNewProductForm(prev => ({ ...prev, sizeChart: e.target.value }))}
                          className="w-full bg-[var(--color-surface-3)] border border-[var(--color-border)] rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-[var(--color-brand-400)] transition-colors"
                        >
                          <option value="no">No</option>
                          <option value="yes">Yes</option>
                        </select>
                      </div>
                    </div>

                    <div className="p-3 bg-[var(--color-brand-500)]/5 border border-[var(--color-brand-500)]/15 rounded-lg text-[10px] text-[var(--color-text-muted)] leading-relaxed">
                      "Prevention Agent checks descriptions, pricing margins, and mock hero images deterministic filters before staging to prevent operational suspensions."
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="p-4 border-t border-[var(--color-border)] bg-[var(--color-surface-3)]/30 flex gap-3">
                    <button 
                      type="button" 
                      onClick={() => setIsUploadDrawerOpen(false)}
                      className="flex-1 py-2 px-3 bg-[var(--color-surface-3)] hover:bg-[var(--color-surface-4)] text-xs font-semibold text-[var(--color-text-primary)] rounded-lg border border-[var(--color-border)] transition-colors"
                    >
                      Cancel
                    </button>
                    <button 
                      type="submit"
                      className="flex-1 py-2 px-3 bg-gradient-to-r from-[var(--color-brand-600)] to-[var(--color-accent-600)] text-xs font-semibold text-white rounded-lg hover:opacity-90 transition-all shadow-[var(--shadow-glow)] cursor-pointer"
                    >
                      Validate & Upload
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Progressive loading step overlay */}
      {uploadProgressStep !== null && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-6 text-xs">
          <div className="max-w-md w-full p-6 bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-2xl space-y-4 text-center shadow-2xl">
            <Loader2 className="h-8 w-8 animate-spin text-[var(--color-brand-400)] mx-auto" />
            <div className="space-y-1.5">
              <h3 className="text-sm font-bold text-[var(--color-text-primary)]">👀 Scanning Listing Draft</h3>
              <p className="text-xs text-[var(--color-text-secondary)] font-medium">AI Prevention Agent pipeline active</p>
            </div>
            
            <div className="space-y-2.5 text-left bg-[var(--color-surface-3)] p-4 rounded-xl border border-[var(--color-border)]">
              {progressMessages.map((msg, idx) => {
                const isActive = idx === uploadProgressStep;
                const isDone = idx < uploadProgressStep;
                return (
                  <div key={idx} className="flex items-center gap-2.5">
                    <div className={`h-4.5 w-4.5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                      isDone 
                        ? "bg-[var(--color-success)] text-white" 
                        : isActive 
                        ? "bg-[var(--color-brand-500)] text-white animate-pulse" 
                        : "bg-[var(--color-surface-4)] text-[var(--color-text-muted)] border border-[var(--color-border)]"
                    }`}>
                      {isDone ? "✓" : idx + 1}
                    </div>
                    <span className={isActive ? "font-semibold text-[var(--color-brand-300)]" : isDone ? "text-[var(--color-text-secondary)]" : "text-[var(--color-text-muted)] opacity-50"}>
                      {msg}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
