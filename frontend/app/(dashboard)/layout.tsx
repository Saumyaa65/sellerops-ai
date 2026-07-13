"use client";

import { Sidebar } from "@/components/layout/Sidebar";
import { useUIStore } from "@/store/useUIStore";
import { cn } from "@/lib/utils";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { sidebarCollapsed } = useUIStore();

  return (
    <div className="min-h-screen">
      <Sidebar />
      <main
        className={cn(
          "min-h-screen pt-14 transition-all duration-300",
          sidebarCollapsed ? "pl-16" : "pl-60"
        )}
      >
        {children}
      </main>
    </div>
  );
}
