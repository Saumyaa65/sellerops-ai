"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import axios from "axios";
import { Zap } from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

interface DemoAccount {
  name: string;
  email: string;
  badge: string;
  desc: string;
}

const DEMO_ACCOUNTS: DemoAccount[] = [
  {
    name: "Rohan Enterprises",
    email: "rohan@sellerops.ai",
    badge: "Bronze Tier",
    desc: "Complete Meesho dataset",
  },
  {
    name: "Priya Fashion",
    email: "priya@sellerops.ai",
    badge: "Silver Tier",
    desc: "Apparel & footwear catalog",
  },
  {
    name: "ElectroKart",
    email: "electro@sellerops.ai",
    badge: "Gold Tier",
    desc: "Electronics & kitchen catalog",
  },
];

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [selectedDemo, setSelectedDemo] = useState<number | null>(null);

  useEffect(() => {
    // Redirect if already logged in
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
    <div className="relative flex min-h-screen items-center justify-center bg-slate-950 px-4 py-12 font-sans sm:px-6 lg:px-8">
      {/* Background radial highlight */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-slate-900/50 via-slate-950 to-slate-950 pointer-events-none" />
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 h-[450px] w-[600px] rounded-full bg-indigo-500/5 blur-[120px] pointer-events-none" />

      <div className="relative w-full max-w-md space-y-8">
        {/* Header */}
        <div className="text-center space-y-3">
          <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-md">
            <Zap className="h-5 w-5 text-white" />
          </div>
          <h2 className="text-3xl font-bold tracking-tight text-white">
            SellerOps <span className="bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">AI</span>
          </h2>
          <p className="text-sm text-slate-400">
            AI-powered operations manager for marketplace sellers.
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-xl backdrop-blur-md">
          {/* Demo Accounts List */}
          <div className="space-y-3 mb-6">
            <span className="block text-xs font-semibold text-slate-400 uppercase tracking-wider text-center">
              Demo Accounts
            </span>
            <div className="grid grid-cols-1 gap-2.5">
              {DEMO_ACCOUNTS.map((account, idx) => (
                <button
                  key={account.email}
                  type="button"
                  onClick={() => handleDemoSelect(idx)}
                  className={`flex items-center justify-between p-3 rounded-xl border text-left transition-all duration-200 ${
                    selectedDemo === idx
                      ? "border-indigo-500 bg-indigo-500/5 text-indigo-200 ring-1 ring-indigo-500/30"
                      : "border-slate-800 bg-slate-900/40 text-slate-400 hover:border-slate-700 hover:bg-slate-900/70"
                  }`}
                >
                  <div className="min-w-0">
                    <span className="block font-medium text-slate-200 text-xs truncate">
                      {account.name}
                    </span>
                    <span className="block text-[10px] text-slate-500 font-mono truncate mt-0.5">
                      {account.email} ({account.desc})
                    </span>
                  </div>
                  <span className="text-[9px] font-medium px-2 py-0.5 rounded-full border border-slate-800 bg-slate-950 text-slate-400 shrink-0 select-none">
                    {account.badge}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="relative flex items-center justify-center my-6">
            <hr className="w-full border-slate-800" />
            <span className="absolute bg-slate-900 px-3 text-[10px] text-slate-500 uppercase tracking-wider">
              Or Sign In
            </span>
          </div>

          {/* Credentials Form */}
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
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
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 transition-all"
                placeholder="seller@sellerops.ai"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
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
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 transition-all"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 py-3 text-xs font-semibold text-white shadow-md hover:from-indigo-600 hover:to-purple-700 transition-all duration-300 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Signing In...
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
