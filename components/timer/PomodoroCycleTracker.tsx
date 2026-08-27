import { Button } from "../ui/Button";

interface PomodoroCycleTrackerProps {
  completedRounds: number;
  maxRoundsPerCycle?: number;
  onResetCycle?: () => void;
  onSelectLongBreak?: () => void;
}

export function PomodoroCycleTracker({
  completedRounds,
  maxRoundsPerCycle = 4,
  onResetCycle,
  onSelectLongBreak,
}: PomodoroCycleTrackerProps) {
  const currentRoundInCycle = completedRounds % maxRoundsPerCycle;
  const completedFullCycles = Math.floor(completedRounds / maxRoundsPerCycle);
  const isLongBreakEligible = completedRounds > 0 && currentRoundInCycle === 0;

  const tokens = Array.from({ length: maxRoundsPerCycle }).map((_, index) => {
    const isCompleted = isLongBreakEligible ? true : index < currentRoundInCycle;
    return (
      <span
        key={index}
        aria-hidden="true"
        className={`h-2.5 w-7 border transition-colors ${
          isCompleted
            ? "border-accent bg-accent"
            : "border-border-subtle bg-surface"
        }`}
      />
    );
  });

  return (
    <div
      className="border-y border-border-subtle py-3"
      role="group"
      aria-label="Focus session cycle"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="eyebrow shrink-0">Sessions</span>
          <div className="flex items-center gap-1" aria-hidden="true">
            {tokens}
          </div>
        </div>

        <div className="flex items-center gap-3 text-xs">
          <span className="font-mono text-text-muted">
            {completedRounds} session{completedRounds !== 1 ? "s" : ""}
            {completedFullCycles > 0 &&
              ` · ${completedFullCycles} cycle${completedFullCycles > 1 ? "s" : ""}`}
          </span>
          {completedRounds > 0 && onResetCycle && (
            <button
              type="button"
              onClick={onResetCycle}
              className="min-h-11 px-1 text-xs font-semibold text-text-secondary underline decoration-border-subtle underline-offset-4 transition-colors hover:text-foreground"
            >
              Reset cycle
            </button>
          )}
        </div>
      </div>

      {isLongBreakEligible && onSelectLongBreak && (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border border-accent/40 bg-accent-soft px-3 py-2.5 text-xs text-foreground">
          <span className="font-medium">Four sessions complete. A longer pause is ready.</span>
          <Button
            size="sm"
            variant="primary"
            className="h-9"
            onClick={onSelectLongBreak}
          >
            Take 15m break
          </Button>
        </div>
      )}
    </div>
  );
}
