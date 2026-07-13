import { cn, getSeverityColor } from "@/lib/utils";
import { cva, type VariantProps } from "class-variance-authority";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium transition-colors",
  {
    variants: {
      variant: {
        default:
          "bg-[var(--color-surface-3)] text-[var(--color-text-secondary)] border-[var(--color-border)]",
        brand:
          "bg-[var(--color-brand-500)]/15 text-[var(--color-brand-300)] border-[var(--color-brand-500)]/30",
        success:
          "bg-[var(--color-success)]/10 text-[var(--color-success)] border-[var(--color-success)]/20",
        warning:
          "bg-[var(--color-warning)]/10 text-[var(--color-warning)] border-[var(--color-warning)]/20",
        error:
          "bg-[var(--color-error)]/10 text-[var(--color-error)] border-[var(--color-error)]/20",
        info:
          "bg-[var(--color-info)]/10 text-[var(--color-info)] border-[var(--color-info)]/20",
      },
    },
    defaultVariants: { variant: "default" },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {
  severity?: string;
}

export function Badge({ className, variant, severity, children, ...props }: BadgeProps) {
  // If severity prop is provided, use the semantic color helper
  const severityClass = severity ? getSeverityColor(severity) : undefined;

  return (
    <span
      className={cn(
        severity ? cn("inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium", severityClass) : badgeVariants({ variant }),
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}
