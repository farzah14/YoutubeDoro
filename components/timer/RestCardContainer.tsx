"use client";

import { useCallback, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "../ui/Card";
import { Segmented } from "../ui/Segmented";
import { PlainRestCard } from "./PlainRestCard";
import { AnimeBreakCard } from "./AnimeBreakCard";

interface RestCardContainerProps {
  totalTodaySec: number;
  initialBreakMin?: number;
  onBreakStart?: () => void | boolean | Promise<void | boolean>;
  onBreakProgress?: (seconds: number) => void;
  onRestDone: (sec: number) => void;
  onRestStop: (sec: number) => void;
  defaultMode?: "plain" | "anime";
  onAnimeReady: (durationSeconds: number) => void;
  onAnimePlay: () => Promise<boolean>;
  onAnimePause: (elapsedSeconds: number) => void;
  onAnimeProgress: (elapsedSeconds: number) => void;
  onAnimeBuffering: (elapsedSeconds: number) => void;
  onAnimeDone: (elapsedSeconds: number) => void;
  onAnimeStop: (elapsedSeconds: number) => void;
}

export function RestCardContainer({
  totalTodaySec,
  initialBreakMin,
  onBreakStart,
  onBreakProgress,
  onRestDone,
  onRestStop,
  defaultMode,
  onAnimeReady,
  onAnimePlay,
  onAnimePause,
  onAnimeProgress,
  onAnimeBuffering,
  onAnimeDone,
  onAnimeStop,
}: RestCardContainerProps) {
  const [mode, setMode] = useState<"plain" | "anime">(defaultMode ?? "plain");
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
            onChange={(v) => setMode(v as "plain" | "anime")}
            options={[
              { label: "Standard", value: "plain" },
              { label: "Anime video", value: "anime" },
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
          <AnimeBreakCard
            totalTodaySec={totalTodaySec}
            onReady={onAnimeReady}
            onPlay={onAnimePlay}
            onPause={onAnimePause}
            onProgress={onAnimeProgress}
            onBuffering={onAnimeBuffering}
            onDone={onAnimeDone}
            onStop={onAnimeStop}
          />
        )}
      </CardContent>
    </Card>
  );
}
