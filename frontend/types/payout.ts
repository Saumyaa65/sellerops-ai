export interface Payout {
  payout_id: string;
  period: string;
  marketplace: string;
  gross_amount: number;
  deductions: number;
  net_amount: number;
  expected_amount: number;
  variance: number;
  status: "settled" | "pending_review" | "disputed";
  settlement_date?: string;
  is_anomaly: boolean;
  anomaly_reason?: string;
  orders_count: number;
}
