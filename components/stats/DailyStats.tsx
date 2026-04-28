"use client";

import { formatMMSS } from "@/lib/time";
import { Card } from "../ui/Card";
import { WeeklyHeatmap } from "./WeeklyHeatmap";

interface DailyStatsProps {
  totalLearnSec: number;
  totalRestSec: number;
}

export function DailyStats({ totalLearnSec, totalRestSec }: DailyStatsProps) {
  const goalSec = 2 * 60 * 60; // 2 hours default goal for now
  const progress = Math.min(totalLearnSec / goalSec, 1);
  
  return (
    <Card className="mb-8 overflow-hidden bg-surface-hover/30 border-dashed border-border-subtle">
      <div className="flex flex-col p-6 gap-6">
        
        {/* Top Section: Progress Bar */}
        <div className="flex flex-col sm:flex-row items-center gap-6">
          <div className="flex-1 w-full">
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
                Daily Goal: {formatMMSS(goalSec)}
              </span>
              <span className="text-xs font-medium text-foreground">
                {Math.round(progress * 100)}%
              </span>
            </div>
            <div className="h-2 w-full bg-surface rounded-full overflow-hidden border border-border-subtle">
              <div 
                className="h-full bg-accent transition-all duration-1000 ease-out"
                style={{ width: `${progress * 100}%` }}
              />
            </div>
          </div>

          <div className="flex gap-6 sm:border-l sm:border-border-subtle sm:pl-6 w-full sm:w-auto justify-center">
            <div className="text-center">
              <div className="text-[10px] text-text-muted uppercase tracking-widest">Focus</div>
              <div className="font-mono text-lg text-foreground">{formatMMSS(totalLearnSec)}</div>
            </div>
            <div className="text-center">
              <div className="text-[10px] text-text-muted uppercase tracking-widest">Rest</div>
              <div className="font-mono text-lg text-foreground">{formatMMSS(totalRestSec)}</div>
            </div>
          </div>
        </div>

        {/* Bottom Section: Heatmap */}
        <div className="pt-6 border-t border-border-subtle/50">
          <WeeklyHeatmap />
        </div>
        
      </div>
    </Card>
  );
}
