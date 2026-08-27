import { formatMMSS } from "@/lib/time";
import { ProgressRing } from "../ui/ProgressRing";

interface TimerDisplayProps {
  remainingSec: number;
  totalSec: number;
  label?: string;
  variant?: "focus" | "rest";
}

export function TimerDisplay({
  remainingSec,
  totalSec,
  label,
  variant = "focus",
}: TimerDisplayProps) {
  const progress = totalSec > 0 ? remainingSec / totalSec : 0;
  const percentage = Math.round(progress * 100);
  const modeLabel = variant === "rest" ? "Rest timer" : "Focus timer";

  return (
    <div
      className="flex w-full justify-center py-1 sm:py-2"
      role="timer"
      aria-live="off"
      aria-atomic="true"
      aria-label={`${modeLabel}: ${formatMMSS(remainingSec)}`}
    >
      <ProgressRing
        progress={progress}
        size={320}
        strokeWidth={7}
        variant={variant}
      >
        <div className="flex flex-col items-center">
          <span className="font-mono text-[3.25rem] font-bold tracking-[-0.06em] text-foreground select-none sm:text-7xl">
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
