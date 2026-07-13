import { cn } from "@/lib/utils";

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  glass?: boolean;
  glow?: boolean;
  padding?: "none" | "sm" | "md" | "lg";
}

export function Card({
  className,
  glass,
  glow,
  padding = "md",
  children,
  ...props
}: CardProps) {
  const paddingClass = {
    none: "",
    sm: "p-3",
    md: "p-5",
    lg: "p-6",
  }[padding];

  return (
    <div
      className={cn(
        "rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)]",
        paddingClass,
        glass && "glass",
        glow && "glow-border",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

interface CardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {}

export function CardHeader({ className, children, ...props }: CardHeaderProps) {
  return (
    <div className={cn("flex items-center justify-between mb-4", className)} {...props}>
      {children}
    </div>
  );
}

interface CardTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {}

export function CardTitle({ className, children, ...props }: CardTitleProps) {
  return (
    <h3
      className={cn("text-sm font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider", className)}
      {...props}
    >
      {children}
    </h3>
  );
}
