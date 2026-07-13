"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { scenarioService, InvestigationScenario } from "@/services/scenarioService";
import { agentService } from "@/services/agentService";
import { TopBar } from "@/components/layout/TopBar";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { toast } from "sonner";
import {
  Search,
  Play,
  Loader2,
  AlertTriangle,
  Layers,
  Database,
} from "lucide-react";

export default function ScenariosPage() {
  const router = useRouter();
  const [scenarios, setScenarios] = useState<InvestigationScenario[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedSeverity, setSelectedSeverity] = useState<string>("all");
  const [selectedMarketplace, setSelectedMarketplace] = useState<string>("all");
  const [launchingId, setLaunchingId] = useState<string | null>(null);

  useEffect(() => {
    async function loadScenarios() {
      try {
        setLoading(true);
        const data = await scenarioService.getScenarios();
        setScenarios(data);
      } catch (err) {
        console.error(err);
        toast.error("Failed to load demo presets");
      } finally {
        setLoading(false);
      }
    }
    loadScenarios();
  }, []);

  const handleLaunch = async (scenario: InvestigationScenario) => {
    try {
      setLaunchingId(scenario.scenario_id);
      toast.loading(`Launching AI investigation: ${scenario.name}...`, { id: "launch-scenario" });

      const run = await agentService.triggerRun({
        agent_type: "investigation",
        input_data: {
          marketplace: scenario.trigger_data.marketplace,
          scenario_id: scenario.scenario_id,
        },
      });

      toast.success("Autonomous pipeline run initialized!", { id: "launch-scenario" });
      router.push(`/investigations?run_id=${run.run_id}`);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to trigger scenario", { id: "launch-scenario" });
      setLaunchingId(null);
    }
  };

  const filteredScenarios = scenarios.filter((s) => {
    const matchesSearch =
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.description.toLowerCase().includes(search.toLowerCase()) ||
      s.scenario_id.toLowerCase().includes(search.toLowerCase());

    const matchesSeverity =
      selectedSeverity === "all" ||
      s.expected_severity.toLowerCase() === selectedSeverity.toLowerCase();

    const matchesMarketplace =
      selectedMarketplace === "all" ||
      s.trigger_data.marketplace.toLowerCase() === selectedMarketplace.toLowerCase();

    return matchesSearch && matchesSeverity && matchesMarketplace;
  });

  return (
    <>
      <TopBar
        title="Try a Situation"
        description="Pick one of these real seller situations and watch the AI diagnose it end-to-end"
      />

      <div className="p-6 space-y-6">
        {/* Filters and Search */}
        <Card className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
            {/* Search Input */}
            <div className="relative md:col-span-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--color-text-muted)]" />
              <input
                type="text"
                placeholder="Search scenarios by name, ID, description..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-[var(--color-surface-3)] border border-[var(--color-border)] rounded-lg pl-9 pr-4 py-2 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-brand-400)] transition-colors h-[38px]"
              />
            </div>

            {/* Severity Filter */}
            <div>
              <select
                value={selectedSeverity}
                onChange={(e) => setSelectedSeverity(e.target.value)}
                className="w-full bg-[var(--color-surface-3)] border border-[var(--color-border)] rounded-lg px-3 py-1.5 text-sm text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-brand-400)] transition-colors h-[38px]"
              >
                <option value="all">All Severities</option>
                <option value="critical">Critical</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>

            {/* Marketplace Filter */}
            <div>
              <select
                value={selectedMarketplace}
                onChange={(e) => setSelectedMarketplace(e.target.value)}
                className="w-full bg-[var(--color-surface-3)] border border-[var(--color-border)] rounded-lg px-3 py-1.5 text-sm text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-brand-400)] transition-colors h-[38px]"
              >
                <option value="all">All Marketplaces</option>
                <option value="meesho">Meesho</option>
                <option value="amazon">Amazon</option>
                <option value="flipkart">Flipkart</option>
              </select>
            </div>
          </div>
        </Card>

        {loading ? (
          <div className="flex items-center justify-center py-20 flex-col gap-2">
            <Loader2 className="h-8 w-8 animate-spin text-[var(--color-brand-400)]" />
            <p className="text-sm text-[var(--color-text-muted)]">Loading demo scenario library...</p>
          </div>
        ) : filteredScenarios.length === 0 ? (
          <Card className="text-center py-12">
            <AlertTriangle className="h-8 w-8 text-[var(--color-text-muted)] mx-auto mb-2" />
            <p className="text-sm text-[var(--color-text-muted)]">No scenarios matched your filter criteria.</p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {filteredScenarios.map((scenario) => {
              const isLaunching = launchingId === scenario.scenario_id;
              const severity = scenario.expected_severity.toLowerCase();

              return (
                <Card
                  key={scenario.scenario_id}
                  className="hover:border-[var(--color-brand-500)]/30 transition-all duration-200 flex flex-col justify-between group"
                >
                  <div className="p-5 space-y-3">
                    {/* Header — name + severity, no technical ID */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-bold text-[var(--color-text-primary)] group-hover:text-[var(--color-brand-300)] transition-colors leading-snug">
                          {scenario.name}
                        </h3>
                      </div>
                      <Badge severity={severity as any}>{severity}</Badge>
                    </div>

                    {/* Marketplace pill only */}
                    <div className="flex items-center gap-2 text-[10px] text-[var(--color-text-muted)]">
                      <span className="capitalize font-semibold text-[var(--color-text-secondary)] bg-[var(--color-surface-3)] px-2 py-0.5 rounded-full">
                        {scenario.trigger_data.marketplace}
                      </span>
                    </div>

                    {/* Description */}
                    <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed line-clamp-3">
                      {scenario.description}
                    </p>
                  </div>

                  {/* Launch Button */}
                  <div className="p-4 border-t border-[var(--color-border)] bg-[var(--color-surface-3)]/20 rounded-b-xl">
                    <button
                      onClick={() => handleLaunch(scenario)}
                      disabled={launchingId !== null}
                      className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-gradient-to-r from-[var(--color-brand-600)] to-[var(--color-accent-600)] text-xs font-semibold rounded-lg text-white hover:opacity-90 transition-all shadow-[var(--shadow-glow)] cursor-pointer disabled:opacity-50"
                    >
                      {isLaunching ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Play className="h-3 w-3 shrink-0" />
                      )}
                      {isLaunching ? "Running Analysis..." : "Diagnose This"}
                    </button>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
