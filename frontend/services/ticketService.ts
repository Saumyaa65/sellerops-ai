import apiClient from "@/lib/api-client";

export interface SupportTicket {
  ticket_id: string;
  seller_id: string;
  marketplace: string;
  category: string;
  status: string;
  priority: string;
  subject: string;
  description: string;
  created_date: string;
  updated_date: string;
  resolution: string | null;
  related_listings?: string[];
  recommended_actions?: string[];
  related_payouts?: string[];
  related_orders?: string[];
  seller_submitted_plan?: string | null;
}

export const ticketService = {
  async getTickets(): Promise<SupportTicket[]> {
    const res = await apiClient.get<SupportTicket[]>("/tickets/");
    return res.data;
  },

  async getOpenTickets(): Promise<SupportTicket[]> {
    const res = await apiClient.get<SupportTicket[]>("/tickets/open");
    return res.data;
  },
};
