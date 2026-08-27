"use client";

import { useMemo } from "react";
import { formatMMSS } from "@/lib/time";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { KEYS, PRESETS } from "@/lib/constants";
import { calculateStreak } from "@/lib/streak";
import { Card } from "../ui/Card";
import { Badge } from "../ui/Badge";
import { FlameIcon } from "../icons";

interface DailyStatsProps {
  totalLearnSec: number;
  totalRestSec: number;
  pomodoroRounds?: number;
  today?: string;
}

export function DailyStats({
  totalLearnSec,
  totalRestSec,
  pomodoroRounds = 0,
  today,
}: DailyStatsProps) {
  const defaultGoalSec = PRESETS.defaultGoalHours * 60 * 60;
  const [goalSec, setGoalSec] = useLocalStorage(KEYS.dailyGoalSec, defaultGoalSec);

  const streakData = useMemo(() => {
    return calculateStreak(today);
  }, [today]);

  const progress = goalSec > 0 ? Math.min(totalLearnSec / goalSec, 1) : 0;
  const isGoalReached = totalLearnSec >= goalSec && goalSec > 0;
  const currentGoalHours = Math.round((goalSec / 3600) * 10) / 10;

  const handleGoalChange = (hours: number) => {
    setGoalSec(hours * 60 * 60);
  };

  return (
    <Card className="daily-summary p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="eyebrow">Today&apos;s desk · 今日の進捗</p>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-mono text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              {formatMMSS(totalLearnSec)}
            </span>
            <span className="text-xs text-text-muted">focused</span>
          </div>
          <p className="mt-1 text-xs text-text-muted">of {formatMMSS(goalSec)} daily goal</p>
        </div>

        <div className="flex min-w-0 flex-col items-start gap-2 sm:items-end">
          <label htmlFor="daily-goal" className="eyebrow">Daily goal</label>
          <select
            id="daily-goal"
            value={currentGoalHours}
            onChange={(event) => handleGoalChange(Number(event.target.value))}
            aria-label="Change daily focus goal"
            className="h-10 max-w-full border border-border bg-surface-secondary px-3 text-xs font-mono text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
          >
            {[0.5, 1, 1.5, 2, 3, 4, 5, 6, 8].map((hours) => (
              <option key={hours} value={hours} className="bg-surface text-foreground">
                {hours}h goal ({formatMMSS(hours * 3600)})
              </option>
            ))}
          </select>
          {isGoalReached && (
            <Badge variant="success" className="text-[0.68rem]">Goal reached</Badge>
          )}
        </div>
      </div>

      <div className="mt-6 space-y-2">
        <div className="flex items-center justify-between gap-3 text-xs">
          <span className="text-text-muted">Goal completion</span>
          <span className="font-mono font-semibold text-accent">{Math.round(progress * 100)}%</span>
        </div>
        <div
          className="h-2 w-full overflow-hidden rounded-sm border border-border-subtle bg-surface-secondary"
          role="progressbar"
          aria-label="Daily focus goal completion"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(progress * 100)}
        >
          <div
            className={`h-full transition-[width] duration-500 ease-out ${isGoalReached ? "bg-success" : "bg-accent"}`}
            style={{ width: `${progress * 100}%` }}
          />
        </div>
      </div>

      <dl className="mt-6 grid grid-cols-3 divide-x divide-border-subtle border-t border-border-subtle pt-4">
        <div className="min-w-0 pr-3">
          <dt className="text-[0.62rem] font-semibold uppercase tracking-[0.16em] text-text-muted">Sessions</dt>
          <dd className="mt-1 font-mono text-lg font-bold text-foreground">{pomodoroRounds}</dd>
        </div>
        <div className="min-w-0 px-3">
          <dt className="text-[0.62rem] font-semibold uppercase tracking-[0.16em] text-text-muted">Rest</dt>
          <dd className="mt-1 font-mono text-lg font-semibold text-text-secondary">{formatMMSS(totalRestSec)}</dd>
        </div>
        <div className="min-w-0 pl-3">
          <dt className="flex items-center gap-1 text-[0.62rem] font-semibold uppercase tracking-[0.16em] text-text-muted">
            <FlameIcon className="h-3 w-3 text-accent" aria-hidden="true" />
            Streak
          </dt>
          <dd className="mt-1 font-mono text-lg font-bold text-accent">{streakData.currentStreak}d</dd>
        </div>
      </dl>
    </Card>
  );
}
