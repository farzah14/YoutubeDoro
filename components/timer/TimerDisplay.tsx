import { formatMMSS } from "@/lib/time";
import { ProgressRing } from "../ui/ProgressRing";

interface TimerDisplayProps {
  remainingSec: number;
  totalSec: number;
  label?: string;
  variant?: "focus" | "rest";
  size?: number;
}

export function TimerDisplay({
  remainingSec,
  totalSec,
  label,
  variant = "focus",
  size = 320,
}: TimerDisplayProps) {
  const progress = totalSec > 0 ? remainingSec / totalSec : 0;
  const percentage = Math.round(progress * 100);
  const modeLabel = variant === "rest" ? "Rest timer" : "Focus timer";

  return (
    <div
      className={`timer-display flex w-full justify-center py-1 sm:py-2 ${variant === "rest" ? "timer-display--rest" : ""}`}
      role="timer"
      aria-live="off"
      aria-atomic="true"
      aria-label={`${modeLabel}: ${formatMMSS(remainingSec)}`}
    >
      <ProgressRing
        progress={progress}
        size={size}
        strokeWidth={7}
        variant={variant}
        className="timer-ring"
      >
        <div className="flex flex-col items-center">
          <span className="timer-display__time numeric-time font-mono text-[3.25rem] font-bold text-foreground select-none sm:text-7xl">
            {formatMMSS(remainingSec)}
          </span>
          <span className="mt-3 flex items-center gap-1.5 text-xs font-medium text-text-secondary">
            <span>{percentage}% remaining</span>
            {label && (
              <span className="text-[10px] text-accent font-mono font-semibold">
                • {label}
              </span>
            )}
          </span>
        </div>
      </ProgressRing>
    </div>
  );
}
