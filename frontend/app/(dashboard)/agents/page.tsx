"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

export default function AgentsRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/investigations");
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-[400px] flex-col gap-2">
      <Loader2 className="h-8 w-8 animate-spin text-[var(--color-brand-400)]" />
      <p className="text-sm text-[var(--color-text-muted)]">Redirecting to Investigations workbench...</p>
    </div>
  );
}
