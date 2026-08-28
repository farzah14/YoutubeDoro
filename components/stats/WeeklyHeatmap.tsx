"use client";

import { useMemo, useState } from "react";
import type { CSSProperties } from "react";
import { formatDuration } from "@/lib/duration";
import { historyFromSessions } from "@/lib/statsModel";
import { useSessionHistory } from "@/hooks/useSessionHistory";
import type { LearningSession } from "@/types/tracker";
import { Card } from "../ui/Card";

interface HeatmapDay {
  date: string;
  learnSec: number;
}

export function WeeklyHeatmap({ sessions }: { sessions?: LearningSession[] } = {}) {
  const [hoveredDay, setHoveredDay] = useState<HeatmapDay | null>(null);
  const cloudHistory = useSessionHistory({ limit: 100 });
  const records = sessions ?? cloudHistory.sessions;
  const history = useMemo(() => historyFromSessions(records), [records]);

  const days: HeatmapDay[] = useMemo(() => {
    const list: HeatmapDay[] = [];
    const now = new Date();
    for (let i = 27; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      const dayStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      const sec = history[dayStr]?.focusSeconds ?? 0;
      list.push({ date: dayStr, learnSec: sec });
    }
    return list;
  }, [history]);

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
        {hoveredDay && (
          <div className="border border-border-subtle bg-surface-secondary px-2 py-1 text-xs font-mono font-semibold text-accent">
            {hoveredDay.date}: {formatDuration(hoveredDay.learnSec)}
          </div>
        )}
      </div>

      {!hasActivity && (
        <p className="stats-empty-state mt-4 border border-dashed border-border-subtle px-3 py-2.5 text-xs text-text-muted">
          No focus logged yet — your first session will light up this row.
        </p>
      )}

      <div className="no-scrollbar mt-5 flex gap-1.5 overflow-x-auto pb-1" aria-label="28-day focus activity">
        {days.map((day) => {
          const intensity = Math.min(day.learnSec / maxSec, 1);
          const heatStyle = { "--heat": intensity } as CSSProperties;
          return (
            <div
              key={day.date}
              className="heatmap-cell h-7 w-7 shrink-0 border border-border-subtle"
              style={heatStyle}
              role="img"
              aria-label={`${day.date}: ${formatDuration(day.learnSec)}`}
              onMouseEnter={() => setHoveredDay(day)}
              onMouseLeave={() => setHoveredDay(null)}
              title={`${day.date}: ${formatDuration(day.learnSec)}`}
            />
          );
        })}
      </div>
    </Card>
  );
}
