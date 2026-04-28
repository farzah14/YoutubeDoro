"use client";

import { cx } from "@/lib/utils";

interface SegmentedProps {
  value: string;
  onChange: (value: string) => void;
  options: Array<{ label: string; value: string }>;
  className?: string;
}

export function Segmented({ value, onChange, options, className }: SegmentedProps) {
  return (
    <div
      className={cx(
        "inline-flex h-9 items-center justify-center rounded-md border border-border-subtle bg-surface p-1 text-text-muted",
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
            className={cx(
              "inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1 text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus",
              isActive 
                ? "bg-border-subtle text-foreground shadow-sm" 
                : "hover:bg-surface-hover hover:text-foreground"
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
