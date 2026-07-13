export type ListingStatus = "active" | "draft" | "suspended" | "under_review";
export type ListingCategory = "clothing" | "footwear" | "electronics" | "kitchen" | "beauty" | "home";

export interface ListingIssue {
  type: string;
  severity: "warning" | "error";
  message: string;
}

export interface Listing {
  id: string;
  name: string;
  category: ListingCategory;
  sku: string;
  price: number;
  mrp: number;
  images: string[];
  description: string;
  size_chart: boolean;
  stock: number;
  marketplace: string;
  status: ListingStatus;
  rating: number;
  total_reviews: number;
}

export interface ListingCheckResult {
  listing_id: string;
  product_name: string;
  issues: ListingIssue[];
  overall_status: "ok" | "warning" | "error";
  score: number;
}
