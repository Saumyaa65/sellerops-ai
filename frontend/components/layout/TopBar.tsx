"use client";

import { Bell, Activity } from "lucide-react";
import { cn } from "@/lib/utils";
import { useUIStore } from "@/store/useUIStore";

interface TopBarProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
}

export function TopBar({ title, description, actions }: TopBarProps) {
  const { sidebarCollapsed } = useUIStore();

  return (
    <header
      className={cn(
        "fixed top-0 right-0 z-30 h-14 border-b border-[var(--color-border)] bg-[var(--color-surface-1)]/80 backdrop-blur-md transition-all duration-300",
        sidebarCollapsed ? "left-16" : "left-60"
      )}
    >
      <div className="flex h-full items-center justify-between px-6">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-sm font-semibold text-[var(--color-text-primary)]">{title}</h1>
            {description && (
              <p className="text-xs text-[var(--color-text-muted)]">{description}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {actions}

          {/* Live indicator */}
          <div className="flex items-center gap-1.5 rounded-full bg-[var(--color-success)]/10 px-2.5 py-1 border border-[var(--color-success)]/20">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-success)] pulse-dot" />
            <span className="text-xs font-medium text-[var(--color-success)]">Live</span>
          </div>

          {/* Notifications */}
          <button
            id="notifications-btn"
            className="relative flex h-8 w-8 items-center justify-center rounded-lg text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-3)] hover:text-[var(--color-text-primary)] transition-colors"
            aria-label="Notifications"
          >
            <Bell className="h-4 w-4" />
            <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-[var(--color-accent-500)]" />
          </button>

          {/* System status */}
          <button
            id="system-status-btn"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-3)] hover:text-[var(--color-text-primary)] transition-colors"
            aria-label="System status"
          >
            <Activity className="h-4 w-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
