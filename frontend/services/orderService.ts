import apiClient from "@/lib/api-client";
import type { Order } from "@/types/order";

export const orderService = {
  async getOrders(): Promise<Order[]> {
    const res = await apiClient.get<Order[]>("/orders/");
    return res.data;
  },

  async getReturns(): Promise<Order[]> {
    const res = await apiClient.get<Order[]>("/orders/returns");
    return res.data;
  },
};
