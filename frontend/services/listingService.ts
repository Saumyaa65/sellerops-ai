import apiClient from "@/lib/api-client";
import type { Listing } from "@/types/listing";

export const listingService = {
  async getListings(): Promise<Listing[]> {
    const res = await apiClient.get<Listing[]>("/listings/");
    return res.data;
  },

  async checkListings(): Promise<unknown[]> {
    const res = await apiClient.post<unknown[]>("/listings/check");
    return res.data;
  },
};
