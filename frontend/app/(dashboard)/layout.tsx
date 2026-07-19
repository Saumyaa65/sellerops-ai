"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { Sidebar } from "@/components/layout/Sidebar";
import { useUIStore } from "@/store/useUIStore";
import { cn } from "@/lib/utils";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { sidebarCollapsed } = useUIStore();
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [isWakingUp, setIsWakingUp] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    const token = localStorage.getItem("auth_token");
    if (!token) {
      router.replace("/login");
      return;
    }

    const checkSession = async (attempt = 1) => {
      try {
        const res = await axios.get(`${API_URL}/api/v1/seller-metrics`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.data && res.data.success) {
          setIsWakingUp(false);
          setIsAuthenticated(true);
        } else {
          localStorage.removeItem("auth_token");
          localStorage.removeItem("seller_id");
          router.replace("/login");
        }
      } catch (err: any) {
        if (err.response?.status === 401 || err.response?.status === 403) {
          localStorage.removeItem("auth_token");
          localStorage.removeItem("seller_id");
          router.replace("/login");
        } else {
          setIsWakingUp(true);
          setRetryCount(attempt);
          setTimeout(() => {
            checkSession(attempt + 1);
          }, 3000);
        }
      }
    };

    checkSession();
  }, [router]);

  if (isWakingUp) {
    return (
      <div className="flex h-screen w-screen flex-col items-center justify-center bg-slate-950 p-4 text-center select-none relative overflow-hidden font-sans">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[380px] w-[380px] rounded-full bg-indigo-600/5 blur-[90px] pointer-events-none" />
        
        <div className="relative w-full max-w-md p-8 rounded-2xl border border-slate-900/60 bg-slate-900/20 backdrop-blur-xl shadow-2xl space-y-6">
          <div className="flex flex-col items-center space-y-4 animate-fade-slide-up">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" />
            
            <h3 className="text-base font-bold text-slate-100 mt-2">
              Starting secure AI backend...
            </h3>
            
            <div className="text-xs text-slate-400 space-y-3 leading-relaxed">
              <p>This demo is hosted on Render's free tier, which automatically sleeps after periods of inactivity.</p>
              <p className="text-indigo-300 font-medium bg-indigo-500/10 px-3 py-2 rounded-lg border border-indigo-500/20">
                The first request may take around 30–60 seconds while the service wakes up. Thank you for your patience.
              </p>
              <div className="flex items-center justify-center gap-1.5 text-[10px] text-slate-500 font-mono pt-1">
                <span className="h-1.5 w-1.5 rounded-full bg-indigo-500 animate-pulse" />
                <span>Retrying connection... (Attempt #{retryCount})</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (isAuthenticated === null) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-slate-955">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" />
      </div>
    );
  }

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
