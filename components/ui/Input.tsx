import { ComponentProps, forwardRef } from "react";
import { cx } from "@/lib/utils";

export type InputProps = ComponentProps<"input">;

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cx(
          "flex h-10 w-full rounded-lg border border-border bg-surface-secondary/90 px-3.5 py-2 text-sm text-foreground placeholder:text-text-muted transition-colors focus-visible:outline-none focus-visible:border-border-focus focus-visible:ring-2 focus-visible:ring-border-focus disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";

export type TextareaProps = ComponentProps<"textarea">;

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        className={cx(
          "flex min-h-[80px] w-full rounded-lg border border-border bg-surface-secondary/90 px-3.5 py-2.5 text-sm text-foreground placeholder:text-text-muted transition-colors focus-visible:outline-none focus-visible:border-border-focus focus-visible:ring-2 focus-visible:ring-border-focus disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Textarea.displayName = "Textarea";
