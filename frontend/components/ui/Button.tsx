import { cn } from "@/lib/utils";
import { cva, type VariantProps } from "class-variance-authority";

const buttonVariants = cva(
  // Base styles
  "inline-flex items-center justify-center gap-2 rounded-lg font-medium text-sm transition-all duration-[var(--duration-normal)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand-400)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-surface-1)] disabled:opacity-50 disabled:cursor-not-allowed select-none",
  {
    variants: {
      variant: {
        primary:
          "bg-[var(--color-brand-500)] text-white hover:bg-[var(--color-brand-400)] active:bg-[var(--color-brand-600)] shadow-sm hover:shadow-[var(--shadow-glow)]",
        secondary:
          "bg-[var(--color-surface-3)] text-[var(--color-text-primary)] border border-[var(--color-border)] hover:bg-[var(--color-surface-4)] active:bg-[var(--color-surface-2)]",
        ghost:
          "text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-3)] hover:text-[var(--color-text-primary)] active:bg-[var(--color-surface-2)]",
        destructive:
          "bg-[var(--color-error)]/15 text-[var(--color-error)] border border-[var(--color-error)]/30 hover:bg-[var(--color-error)]/25",
        gradient:
          "bg-gradient-to-r from-[var(--color-brand-500)] to-[var(--color-accent-500)] text-white hover:opacity-90 shadow-sm hover:shadow-[var(--shadow-glow)]",
      },
      size: {
        xs: "h-7 px-2.5 text-xs rounded-md",
        sm: "h-8 px-3 text-sm",
        md: "h-9 px-4 text-sm",
        lg: "h-10 px-5 text-base",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: {
      variant: "secondary",
      size: "md",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  loading?: boolean;
}

export function Button({
  className,
  variant,
  size,
  loading,
  children,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(buttonVariants({ variant, size }), className)}
      disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <span className="h-4 w-4 rounded-full border-2 border-current border-t-transparent animate-spin" />
      )}
      {children}
    </button>
  );
}
