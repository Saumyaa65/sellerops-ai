import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/** Merge Tailwind classes safely, resolving conflicts. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Format a date string to a readable local format. */
export function formatDate(
  dateStr: string | Date,
  options: Intl.DateTimeFormatOptions = { dateStyle: "medium" }
): string {
  const date = typeof dateStr === "string" ? new Date(dateStr) : dateStr;
  return new Intl.DateTimeFormat("en-IN", options).format(date);
}

/** Format a datetime with time included. */
export function formatDateTime(dateStr: string | Date): string {
  return formatDate(dateStr, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

/** Format a number as Indian currency (₹). */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

/** Format a number as percentage. */
export function formatPercent(value: number, decimals = 1): string {
  return `${(value * 100).toFixed(decimals)}%`;
}

/** Truncate text to a max length with ellipsis. */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength).trimEnd() + "…";
}

/** Get severity color class for badges and indicators. */
export function getSeverityColor(severity: string): string {
  const map: Record<string, string> = {
    critical: "text-red-400 bg-red-400/10 border-red-400/20",
    high: "text-orange-400 bg-orange-400/10 border-orange-400/20",
    medium: "text-yellow-400 bg-yellow-400/10 border-yellow-400/20",
    low: "text-green-400 bg-green-400/10 border-green-400/20",
    ok: "text-green-400 bg-green-400/10 border-green-400/20",
    warning: "text-yellow-400 bg-yellow-400/10 border-yellow-400/20",
    error: "text-red-400 bg-red-400/10 border-red-400/20",
  };
  return map[severity.toLowerCase()] ?? "text-gray-400 bg-gray-400/10 border-gray-400/20";
}

/** Get status dot color. */
export function getStatusColor(status: string): string {
  const map: Record<string, string> = {
    running: "bg-[var(--color-brand-400)]",
    completed: "bg-[var(--color-success)]",
    pending: "bg-[var(--color-warning)]",
    failed: "bg-[var(--color-error)]",
    ok: "bg-[var(--color-success)]",
    degraded: "bg-[var(--color-warning)]",
  };
  return map[status.toLowerCase()] ?? "bg-[var(--color-text-muted)]";
}
