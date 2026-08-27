"use client";

import type { ReactNode } from "react";
import { cx } from "@/lib/utils";

interface ProgressRingProps {
  progress: number; // 0 to 1
  size?: number;
  strokeWidth?: number;
  className?: string;
  variant?: "focus" | "rest";
  children?: ReactNode;
}

export function ProgressRing({
  progress,
  size = 280,
  strokeWidth = 8,
  className,
  variant = "focus",
  children,
}: ProgressRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const safeProgress = Math.min(Math.max(progress, 0), 1);
  const strokeDashoffset = circumference - safeProgress * circumference;

  const strokeColor =
    variant === "rest" ? "var(--color-timer-break, #38bdf8)" : "var(--color-timer-focus, #f59e0b)";

  return (
    <div
      className={cx(
        "relative inline-flex aspect-square w-full max-w-[320px] items-center justify-center select-none",
        className
      )}
    >
      <svg
        className="h-full w-full -rotate-90 transform"
        viewBox={`0 0 ${size} ${size}`}
        aria-hidden="true"
      >
        {/* Background track */}
        <circle
          className="text-border-subtle/80"
          strokeWidth={strokeWidth}
          stroke="currentColor"
          fill="transparent"
          r={radius}
          cx={size / 2}
          cy={size / 2}
        />
        {/* Progress indicator */}
        <circle
          stroke={strokeColor}
          className="transition-all duration-300 ease-out"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          fill="transparent"
          r={radius}
          cx={size / 2}
          cy={size / 2}
        />
      </svg>
      {/* Content inside the ring */}
      <div className="absolute inset-0 flex items-center justify-center flex-col">
        {children}
      </div>
    </div>
  );
}
