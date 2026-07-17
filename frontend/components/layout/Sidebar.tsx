"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Package,
  Search,
  ShoppingCart,
  ChevronLeft,
  Zap,
  FlaskConical,
  BookOpen,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useUIStore } from "@/store/useUIStore";
import apiClient from "@/lib/api-client";

const NAV_ITEMS = [
  { href: "/", label: "My Store", icon: LayoutDashboard },
  { href: "/investigations", label: "AI Diagnosis", icon: Search },
  { href: "/listings", label: "My Products", icon: Package },
  { href: "/operations", label: "Orders & Payments", icon: ShoppingCart },
  { href: "/scenarios", label: "Try a Situation", icon: FlaskConical },
  { href: "/policies", label: "Marketplace Rules", icon: BookOpen },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { sidebarCollapsed, toggleSidebar } = useUIStore();
  const [profile, setProfile] = useState<{ name: string; tier: string; marketplace: string } | null>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await apiClient.get("/seller-metrics");
        if (res.data) {
          setProfile({
            name: res.data.seller_name || "Demo Seller",
            tier: res.data.seller_tier || "Bronze",
            marketplace: res.data.marketplace || "Meesho",
          });
        }
      } catch (err) {
        // Fallback to email matched values
        const email = localStorage.getItem("auth_token") || "";
        if (email.includes("priya")) {
          setProfile({ name: "Priya Fashion", tier: "Silver", marketplace: "Meesho" });
        } else if (email.includes("electro")) {
          setProfile({ name: "ElectroKart", tier: "Gold", marketplace: "Meesho" });
        } else {
          setProfile({ name: "Rohan Enterprises", tier: "Bronze", marketplace: "Meesho" });
        }
      }
    };
    fetchProfile();
  }, [pathname]); // Refresh on navigation to sync if account changed

  const handleLogout = () => {
    localStorage.removeItem("auth_token");
    localStorage.removeItem("seller_id");
    router.replace("/login");
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
  };

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

      {/* Footer Profile & Logout */}
      {!sidebarCollapsed && profile && (
        <div className="border-t border-[var(--color-border)] p-4 flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-full bg-gradient-to-br from-[var(--color-brand-600)] to-[var(--color-accent-600)] flex items-center justify-center text-xs font-bold text-white shadow-sm shrink-0">
              {getInitials(profile.name)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-[var(--color-text-primary)] truncate">{profile.name}</p>
              <p className="text-[10px] text-[var(--color-text-muted)] truncate">
                {profile.marketplace.charAt(0).toUpperCase() + profile.marketplace.slice(1)} · {profile.tier}
              </p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 w-full rounded-md border border-[var(--color-border)] px-3 py-1.5 text-xs text-[var(--color-text-secondary)] hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/20 transition-all font-medium justify-center"
          >
            <LogOut className="h-3.5 w-3.5" />
            Logout Profile
          </button>
        </div>
      )}

      {/* Collapsed Expand / Logout actions */}
      {sidebarCollapsed && (
        <div className="border-t border-[var(--color-border)] flex flex-col items-center py-2">
          <button
            onClick={handleLogout}
            className="p-3 text-[var(--color-text-muted)] hover:text-red-400 transition-colors"
            title="Logout Profile"
          >
            <LogOut className="h-4 w-4" />
          </button>
          <button
            onClick={toggleSidebar}
            id="sidebar-expand-btn"
            className="p-3 text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] flex justify-center transition-colors"
            aria-label="Expand sidebar"
          >
            <ChevronLeft className="h-4 w-4 rotate-180" />
          </button>
        </div>
      )}
    </aside>
  );
}
