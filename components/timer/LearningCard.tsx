"use client";

import { useEffect, useState } from "react";
import { useTimer } from "@/hooks/useTimer";
import { PRESETS } from "@/lib/constants";
import { formatMMSS } from "@/lib/time";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "../ui/Card";
import { Badge } from "../ui/Badge";
import { Input } from "../ui/Input";
import { TimerDisplay } from "./TimerDisplay";
import { TimerControls } from "./TimerControls";
import { Segmented } from "../ui/Segmented";

interface LearningCardProps {
  topicToday: string;
  totalTodaySec: number;
  onStartWithTitle: (title: string) => void;
  onLearnDone: (seconds: number) => void;
  onLearnStop: (seconds: number) => void;
}

export function LearningCard({
  topicToday,
  totalTodaySec,
  onStartWithTitle,
  onLearnDone,
  onLearnStop,
}: LearningCardProps) {
  const [topicDraft, setTopicDraft] = useState(topicToday);

  // Sync draft when topicToday prop changes externally
  useEffect(() => {
    setTopicDraft(topicToday);
  }, [topicToday]);

  const timer = useTimer({
    initialMinutes: PRESETS.learning[0],
    onDone: onLearnDone,
    onStop: onLearnStop,
    autoNotificationTitle: "Focus Complete",
    autoNotificationBody: "Great job! Time to take a break.",
  });

  const handleStart = () => {
    onStartWithTitle(topicDraft);
    timer.start();
  };

  const isRunningOrPaused = timer.status === "Running" || timer.status === "Paused";

  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle>Focus</CardTitle>
          <Badge variant={timer.status === "Running" ? "success" : timer.status === "Paused" ? "warning" : "secondary"}>
            {timer.status}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="flex-1 space-y-6">
        <TimerDisplay remainingSec={timer.remainingSec} totalSec={timer.targetSec} />

        <div className="space-y-4">
          <TimerControls
            status={timer.status}
            onStart={handleStart}
            onPause={timer.pause}
            onResume={timer.resume}
            onStop={timer.stop}
            onReset={timer.reset}
          />

          {!isRunningOrPaused && (
            <div className="flex flex-col gap-2 pt-4 border-t border-border-subtle">
              <label className="text-sm font-medium text-text-secondary">Topic / Subject</label>
              <Input
                value={topicDraft}
                onChange={(e) => setTopicDraft(e.target.value)}
                placeholder="e.g. Next.js Routing, Spanish verbs..."
              />
            </div>
          )}

          {!isRunningOrPaused && (
            <div className="flex items-center justify-between pt-2">
              <span className="text-sm text-text-secondary">Duration</span>
              <Segmented
                value={timer.minutes.toString()}
                onChange={(v) => timer.setMinutes(Number(v))}
                options={PRESETS.learning.map(m => ({ label: `${m}m`, value: m.toString() }))}
              />
            </div>
          )}
        </div>
      </CardContent>

      <CardFooter className="border-t border-border-subtle bg-surface-hover/30 py-4 text-xs text-text-muted justify-between">
        <span>Today's focus: <strong className="text-foreground">{formatMMSS(totalTodaySec)}</strong></span>
        {topicToday.trim() && <span>Current: <strong className="text-foreground">{topicToday}</strong></span>}
      </CardFooter>
    </Card>
  );
}
