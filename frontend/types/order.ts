export type OrderStatus = "pending" | "shipped" | "delivered" | "returned" | "cancelled";

export interface Order {
  order_id: string;
  product_id: string;
  product_name: string;
  quantity: number;
  order_value: number;
  order_date: string;
  delivery_date?: string;
  status: OrderStatus;
  is_return: boolean;
  return_reason?: string;
  return_date?: string;
  customer_id: string;
  marketplace: string;
  fraud_suspected?: boolean;
  suspicious?: boolean;
}
