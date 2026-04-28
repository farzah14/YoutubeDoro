import { ComponentProps } from "react";
import { cx } from "@/lib/utils";

interface ButtonProps extends ComponentProps<"button"> {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg" | "icon";
}

export function Button({
  className,
  variant = "primary",
  size = "md",
  ...props
}: ButtonProps) {
  return (
    <button
      className={cx(
        "inline-flex items-center justify-center font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus disabled:pointer-events-none disabled:opacity-50",
        
        // Variants
        variant === "primary" && "bg-accent text-accent-fg hover:bg-accent-hover",
        variant === "secondary" && "bg-surface hover:bg-surface-hover text-foreground border border-border-subtle",
        variant === "ghost" && "hover:bg-surface hover:text-foreground text-text-secondary",
        variant === "danger" && "bg-danger text-white hover:bg-danger-hover",
        
        // Sizes
        size === "sm" && "h-8 px-3 text-xs rounded-sm",
        size === "md" && "h-10 px-4 text-sm rounded-md",
        size === "lg" && "h-12 px-6 text-base rounded-md",
        size === "icon" && "h-10 w-10 rounded-md",
        
        className
      )}
      {...props}
    />
  );
}
