import { formatMMSS } from "@/lib/time";
import { ProgressRing } from "../ui/ProgressRing";
import { cx } from "@/lib/utils";

interface TimerDisplayProps {
  remainingSec: number;
  totalSec: number;
}

export function TimerDisplay({ remainingSec, totalSec }: TimerDisplayProps) {
  // calculate progress (1 when full, 0 when empty)
  const progress = totalSec > 0 ? remainingSec / totalSec : 0;
  
  // Decide the color class based on progress
  let ringClass = "text-accent";
  if (progress < 0.2) {
    ringClass = "text-amber-500";
  }
  if (progress < 0.05) {
    ringClass = "text-danger";
  }

  // Pulse effect when time is very low (e.g. <= 60 seconds)
  const isPulsing = remainingSec <= 60 && remainingSec > 0;

  return (
    <div 
      className="flex justify-center py-6"
      role="timer"
      aria-live="polite"
      aria-atomic="true"
    >
      <ProgressRing 
        progress={progress} 
        size={260} 
        strokeWidth={4}
        className={cx(ringClass, isPulsing && "motion-safe:animate-pulse")}
      >
        <div className="flex flex-col items-center">
          <span className="font-mono text-6xl tracking-tighter sm:text-7xl">
            {formatMMSS(remainingSec)}
          </span>
          <span className="mt-2 text-sm text-text-muted">
            {Math.round(progress * 100)}% remaining
          </span>
        </div>
      </ProgressRing>
    </div>
  );
}
