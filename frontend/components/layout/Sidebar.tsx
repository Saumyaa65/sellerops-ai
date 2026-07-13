"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Bot,
  Package,
  Search,
  ShoppingCart,
  Wallet,
  FileText,
  ChevronLeft,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useUIStore } from "@/store/useUIStore";

const NAV_ITEMS = [
  { href: "/", label: "Command Center", icon: LayoutDashboard },
  { href: "/investigations", label: "Investigations", icon: Search },
  { href: "/listings", label: "Listings", icon: Package },
  { href: "/operations", label: "Operations", icon: ShoppingCart },
  { href: "/scenarios", label: "Demo Scenarios", icon: Zap },
  { href: "/policies", label: "Policy Library", icon: FileText },
];

export function Sidebar() {
  const pathname = usePathname();
  const { sidebarCollapsed, toggleSidebar } = useUIStore();

  return (
    <aside
      className={cn(
        "fixed inset-y-0 left-0 z-40 flex flex-col border-r border-[var(--color-border)] bg-[var(--color-surface-0)] transition-all duration-300",
        sidebarCollapsed ? "w-16" : "w-60"
      )}
    >
      {/* Logo */}
      <div className="flex h-14 items-center justify-between border-b border-[var(--color-border)] px-4">
        {!sidebarCollapsed && (
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-[var(--color-brand-500)] to-[var(--color-accent-500)] shadow-[var(--shadow-glow)]">
              <Zap className="h-4 w-4 text-white" />
            </div>
            <span className="font-semibold text-sm tracking-tight gradient-text">
              SellerOps AI
            </span>
          </Link>
        )}
        {sidebarCollapsed && (
          <Link href="/" className="mx-auto">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-[var(--color-brand-500)] to-[var(--color-accent-500)]">
              <Zap className="h-4 w-4 text-white" />
            </div>
          </Link>
        )}
        {!sidebarCollapsed && (
          <button
            onClick={toggleSidebar}
            id="sidebar-collapse-btn"
            className="rounded-md p-1 text-[var(--color-text-muted)] hover:bg-[var(--color-surface-3)] hover:text-[var(--color-text-primary)] transition-colors"
            aria-label="Collapse sidebar"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-0.5 overflow-y-auto p-2 pt-3">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = item.href === "/"
            ? pathname === "/"
            : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              id={`nav-${item.label.toLowerCase().replace(/\s+/g, "-")}`}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-[var(--duration-fast)]",
                isActive
                  ? "bg-[var(--color-brand-500)]/15 text-[var(--color-brand-300)] border border-[var(--color-brand-500)]/20"
                  : "text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-3)] hover:text-[var(--color-text-primary)]",
                sidebarCollapsed && "justify-center px-2"
              )}
              title={sidebarCollapsed ? item.label : undefined}
            >
              <Icon className={cn("shrink-0", isActive ? "h-4 w-4" : "h-4 w-4")} />
              {!sidebarCollapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      {!sidebarCollapsed && (
        <div className="border-t border-[var(--color-border)] p-4">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-full bg-gradient-to-br from-[var(--color-brand-600)] to-[var(--color-accent-600)] flex items-center justify-center text-xs font-bold text-white">
              R
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-[var(--color-text-primary)] truncate">Rohan Enterprises</p>
              <p className="text-xs text-[var(--color-text-muted)] truncate">Meesho · Bronze Tier</p>
            </div>
          </div>
        </div>
      )}

      {/* Expand button when collapsed */}
      {sidebarCollapsed && (
        <button
          onClick={toggleSidebar}
          id="sidebar-expand-btn"
          className="border-t border-[var(--color-border)] p-4 text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] flex justify-center transition-colors"
          aria-label="Expand sidebar"
        >
          <ChevronLeft className="h-4 w-4 rotate-180" />
        </button>
      )}
    </aside>
  );
}
