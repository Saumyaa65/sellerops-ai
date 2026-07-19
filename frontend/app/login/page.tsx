"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import axios from "axios";
import { Zap, ShieldCheck, CheckCircle2, TrendingUp, Info } from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

interface DemoAccount {
  name: string;
  email: string;
  badge: string;
  desc: string;
  initials: string;
  marketplace: string;
  color: string;
}

const DEMO_ACCOUNTS: DemoAccount[] = [
  {
    name: "Rohan Enterprises",
    email: "rohan@sellerops.ai",
    badge: "Enterprise Workspace",
    desc: "Complete catalog & full operations metrics",
    initials: "RE",
    marketplace: "Meesho",
    color: "from-blue-500/20 to-indigo-500/20 border-blue-500/30 text-blue-300",
  },
  {
    name: "Priya Fashion",
    email: "priya@sellerops.ai",
    badge: "Apparel Workspace",
    desc: "Apparel catalog & size charts focus",
    initials: "PF",
    marketplace: "Meesho",
    color: "from-pink-500/20 to-rose-500/20 border-pink-500/30 text-pink-300",
  },
  {
    name: "ElectroKart",
    email: "electro@sellerops.ai",
    badge: "Electronics Workspace",
    desc: "Electronics inventory & payout anomalies",
    initials: "EK",
    marketplace: "Meesho",
    color: "from-amber-500/20 to-orange-500/20 border-amber-500/30 text-amber-300",
  },
];

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [selectedDemo, setSelectedDemo] = useState<number | null>(null);
  const [isWakingUp, setIsWakingUp] = useState(false);
  const [wakingUpReason, setWakingUpReason] = useState<"verifying" | "authenticating" | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    const token = localStorage.getItem("auth_token");
    if (token) {
      verifyTokenAndRedirect(token);
    }
  }, [router]);

  const verifyTokenAndRedirect = async (token: string, attempt = 1) => {
    setIsWakingUp(true);
    setWakingUpReason("verifying");
    setRetryCount(attempt);
    try {
      const res = await axios.get(`${API_URL}/api/v1/seller-metrics`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data && res.data.success) {
        setIsWakingUp(false);
        setWakingUpReason(null);
        router.replace("/");
      } else {
        localStorage.removeItem("auth_token");
        localStorage.removeItem("seller_id");
        setIsWakingUp(false);
        setWakingUpReason(null);
      }
    } catch (err: any) {
      if (err.response?.status === 401 || err.response?.status === 403) {
        localStorage.removeItem("auth_token");
        localStorage.removeItem("seller_id");
        setIsWakingUp(false);
        setWakingUpReason(null);
        toast.error("Session expired. Please log in again.");
      } else {
        setTimeout(() => {
          verifyTokenAndRedirect(token, attempt + 1);
        }, 3000);
      }
    }
  };

  const handleDemoSelect = (index: number) => {
    setSelectedDemo(index);
    setEmail(DEMO_ACCOUNTS[index].email);
    setPassword("demo123");
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error("Please enter email and password");
      return;
    }

    setIsLoading(true);
    await attemptLogin(email, password, 1);
  };

  const attemptLogin = async (userEmail: string, userPass: string, attempt = 1) => {
    try {
      const res = await axios.post(`${API_URL}/api/v1/auth/login`, {
        email: userEmail,
        password: userPass,
      });

      if (res.data && res.data.success) {
        const { token, seller_id } = res.data.data;
        localStorage.setItem("auth_token", token);
        localStorage.setItem("seller_id", seller_id);
        toast.success(`Welcome back!`);
        setIsWakingUp(false);
        setWakingUpReason(null);
        router.replace("/");
      } else {
        toast.error(res.data?.error ?? "Authentication failed");
        setIsLoading(false);
        setIsWakingUp(false);
        setWakingUpReason(null);
      }
    } catch (err: any) {
      const status = err.response?.status;
      if (status === 401 || status === 403 || status === 400) {
        const errMsg = err.response?.data?.error ?? err.response?.data?.detail ?? "Invalid email or password";
        toast.error(errMsg);
        setIsLoading(false);
        setIsWakingUp(false);
        setWakingUpReason(null);
      } else {
        setIsWakingUp(true);
        setWakingUpReason("authenticating");
        setRetryCount(attempt);
        setTimeout(() => {
          attemptLogin(userEmail, userPass, attempt + 1);
        }, 3000);
      }
    }
  };

  if (isWakingUp) {
    return (
      <div className="flex h-screen w-screen flex-col items-center justify-center bg-slate-950 p-4 text-center select-none relative overflow-hidden font-sans">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[380px] w-[380px] rounded-full bg-indigo-650/5 blur-[90px] pointer-events-none" />
        
        <div className="relative w-full max-w-md p-8 rounded-2xl border border-slate-900/60 bg-slate-900/20 backdrop-blur-xl shadow-2xl space-y-6">
          <div className="flex flex-col items-center space-y-4 animate-fade-slide-up">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" />
            
            <h3 className="text-base font-bold text-slate-100 mt-2">
              {wakingUpReason === "verifying" ? "Verifying workspace session..." : "Starting secure AI backend..."}
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

  return (
    <div className="relative min-h-screen bg-slate-955 font-sans flex flex-col lg:flex-row">
      {/* Background decoration */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(99,102,241,0.025)_0%,_transparent_55%)] pointer-events-none" />

      {/* Left Column: Premium SaaS Hero Panel */}
      <div className="flex-1 relative flex flex-col justify-between p-8 lg:p-16 overflow-hidden bg-slate-950 border-r border-slate-900">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(139,92,246,0.035)_0%,_transparent_40%)] pointer-events-none" />
        
        {/* Logo Header */}
        <div className="flex items-center gap-2.5 z-10">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-650 shadow-md">
            <Zap className="h-4.5 w-4.5 text-white" />
          </div>
          <span className="text-lg font-bold text-slate-100 tracking-tight">
            SellerOps <span className="bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">AI</span>
          </span>
        </div>

        {/* Hero Copy */}
        <div className="my-auto py-12 space-y-8 z-10 max-w-lg">
          <div className="space-y-4">
            <h1 className="text-3xl lg:text-4xl font-extrabold tracking-tight text-white leading-tight">
              Autonomous Operations Manager for Marketplace Sellers
            </h1>
            <p className="text-sm text-slate-400 leading-relaxed">
              Automate policy compliance checks, payout reconciliations, and ticket management on a unified workspace. Reclaim lost margins and protect account health.
            </p>
          </div>

          <div className="space-y-4">
            <div className="flex gap-3">
              <div className="h-6 w-6 rounded-full bg-indigo-500/10 flex items-center justify-center shrink-0 text-indigo-400 mt-0.5">
                <ShieldCheck className="h-4.5 w-4.5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-200">Catalog Policy Verification</h4>
                <p className="text-[11px] text-slate-400 mt-0.5">Preventive listing scans prevent suppressions and regulatory flags before publication.</p>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="h-6 w-6 rounded-full bg-indigo-500/10 flex items-center justify-center shrink-0 text-indigo-400 mt-0.5">
                <TrendingUp className="h-4.5 w-4.5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-200">Financial Audit & Discrepancies</h4>
                <p className="text-[11px] text-slate-400 mt-0.5">Automated payouts matching audits claim deductions and settlement errors.</p>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="h-6 w-6 rounded-full bg-indigo-500/10 flex items-center justify-center shrink-0 text-indigo-400 mt-0.5">
                <CheckCircle2 className="h-4.5 w-4.5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-200">Unified Diagnosis & Appeals</h4>
                <p className="text-[11px] text-slate-400 mt-0.5">Analyze store alerts and auto-generate compliance appeal letters ready for dispatch.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer info */}
        <div className="text-[10px] text-slate-600 font-mono z-10">
          © {new Date().getFullYear()} SellerOps AI. All rights reserved.
        </div>
      </div>

      {/* Right Column: Sign In Card wrapped in a premium glass container */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-12 md:p-16 bg-slate-950 relative">
        {/* Subtle purple radial glow behind the card */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[380px] w-[380px] rounded-full bg-indigo-600/5 blur-[90px] pointer-events-none" />

        <div className="relative w-full max-w-md p-8 sm:p-10 rounded-2xl border border-slate-900/60 bg-slate-900/20 backdrop-blur-xl shadow-[0_8px_30px_rgb(0,0,0,0.5)] space-y-6">
          <div className="space-y-1.5">
            <h2 className="text-xl font-bold text-slate-100 tracking-tight">Access Your Store</h2>
            <p className="text-xs text-slate-400">Select a managed seller workspace below to authenticate.</p>
          </div>

          {/* Account Selection Cards with enhanced interactive styles */}
          <div className="space-y-3.5">
            {DEMO_ACCOUNTS.map((account, idx) => {
              const isSelected = selectedDemo === idx;
              return (
                <button
                  key={account.email}
                  type="button"
                  onClick={() => handleDemoSelect(idx)}
                  className={`w-full flex items-center gap-3 p-3.5 rounded-xl border text-left transition-all duration-300 ease-out transform ${
                    isSelected
                      ? "border-indigo-500/70 bg-indigo-500/10 text-white shadow-[0_0_15px_rgba(99,102,241,0.12)] scale-[1.01]"
                      : "border-slate-900 bg-slate-900/30 text-slate-400 hover:border-slate-800/80 hover:bg-slate-900/50 hover:-translate-y-0.5 hover:shadow-md"
                  }`}
                >
                  {/* Workspace Initials Circle */}
                  <div className={`h-8 w-8 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 select-none transition-colors duration-300 ${
                    isSelected ? "bg-indigo-500/20 text-indigo-300" : "bg-slate-800/60 text-slate-400"
                  }`}>
                    {account.initials}
                  </div>

                  {/* Details */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className={`block font-bold text-xs truncate ${isSelected ? "text-slate-100" : "text-slate-300"}`}>
                        {account.name}
                      </span>
                      {/* Marketplace indicator text badge */}
                      <span className="text-[9px] font-medium text-slate-500 bg-slate-800/40 px-1.5 py-0.2 rounded border border-slate-800/60">
                        {account.marketplace}
                      </span>
                    </div>
                    <span className="block text-[10px] text-slate-500 font-medium truncate mt-0.5">
                      {account.desc}
                    </span>
                  </div>

                  {/* Selected Dot or Status Ring */}
                  <div className={`h-4 w-4 rounded-full border flex items-center justify-center shrink-0 transition-colors ${
                    isSelected ? "border-indigo-500 bg-indigo-500" : "border-slate-800 bg-slate-900"
                  }`}>
                    {isSelected && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Divider with improved spacing */}
          <div className="relative flex items-center justify-center py-2">
            <hr className="w-full border-slate-900" />
            <span className="absolute bg-slate-950/80 backdrop-blur-md px-3 text-[10px] text-slate-500 uppercase tracking-wider font-semibold">
              Or credentials
            </span>
          </div>

          {/* Standard Login Form */}
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1">
              <label htmlFor="email" className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider pl-0.5">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setSelectedDemo(null);
                }}
                className="w-full bg-slate-950 border border-slate-900/80 rounded-xl px-4 py-3 text-xs text-slate-200 placeholder-slate-700 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 transition-all duration-300"
                placeholder="seller@sellerops.ai"
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="password" className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider pl-0.5">
                Password
              </label>
              <input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setSelectedDemo(null);
                }}
                className="w-full bg-slate-950 border border-slate-900/80 rounded-xl px-4 py-3 text-xs text-slate-200 placeholder-slate-700 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 transition-all duration-300"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full rounded-xl bg-gradient-to-r from-indigo-500 to-purple-650 py-3.5 text-xs font-semibold text-white shadow-md hover:from-indigo-600 hover:to-purple-750 transition-all duration-300 disabled:opacity-50 flex items-center justify-center gap-2 border border-indigo-400/10 cursor-pointer"
            >
              {isLoading ? (
                <>
                  <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Authenticating...
                </>
              ) : (
                "Sign In"
              )}
            </button>

            {isLoading && (
              <div className="p-3.5 rounded-xl border border-blue-500/20 bg-blue-500/5 text-blue-300 flex items-start gap-2.5 animate-fade-slide-up">
                <Info className="h-4 w-4 text-blue-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h4 className="text-[11px] font-bold text-slate-200 leading-tight">
                    Starting secure AI backend...
                  </h4>
                  <p className="text-[10px] text-slate-400 leading-relaxed">
                    This demo is hosted on Render's free tier, which automatically sleeps after periods of inactivity. The first request may take around 30–90 seconds while the service wakes up. Thank you for your patience.
                  </p>
                </div>
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}
