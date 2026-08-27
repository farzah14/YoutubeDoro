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
        "inline-flex min-h-10 items-center justify-center font-medium transition-colors duration-150 active:scale-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus disabled:pointer-events-none disabled:opacity-40 cursor-pointer select-none",
        
        // Variants
        variant === "primary" && "bg-accent text-accent-fg hover:bg-accent-hover font-semibold shadow-sm",
        variant === "secondary" && "bg-surface-secondary hover:bg-surface-hover text-foreground border border-border hover:border-border-focus",
        variant === "ghost" && "hover:bg-surface-hover text-text-secondary hover:text-foreground",
        variant === "danger" && "bg-danger text-white hover:bg-danger-hover shadow-sm",
        
        // Sizes
        size === "sm" && "h-9 px-3 text-xs rounded-lg",
        size === "md" && "h-10 px-4 text-sm rounded-lg",
        size === "lg" && "h-12 px-6 text-base rounded-lg font-semibold",
        size === "icon" && "h-10 w-10 rounded-lg",
        
        className
      )}
      {...props}
    />
  );
}
