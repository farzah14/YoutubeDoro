import { ComponentProps } from "react";
import { cx } from "@/lib/utils";

interface BadgeProps extends ComponentProps<"div"> {
  variant?: "default" | "secondary" | "outline" | "danger" | "success" | "warning";
}

export function Badge({ className, variant = "default", ...props }: BadgeProps) {
  return (
    <div
      className={cx(
        "inline-flex items-center rounded-sm border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-border-focus",
        variant === "default" && "border-transparent bg-accent text-accent-fg hover:bg-accent-hover",
        variant === "secondary" && "border-transparent bg-surface hover:bg-surface-hover text-foreground",
        variant === "outline" && "text-foreground border-border-subtle",
        variant === "danger" && "border-transparent bg-danger text-white hover:bg-danger-hover",
        variant === "success" && "border-transparent bg-emerald-500/15 text-emerald-400",
        variant === "warning" && "border-transparent bg-amber-500/15 text-amber-500",
        className
      )}
      {...props}
    />
  );
}
