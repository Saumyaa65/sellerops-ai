import apiClient from "@/lib/api-client";

export interface Review {
  review_id: string;
  product_id: string;
  product_name: string;
  customer_id: string;
  rating: number;
  title: string;
  body: string;
  date: string;
  helpful_votes: number;
  marketplace: string;
  verified_purchase: boolean;
  flagged: boolean;
  flag_reason?: string;
}

export const reviewService = {
  async getReviews(): Promise<Review[]> {
    const res = await apiClient.get<Review[]>("/reviews/");
    return res.data;
  },

  async getFlaggedReviews(): Promise<Review[]> {
    const res = await apiClient.get<Review[]>("/reviews/flagged");
    return res.data;
  },
};
