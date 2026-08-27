"use client";

import { useCallback, useMemo, useState, useSyncExternalStore } from "react";
import type { CSSProperties } from "react";
import { readNumber } from "@/lib/storage";
import { KEYS } from "@/lib/constants";
import { pad2, formatMMSS } from "@/lib/time";
import { Card } from "../ui/Card";

interface HeatmapDay {
  date: string;
  learnSec: number;
}

function subscribe(callback: () => void) {
  if (typeof window === "undefined") return () => {};
  window.addEventListener("storage", callback);
  window.addEventListener("local-storage", callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener("local-storage", callback);
  };
}

export function WeeklyHeatmap() {
  const [hoveredDay, setHoveredDay] = useState<HeatmapDay | null>(null);

  const getSnapshot = useCallback(() => {
    if (typeof window === "undefined") return "";
    const now = new Date();
    const values: number[] = [];
    for (let i = 27; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      const dayStr = `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
      values.push(readNumber(KEYS.learnByDay(dayStr)) || 0);
    }
    return JSON.stringify(values);
  }, []);

  const getServerSnapshot = useCallback(() => {
    return JSON.stringify(new Array(28).fill(0));
  }, []);

  const rawValues = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const days: HeatmapDay[] = useMemo(() => {
    let values: number[];
    try {
      values = rawValues ? JSON.parse(rawValues) : new Array(28).fill(0);
    } catch {
      values = new Array(28).fill(0);
    }

    const list: HeatmapDay[] = [];
    const now = new Date();
    for (let i = 27; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      const dayStr = `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
      const sec = values[27 - i] || 0;
      list.push({ date: dayStr, learnSec: sec });
    }
    return list;
  }, [rawValues]);

  const maxSec = 2 * 60 * 60; // 2 hours max heat
  const hasActivity = days.some((day) => day.learnSec > 0);

  return (
    <Card className="activity-summary p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="eyebrow">Focus timeline · 28日間</p>
          <h2 className="mt-2 text-lg font-bold tracking-tight text-foreground">The last four weeks</h2>
          <p className="mt-1 text-xs text-text-muted">A small record of showing up.</p>
        </div>
        {hoveredDay && (
          <div className="border border-border-subtle bg-surface-secondary px-2 py-1 text-xs font-mono font-semibold text-accent">
            {hoveredDay.date}: {formatMMSS(hoveredDay.learnSec)}
          </div>
        )}
      </div>

      {!hasActivity && (
        <p className="mt-4 border border-dashed border-border-subtle px-3 py-2.5 text-xs text-text-muted">
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
              aria-label={`${day.date}: ${formatMMSS(day.learnSec)}`}
              onMouseEnter={() => setHoveredDay(day)}
              onMouseLeave={() => setHoveredDay(null)}
              title={`${day.date}: ${formatMMSS(day.learnSec)}`}
            />
          );
        })}
      </div>
    </Card>
  );
}
