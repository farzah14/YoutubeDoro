"use client";

import { cx } from "@/lib/utils";

interface SegmentedProps {
  value: string;
  onChange: (value: string) => void;
  options: Array<{ label: string; value: string }>;
  className?: string;
  "aria-label"?: string;
}

export function Segmented({ value, onChange, options, className, "aria-label": ariaLabel }: SegmentedProps) {
  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className={cx(
        "inline-flex h-10 items-center justify-center rounded-lg border border-border bg-surface-secondary/80 p-1 text-text-muted",
        className
      )}
    >
      {options.map((option) => {
        const isActive = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            aria-pressed={isActive}
            className={cx(
              "inline-flex h-8 items-center justify-center whitespace-nowrap rounded-md px-3 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus cursor-pointer",
              isActive 
                ? "bg-accent text-accent-fg shadow-sm"
                : "text-text-secondary hover:bg-surface-hover hover:text-foreground"
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
