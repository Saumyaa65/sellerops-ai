"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import axios from "axios";
import { Zap, ShieldCheck, CheckCircle2, TrendingUp } from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

interface DemoAccount {
  name: string;
  email: string;
  badge: string;
  desc: string;
  color: string;
}

const DEMO_ACCOUNTS: DemoAccount[] = [
  {
    name: "Rohan Enterprises",
    email: "rohan@sellerops.ai",
    badge: "Enterprise Workspace",
    desc: "Complete catalog & full operations metrics",
    color: "from-blue-500/20 to-indigo-500/20 border-blue-500/30 text-blue-300",
  },
  {
    name: "Priya Fashion",
    email: "priya@sellerops.ai",
    badge: "Apparel Workspace",
    desc: "Apparel catalog & size charts focus",
    color: "from-pink-500/20 to-rose-500/20 border-pink-500/30 text-pink-300",
  },
  {
    name: "ElectroKart",
    email: "electro@sellerops.ai",
    badge: "Electronics Workspace",
    desc: "Electronics inventory & payout anomalies",
    color: "from-amber-500/20 to-orange-500/20 border-amber-500/30 text-amber-300",
  },
];

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [selectedDemo, setSelectedDemo] = useState<number | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("auth_token");
    if (token) {
      router.replace("/");
    }
  }, [router]);

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
    try {
      const res = await axios.post(`${API_URL}/api/v1/auth/login`, {
        email,
        password,
      });

      if (res.data && res.data.success) {
        const { token, seller_id } = res.data.data;
        localStorage.setItem("auth_token", token);
        localStorage.setItem("seller_id", seller_id);
        toast.success(`Welcome back!`);
        router.replace("/");
      } else {
        toast.error(res.data?.error ?? "Authentication failed");
      }
    } catch (err: any) {
      const errMsg = err.response?.data?.error ?? err.response?.data?.detail ?? "Failed to connect to authentication service";
      toast.error(errMsg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen bg-slate-950 font-sans flex flex-col lg:flex-row">
      {/* Background decoration */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(99,102,241,0.03)_0%,_transparent_50%)] pointer-events-none" />

      {/* Left Column: Premium SaaS Hero Panel */}
      <div className="flex-1 relative flex flex-col justify-between p-8 lg:p-16 overflow-hidden bg-slate-900/30 border-r border-slate-900">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(139,92,246,0.05)_0%,_transparent_40%)] pointer-events-none" />
        
        {/* Logo Header */}
        <div className="flex items-center gap-2.5 z-10">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-md">
            <Zap className="h-4.5 w-4.5 text-white" />
          </div>
          <span className="text-lg font-bold text-white tracking-tight">
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
        <div className="text-[10px] text-slate-500 font-mono z-10">
          © {new Date().getFullYear()} SellerOps AI Inc. All rights reserved.
        </div>
      </div>

      {/* Right Column: Sign In Card */}
      <div className="flex-1 flex items-center justify-center p-8 lg:p-16">
        <div className="w-full max-w-md space-y-6">
          <div className="space-y-2">
            <h2 className="text-xl font-bold text-white tracking-tight">Access Your Store</h2>
            <p className="text-xs text-slate-400">Select a managed seller workspace below to authenticate.</p>
          </div>

          {/* Account Selection Cards */}
          <div className="space-y-2.5">
            {DEMO_ACCOUNTS.map((account, idx) => (
              <button
                key={account.email}
                type="button"
                onClick={() => handleDemoSelect(idx)}
                className={`w-full flex items-center justify-between p-3.5 rounded-xl border text-left transition-all duration-200 ${
                  selectedDemo === idx
                    ? "border-indigo-500 bg-indigo-500/5 text-indigo-200 ring-1 ring-indigo-500/30"
                    : "border-slate-900 bg-slate-900/40 text-slate-400 hover:border-slate-800 hover:bg-slate-900/60"
                }`}
              >
                <div className="min-w-0 pr-2">
                  <span className="block font-semibold text-slate-200 text-xs truncate">
                    {account.name}
                  </span>
                  <span className="block text-[10px] text-slate-500 font-mono truncate mt-0.5">
                    {account.email} · {account.desc}
                  </span>
                </div>
                <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border bg-slate-950 shrink-0 select-none ${account.color}`}>
                  {account.badge}
                </span>
              </button>
            ))}
          </div>

          <div className="relative flex items-center justify-center my-6">
            <hr className="w-full border-slate-900" />
            <span className="absolute bg-slate-950 px-3 text-[10px] text-slate-500 uppercase tracking-wider font-semibold">
              Or credentials
            </span>
          </div>

          {/* Standard Form */}
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
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
                className="w-full bg-slate-950 border border-slate-900 rounded-xl px-4 py-2.5 text-xs text-slate-200 placeholder-slate-700 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 transition-all"
                placeholder="seller@sellerops.ai"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
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
                className="w-full bg-slate-950 border border-slate-900 rounded-xl px-4 py-2.5 text-xs text-slate-200 placeholder-slate-700 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 transition-all"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 py-3 text-xs font-semibold text-white shadow-md hover:from-indigo-600 hover:to-purple-750 transition-all duration-300 disabled:opacity-50 flex items-center justify-center gap-2"
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
          </form>
        </div>
      </div>
    </div>
  );
}
