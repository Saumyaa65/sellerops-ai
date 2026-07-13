import apiClient from "@/lib/api-client";

export interface InvestigationScenario {
  scenario_id: string;
  name: string;
  description: string;
  trigger_data: {
    marketplace: string;
    seller_tier?: string;
    scenario_type: string;
  };
  expected_issues: string[];
  expected_severity: string;
  context: string;
}

export const scenarioService = {
  async getScenarios(): Promise<InvestigationScenario[]> {
    const res = await apiClient.get<InvestigationScenario[]>("/scenarios/");
    return res.data;
  },

  async getScenario(id: string): Promise<InvestigationScenario> {
    const res = await apiClient.get<InvestigationScenario>(`/scenarios/${id}`);
    return res.data;
  },
};
