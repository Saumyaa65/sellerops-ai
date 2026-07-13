"use client";

import { useState } from "react";
import { TopBar } from "@/components/layout/TopBar";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { policyService } from "@/services/policyService";
import { toast } from "sonner";
import { Search, FileText, Loader2, Sparkles, BookOpen } from "lucide-react";


export default function PoliciesPage() {
  const [query, setQuery] = useState("");
  const [marketplace, setMarketplace] = useState("meesho");
  const [loading, setLoading] = useState(false);
  const [answer, setAnswer] = useState<string | null>(null);
  const [results, setResults] = useState<any[]>([]);
  const [hasQueried, setHasQueried] = useState(false);

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
                <p className="text-sm font-medium text-[var(--color-text-primary)]">Ask about any marketplace rule</p>
                <p className="text-xs text-[var(--color-text-muted)] mt-1">
                  Type a question or click one of the suggestions above. The AI will search the official policy manuals and explain what applies to you.
                </p>
              </div>
            </div>
          </Card>
        ) : (
          <div className="space-y-6">
            
            {answer && (
              <Card className="border-[var(--color-brand-500)]/20">
                <div className="p-4 space-y-3">
                  <h3 className="text-sm font-semibold text-[var(--color-text-primary)] flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-[var(--color-brand-400)]" />
                    What the rules say
                  </h3>
                  <div className="p-4 rounded-lg bg-[var(--color-surface-3)] border border-[var(--color-border)] text-xs text-[var(--color-text-secondary)] leading-relaxed whitespace-pre-wrap">
                    {answer}
                  </div>
                </div>
              </Card>
            )}

            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-[var(--color-text-primary)] flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-[var(--color-text-muted)]" />
                Retrieved Policy Excerpts
              </h3>
              
              {results.length === 0 ? (
                <p className="text-xs text-[var(--color-text-muted)]">No matching chunks found in policy library.</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {results.map((chunk, idx) => (
                    <Card key={idx} className="hover:border-[var(--color-brand-500)]/20 transition-all">
                      <div className="space-y-2 text-xs">
                        <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-2 mb-2">
                          <span className="font-semibold text-[var(--color-brand-400)]">
                            {chunk.payload?.source || "Policy Document"}
                          </span>
                        </div>
                        <p className="text-[var(--color-text-secondary)] italic leading-relaxed text-[11px] whitespace-pre-wrap">
                          &quot;{chunk.payload?.text}&quot;
                        </p>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>

          </div>
        )}
      </div>
    </>
  );
}
