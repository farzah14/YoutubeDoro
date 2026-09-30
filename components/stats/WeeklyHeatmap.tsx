"use client";

import { useMemo, useState } from "react";
import type { CSSProperties } from "react";
import { formatDuration } from "@/lib/duration";
import { dateKeys, historyFromSessions } from "@/lib/statsModel";
import { dayKey } from "@/lib/time";
import { useSessionHistory } from "@/hooks/useSessionHistory";
import type { LearningSession } from "@/types/tracker";
import { Card } from "../ui/Card";

interface HeatmapDay {
  date: string;
  learnSec: number;
}

interface WeeklyHeatmapProps {
  sessions?: LearningSession[];
  today?: string;
}

export function WeeklyHeatmap({ sessions, today = "" }: WeeklyHeatmapProps = {}) {
  const [hoveredDay, setHoveredDay] = useState<HeatmapDay | null>(null);
  const cloudHistory = useSessionHistory({ limit: 100 });
  const records = sessions ?? cloudHistory.sessions;
  const history = useMemo(() => historyFromSessions(records), [records]);
  const effectiveToday = today || dayKey();

  const days: HeatmapDay[] = useMemo(() => {
    const keys = dateKeys(effectiveToday, 28);
    return keys.map((dayStr) => ({
      date: dayStr,
      learnSec: history[dayStr]?.focusSeconds ?? 0,
    }));
  }, [effectiveToday, history]);

  const weeks = useMemo(() => {
    const list: HeatmapDay[][] = [];
    for (let i = 0; i < days.length; i += 7) {
      list.push(days.slice(i, i + 7));
    }
    return list;
  }, [days]);

  const maxSec = 2 * 60 * 60; // 2 hours max heat
  const hasActivity = days.some((day) => day.learnSec > 0);

  return (
    <Card className="stats-card activity-summary p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="eyebrow">Focus timeline · 28日間</p>
          <h2 className="mt-2 text-lg font-bold tracking-tight text-foreground">The last four weeks</h2>
          <p className="mt-1 text-xs text-text-muted">A small record of showing up.</p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span className="text-xs font-mono text-text-muted">
            {days[0]?.date} → {days[days.length - 1]?.date}
          </span>
          {hoveredDay ? (
            <div className="border border-border-subtle bg-surface-secondary px-2 py-1 text-xs font-mono font-semibold text-accent">
              {hoveredDay.date}: {formatDuration(hoveredDay.learnSec)}
            </div>
          ) : (
            <span className="text-xs text-text-muted opacity-60">Hover any day for details</span>
          )}
        </div>
      </div>

      {!hasActivity && (
        <p className="stats-empty-state mt-4 border border-dashed border-border-subtle px-3 py-2.5 text-xs text-text-muted">
          No focus logged yet — your first session will light up this row.
        </p>
      )}

      <div className="mt-5 space-y-2.5" aria-label="28-day focus activity">
        {weeks.map((week, weekIndex) => {
          const label = weekIndex === 3 ? "This week" : `${3 - weekIndex}w ago`;
          return (
            <div key={weekIndex} className="flex items-center gap-2.5 sm:gap-3">
              <span className="w-16 shrink-0 text-xs font-mono text-text-muted">
                {label}
              </span>
              <div className="flex gap-1.5 sm:gap-2">
                {week.map((day) => {
                  const isToday = day.date === effectiveToday;
                  const intensity = Math.min(day.learnSec / maxSec, 1);
                  const heatStyle = { "--heat": intensity } as CSSProperties;
                  return (
                    <div
                      key={day.date}
                      className={`heatmap-cell h-7 w-7 sm:h-8 sm:w-8 shrink-0 border border-border-subtle ${isToday ? "ring-1 ring-accent" : ""}`}
                      style={heatStyle}
                      role="img"
                      aria-label={`${day.date}${isToday ? " (Today)" : ""}: ${formatDuration(day.learnSec)}`}
                      onMouseEnter={() => setHoveredDay(day)}
                      onMouseLeave={() => setHoveredDay(null)}
                      title={`${day.date}${isToday ? " (Today)" : ""}: ${formatDuration(day.learnSec)}`}
                    />
                  );
                })}
              </div>
              <span className="hidden sm:inline text-xs font-mono text-text-muted">
                {week[0]?.date} → {week[week.length - 1]?.date}
              </span>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
