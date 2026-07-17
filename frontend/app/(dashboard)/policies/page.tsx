"use client";

import { useState } from "react";
import { TopBar } from "@/components/layout/TopBar";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { policyService } from "@/services/policyService";
import { toast } from "sonner";
import { Search, FileText, Loader2, Sparkles, BookOpen, ChevronDown, ChevronRight } from "lucide-react";


function formatAnswerText(text: string) {
  if (!text) return null;
  const lines = text.split("\n");
  return (
    <div className="space-y-2">
      {lines.map((line, idx) => {
        let trimmed = line.trim();
        if (!trimmed) return null;
        trimmed = trimmed.replace(/^#+\s+/, "");
        const isBullet = trimmed.startsWith("-") || trimmed.startsWith("*") || /^\d+\.\s+/.test(trimmed);
        if (isBullet) {
          trimmed = trimmed.replace(/^[-*]\s+/, "").replace(/^\d+\.\s+/, "");
        }
        const parts = trimmed.split(/\*\*([^*]+)\*\*/);
        const renderedLine = parts.map((part, i) => {
          if (i % 2 === 1) {
            return <strong key={i} className="font-bold text-[var(--color-text-primary)]">{part}</strong>;
          }
          return part;
        });
        if (isBullet) {
          return (
            <div key={idx} className="flex items-start gap-2 pl-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--color-brand-400)]" />
              <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed">{renderedLine}</p>
            </div>
          );
        } else {
          return (
            <p key={idx} className="text-xs text-[var(--color-text-secondary)] leading-relaxed">{renderedLine}</p>
          );
        }
      })}
    </div>
  );
}


export default function PoliciesPage() {
  const [query, setQuery] = useState("");
  const [marketplace, setMarketplace] = useState("meesho");
  const [loading, setLoading] = useState(false);
  const [answer, setAnswer] = useState<string | null>(null);
  const [results, setResults] = useState<any[]>([]);
  const [hasQueried, setHasQueried] = useState(false);
  const [isSourcesExpanded, setIsSourcesExpanded] = useState(false);
  const [expandedChunks, setExpandedChunks] = useState<Record<number, boolean>>({});

  const handleQuery = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) {
      toast.warning("Please enter a policy query");
      return;
    }
    if (query.length < 5) {
      toast.warning("Query must be at least 5 characters long");
      return;
    }

    try {
      setLoading(true);
      setAnswer(null);
      setResults([]);
      
      toast.info("Searching marketplace policy manuals via RAG...");
      const data = await policyService.query({
        query: query.trim(),
        marketplace: marketplace.toLowerCase(),
        top_k: 4,
      });

      setAnswer(data.answer || null);
      setResults(data.results || []);
      setHasQueried(true);
      toast.success("Policies retrieved and answer synthesized successfully!");
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to query policies");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <TopBar
        title="Marketplace Rules"
        description="Find the rules that apply to your situation — search across Meesho, Amazon and Flipkart policies"
      />
      <div className="p-6 space-y-6">
        
        {/* Suggested search pills */}
        {!hasQueried && !loading && (
          <div className="flex flex-wrap gap-2">
            <span className="text-xs text-[var(--color-text-muted)] font-medium self-center">Try asking about:</span>
            {[
              "Return policy and penalties",
              "Listing suspension rules",
              "Payment deduction reasons",
            ].map((suggestion) => (
              <button
                key={suggestion}
                onClick={() => setQuery(suggestion)}
                className="text-xs px-3 py-1.5 rounded-full border border-[var(--color-brand-500)]/30 bg-[var(--color-brand-500)]/5 text-[var(--color-brand-300)] hover:bg-[var(--color-brand-500)]/15 transition-colors font-medium cursor-pointer"
              >
                {suggestion}
              </button>
            ))}
          </div>
        )}

        <Card>
          <form onSubmit={handleQuery} className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="sm:w-48">
                <select
                  value={marketplace}
                  onChange={(e) => setMarketplace(e.target.value)}
                  className="w-full bg-[var(--color-surface-3)] border border-[var(--color-border)] rounded-lg px-3 py-2.5 text-sm text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-brand-400)] transition-colors h-[42px]"
                >
                  <option value="meesho">Meesho</option>
                  <option value="amazon">Amazon</option>
                  <option value="flipkart">Flipkart</option>
                </select>
              </div>

              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--color-text-muted)]" />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="e.g. What is the return window policy and return rate penalty?"
                  className="w-full bg-[var(--color-surface-3)] border border-[var(--color-border)] rounded-lg pl-9 pr-4 py-2.5 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-brand-400)] transition-colors h-[42px]"
                />
              </div>

              <Button
                variant="gradient"
                size="md"
                type="submit"
                id="policy-query-btn"
                disabled={loading}
                className="h-[42px] shrink-0"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Search className="h-4 w-4" />
                )}
                {loading ? "Searching..." : "Search Rules"}
              </Button>
            </div>
          </form>
        </Card>

        {loading ? (
          <div className="flex items-center justify-center py-20 flex-col gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-[var(--color-brand-400)]" />
            <p className="text-xs text-[var(--color-text-muted)]">Searching the rulebook...</p>
          </div>
        ) : !hasQueried ? (
          <Card>
            <div className="flex items-center justify-center py-16 flex-col gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--color-brand-500)]/10 border border-[var(--color-brand-500)]/25">
                <FileText className="h-8 w-8 text-[var(--color-brand-400)]" />
              </div>
              <div className="text-center max-w-md">
                <p className="text-sm font-medium text-[var(--color-text-primary)]">Search marketplace policies to get started.</p>
                <p className="text-xs text-[var(--color-text-muted)] mt-1">
                  Type a question or use the search bar above. The AI will search the official policy manuals and explain what applies to you.
                </p>
              </div>
            </div>
          </Card>
        ) : (
          <div className="space-y-5">
            {answer && (
              <Card className="border-[var(--color-brand-500)]/30 bg-[var(--color-surface-2)]">
                <div className="p-5 space-y-4">
                  <h3 className="text-sm font-bold text-[var(--color-text-primary)] flex items-center gap-2">
                    <Sparkles className="h-4.5 w-4.5 text-[var(--color-brand-400)] animate-pulse" />
                    Rulebook Summary
                  </h3>
                  <div className="pl-1">
                    {formatAnswerText(answer)}
                  </div>
                </div>
              </Card>
            )}

            {/* Retrieval Summary Info */}
            <div className="flex items-center justify-between text-xs px-1 text-[var(--color-text-muted)] font-medium pt-2 border-t border-[var(--color-border)]/50">
              <span className="flex items-center gap-1 text-[var(--color-success)]">
                ✓ Matched {results.length} relevant policy sections
              </span>
              <span>
                Confidence: <strong className="text-[var(--color-success)] font-semibold">High</strong>
              </span>
            </div>

            {/* Collapsible Sources Panel */}
            <div className="space-y-3">
              <button
                onClick={() => setIsSourcesExpanded(!isSourcesExpanded)}
                className="w-full flex items-center justify-between p-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)] hover:bg-[var(--color-surface-3)] transition-colors text-xs font-semibold text-[var(--color-text-secondary)] cursor-pointer"
              >
                <span className="flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-[var(--color-text-muted)]" />
                  Supporting Policy Sources
                </span>
                <span className="text-[10px] font-medium text-[var(--color-text-muted)] flex items-center gap-1">
                  {isSourcesExpanded ? "Hide Sources" : "Show Sources"}
                  {isSourcesExpanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                </span>
              </button>

              {isSourcesExpanded && (
                results.length === 0 ? (
                  <p className="text-xs text-[var(--color-text-muted)] italic text-center py-4">No matching chunks found in policy library.</p>
                ) : (
                  <div className="grid grid-cols-1 gap-3.5 animate-slide-down">
                    {results.map((chunk, idx) => {
                      const isExpanded = !!expandedChunks[idx];
                      const scoreStr = chunk.score !== undefined ? `${(chunk.score * 100).toFixed(0)}% Match` : null;
                      return (
                        <Card key={idx} className="p-3.5 hover:border-[var(--color-border-hover)] transition-all">
                          <div className="flex flex-col gap-2">
                            <div className="flex items-center justify-between gap-4 border-b border-[var(--color-border)]/50 pb-2">
                              <div className="min-w-0">
                                <span className="font-bold text-xs text-[var(--color-brand-400)] block truncate">
                                  {chunk.payload?.source || "Policy Document"}
                                </span>
                                <span className="text-[10px] text-[var(--color-text-muted)] mt-0.5 block truncate">
                                  Section: {chunk.payload?.section || "General Clauses"}
                                </span>
                              </div>
                              {scoreStr && (
                                <Badge severity="low" className="shrink-0 text-[9px] scale-90">
                                  {scoreStr}
                                </Badge>
                              )}
                            </div>
                            
                            <p className={`text-[11px] text-[var(--color-text-secondary)] italic leading-relaxed whitespace-pre-wrap ${!isExpanded && "line-clamp-2"}`}>
                              &quot;{chunk.payload?.text}&quot;
                            </p>
                            
                            <button
                              onClick={() => setExpandedChunks(prev => ({ ...prev, [idx]: !prev[idx] }))}
                              className="text-[10px] text-[var(--color-brand-400)] hover:text-[var(--color-brand-300)] font-semibold mt-1 transition-colors cursor-pointer self-start"
                            >
                              {isExpanded ? "Show Less" : "View Full Excerpt"}
                            </button>
                          </div>
                        </Card>
                      );
                    })}
                  </div>
                )
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
