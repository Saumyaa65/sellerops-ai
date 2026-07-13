import apiClient from "@/lib/api-client";
import type { Payout } from "@/types/payout";

export const payoutService = {
  async getPayouts(): Promise<Payout[]> {
    const res = await apiClient.get<Payout[]>("/payouts/");
    return res.data;
  },

  async getAnomalies(): Promise<Payout[]> {
    const res = await apiClient.get<Payout[]>("/payouts/anomalies");
    return res.data;
  },
};
