"use client";

import { cx } from "@/lib/utils";

interface ProgressRingProps {
  progress: number; // 0 to 1
  size?: number;
  strokeWidth?: number;
  className?: string;
  children?: React.ReactNode;
}

export function ProgressRing({
  progress,
  size = 280,
  strokeWidth = 6,
  className,
  children,
}: ProgressRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  // Ensure progress is clamped between 0 and 1
  const safeProgress = Math.min(Math.max(progress, 0), 1);
  const strokeDashoffset = circumference - safeProgress * circumference;

  // Determine color based on progress (like a timer counting down)
  // If progress is low (meaning time is running out), we might want to change color.
  // We can just use currentColor and let the parent handle the class for color,
  // or we can hardcode some logic if we wanted. Using CSS classes is more flexible.
  
  return (
    <div className={cx("relative inline-flex items-center justify-center", className)} style={{ width: size, height: size }}>
      <svg
        className="-rotate-90 transform"
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
      >
        {/* Background track */}
        <circle
          className="text-border-subtle"
          strokeWidth={strokeWidth}
          stroke="currentColor"
          fill="transparent"
          r={radius}
          cx={size / 2}
          cy={size / 2}
        />
        {/* Progress indicator */}
        <circle
          className="text-accent transition-all duration-300 ease-in-out"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          stroke="currentColor"
          fill="transparent"
          r={radius}
          cx={size / 2}
          cy={size / 2}
        />
      </svg>
      {/* Content inside the ring (e.g., the timer numbers) */}
      <div className="absolute inset-0 flex items-center justify-center flex-col">
        {children}
      </div>
    </div>
  );
}
