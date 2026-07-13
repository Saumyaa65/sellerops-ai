import apiClient from "@/lib/api-client";

interface PolicyQueryRequest {
  query: string;
  marketplace?: string;
  top_k?: number;
}

interface PolicyQueryResult {
  query: string;
  results: Array<{ score: number; payload: Record<string, unknown> }>;
  answer?: string;
}

export const policyService = {
  async query(body: PolicyQueryRequest): Promise<PolicyQueryResult> {
    const res = await apiClient.post<PolicyQueryResult>("/policies/query", body);
    return res.data;
  },
};
