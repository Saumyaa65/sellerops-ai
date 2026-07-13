import { cn, getStatusColor } from "@/lib/utils";

interface StatusDotProps {
  status: string;
  pulse?: boolean;
  className?: string;
  label?: string;
}

export function StatusDot({ status, pulse, className, label }: StatusDotProps) {
  const colorClass = getStatusColor(status);

  return (
    <span className={cn("inline-flex items-center gap-1.5", className)}>
      <span
        className={cn(
          "inline-block h-2 w-2 rounded-full",
          colorClass,
          pulse && status === "running" && "pulse-dot"
        )}
      />
      {label && (
        <span className="text-xs text-[var(--color-text-secondary)] capitalize">{label}</span>
      )}
    </span>
  );
}
