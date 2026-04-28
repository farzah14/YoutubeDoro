"use client";

import { useTimer } from "@/hooks/useTimer";
import { PRESETS } from "@/lib/constants";
import { formatMMSS } from "@/lib/time";
import { TimerDisplay } from "./TimerDisplay";
import { TimerControls } from "./TimerControls";
import { Segmented } from "../ui/Segmented";
import { Badge } from "../ui/Badge";

interface PlainRestCardProps {
  totalTodaySec: number;
  onDone: (sec: number) => void;
  onStop: (sec: number) => void;
}

export function PlainRestCard({ totalTodaySec, onDone, onStop }: PlainRestCardProps) {
  const timer = useTimer({
    initialMinutes: PRESETS.rest[0],
    onDone,
    onStop,
    autoNotificationTitle: "Break Over",
    autoNotificationBody: "Time to get back to focus!",
  });

  const isRunningOrPaused = timer.status === "Running" || timer.status === "Paused";

  return (
    <div className="flex flex-col space-y-6">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-text-secondary">Standard Break</span>
        <Badge variant={timer.status === "Running" ? "success" : timer.status === "Paused" ? "warning" : "secondary"}>
          {timer.status}
        </Badge>
      </div>

      <TimerDisplay remainingSec={timer.remainingSec} totalSec={timer.targetSec} />

      <div className="space-y-4">
        <TimerControls
          status={timer.status}
          onStart={timer.start}
          onPause={timer.pause}
          onResume={timer.resume}
          onStop={timer.stop}
          onReset={timer.reset}
        />

        {!isRunningOrPaused && (
          <div className="flex items-center justify-between pt-4 border-t border-border-subtle">
            <span className="text-sm text-text-secondary">Duration</span>
            <Segmented
              value={timer.minutes.toString()}
              onChange={(v) => timer.setMinutes(Number(v))}
              options={PRESETS.rest.map(m => ({ label: `${m}m`, value: m.toString() }))}
            />
          </div>
        )}
      </div>

      <div className="pt-2 text-xs text-text-muted text-center">
        Total rest today: <strong className="text-foreground">{formatMMSS(totalTodaySec)}</strong>
      </div>
    </div>
  );
}
