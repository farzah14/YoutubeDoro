"use client";

import { useEffect, useState } from "react";
import { readNumber } from "@/lib/storage";
import { KEYS } from "@/lib/constants";
import { pad2, formatMMSS } from "@/lib/time";

interface HeatmapDay {
  date: string;
  learnSec: number;
}

export function WeeklyHeatmap() {
  const [days, setDays] = useState<HeatmapDay[]>([]);
  const [hoveredDay, setHoveredDay] = useState<HeatmapDay | null>(null);

  useEffect(() => {
    const list: HeatmapDay[] = [];
    const now = new Date();
    
    // Get last 28 days
    for (let i = 27; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      const dayStr = `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
      
      const sec = readNumber(KEYS.learnByDay(dayStr));
      list.push({ date: dayStr, learnSec: sec });
    }
    
    setDays(list);
  }, []);

  const maxSec = 2 * 60 * 60; // 2 hours max heat

  return (
    <div className="flex flex-col space-y-2">
      <div className="flex justify-between items-end">
        <h3 className="text-xs font-semibold text-text-secondary uppercase tracking-wider">Activity (Last 28 Days)</h3>
        {hoveredDay && (
          <div className="text-xs text-foreground font-mono">
            {hoveredDay.date}: {formatMMSS(hoveredDay.learnSec)}
          </div>
        )}
      </div>

      <div className="flex gap-1.5 overflow-x-auto pb-2">
        {days.map((day, i) => {
          const intensity = Math.min(day.learnSec / maxSec, 1);
          let bgClass = "bg-surface-hover border-border-subtle";
          
          if (intensity > 0) {
            if (intensity < 0.25) bgClass = "bg-emerald-950/40 border-emerald-900/50";
            else if (intensity < 0.5) bgClass = "bg-emerald-900/60 border-emerald-800/50";
            else if (intensity < 0.75) bgClass = "bg-emerald-700/80 border-emerald-600/50";
            else bgClass = "bg-emerald-500 border-emerald-400";
          }

          return (
            <div
              key={day.date}
              className={`h-6 w-6 rounded-sm border ${bgClass} transition-all duration-200 hover:ring-2 hover:ring-foreground/20 cursor-pointer`}
              onMouseEnter={() => setHoveredDay(day)}
              onMouseLeave={() => setHoveredDay(null)}
              title={`${day.date}: ${formatMMSS(day.learnSec)}`}
            />
          );
        })}
      </div>
    </div>
  );
}
