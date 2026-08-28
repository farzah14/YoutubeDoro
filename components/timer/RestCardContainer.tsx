"use client";

import { useCallback, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "../ui/Card";
import { Segmented } from "../ui/Segmented";
import { PlainRestCard } from "./PlainRestCard";
import { YouTubeRestCard } from "./YouTubeRestCard";

interface RestCardContainerProps {
  totalTodaySec: number;
  initialBreakMin?: number;
  onBreakStart?: () => void | boolean | Promise<void | boolean>;
  onBreakProgress?: (seconds: number) => void;
  onRestDone: (sec: number) => void;
  onRestStop: (sec: number) => void;
  onYTDone: (sec: number) => void;
  onYTStop: (sec: number) => void;
}

export function RestCardContainer({
  totalTodaySec,
  initialBreakMin,
  onBreakStart,
  onBreakProgress,
  onRestDone,
  onRestStop,
  onYTDone,
  onYTStop,
}: RestCardContainerProps) {
  const [mode, setMode] = useState<"plain" | "youtube">("plain");
  const [breakError, setBreakError] = useState("");
  const handleBreakStart = useCallback(async () => {
    const allowed = await onBreakStart?.();
    if (allowed === false) setBreakError("Start a focus session before starting a break.");
    else setBreakError("");
    return allowed;
  }, [onBreakStart]);

  return (
    <Card className="rest-card flex flex-col">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CardTitle>Break</CardTitle>
            <span className="text-xs font-mono text-text-muted">休憩</span>
          </div>
          <Segmented
            aria-label="Break mode"
            value={mode}
            onChange={(v) => setMode(v as "plain" | "youtube")}
            options={[
              { label: "Standard", value: "plain" },
              { label: "YouTube", value: "youtube" },
            ]}
          />
        </div>
      </CardHeader>

      <CardContent className="flex-1">
        {breakError && <p className="rest-card__error" role="alert">{breakError}</p>}
        {mode === "plain" ? (
          <PlainRestCard 
            totalTodaySec={totalTodaySec} 
            initialBreakMin={initialBreakMin}
            onBreakStart={handleBreakStart}
            onProgress={onBreakProgress}
            onDone={onRestDone} 
            onStop={onRestStop} 
          />
        ) : (
          <YouTubeRestCard 
            totalTodaySec={totalTodaySec} 
            onBreakStart={handleBreakStart}
            onProgress={onBreakProgress}
            onDone={onYTDone} 
            onStop={onYTStop} 
          />
        )}
      </CardContent>
    </Card>
  );
}
