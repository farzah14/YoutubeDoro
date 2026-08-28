"use client";

import { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "../ui/Card";
import { Segmented } from "../ui/Segmented";
import { PlainRestCard } from "./PlainRestCard";
import { YouTubeRestCard } from "./YouTubeRestCard";

interface RestCardContainerProps {
  totalTodaySec: number;
  initialBreakMin?: number;
  onRestDone: (sec: number) => void;
  onRestStop: (sec: number) => void;
  onYTDone: (sec: number) => void;
  onYTStop: (sec: number) => void;
}

export function RestCardContainer({
  totalTodaySec,
  initialBreakMin,
  onRestDone,
  onRestStop,
  onYTDone,
  onYTStop,
}: RestCardContainerProps) {
  const [mode, setMode] = useState<"plain" | "youtube">("plain");

  return (
    <Card className="rest-card flex flex-col">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CardTitle>Rest</CardTitle>
            <span className="text-xs font-mono text-text-muted">休憩</span>
          </div>
          <Segmented
            aria-label="Rest mode"
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
        {mode === "plain" ? (
          <PlainRestCard 
            totalTodaySec={totalTodaySec} 
            initialBreakMin={initialBreakMin}
            onDone={onRestDone} 
            onStop={onRestStop} 
          />
        ) : (
          <YouTubeRestCard 
            totalTodaySec={totalTodaySec} 
            onDone={onYTDone} 
            onStop={onYTStop} 
          />
        )}
      </CardContent>
    </Card>
  );
}
