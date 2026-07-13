import apiClient from "@/lib/api-client";

export interface ChatMessage {
  sender: "customer" | "seller";
  time: string;
  text: string;
}

export interface CustomerChat {
  chat_id: string;
  order_id: string | null;
  customer_id: string;
  product_id: string;
  date: string;
  status: "resolved" | "escalated" | "flagged" | "pending";
  category: string;
  messages: ChatMessage[];
}

export const chatService = {
  async getChats(): Promise<CustomerChat[]> {
    const res = await apiClient.get<CustomerChat[]>("/chats/");
    return res.data;
  },
};
