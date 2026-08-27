import { ComponentProps } from "react";
import { cx } from "@/lib/utils";

interface BadgeProps extends ComponentProps<"div"> {
  variant?: "default" | "secondary" | "outline" | "danger" | "success" | "warning";
}

export function Badge({ className, variant = "default", ...props }: BadgeProps) {
  return (
    <div
      className={cx(
        "inline-flex items-center rounded-lg border px-2.5 py-1 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-border-focus",
        variant === "default" && "border-accent bg-accent text-accent-fg",
        variant === "secondary" && "border-border-subtle bg-surface-secondary text-text-secondary",
        variant === "outline" && "text-foreground border-border bg-surface/40",
        variant === "danger" && "border-danger/50 bg-danger/10 text-danger",
        variant === "success" && "border-success/50 bg-success/10 text-success",
        variant === "warning" && "border-warning/50 bg-warning/10 text-warning",
        className
      )}
      {...props}
    />
  );
}
