import { TimerStatus } from "@/types";
import { Button } from "../ui/Button";
import { PlayIcon, PauseIcon, SquareIcon, RotateCcwIcon } from "../icons";

interface TimerControlsProps {
  status: TimerStatus;
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
  onReset?: () => void;
  showReset?: boolean;
}

export function TimerControls({
  status,
  onStart,
  onPause,
  onResume,
  onStop,
  onReset,
  showReset = true,
}: TimerControlsProps) {
  return (
    <div className="flex flex-wrap items-center justify-center gap-3">
      {status === "Idle" || status === "Done" ? (
        <Button onClick={onStart} size="lg" className="w-32">
          <PlayIcon className="mr-2 h-4 w-4" /> Start
        </Button>
      ) : status === "Running" ? (
        <Button onClick={onPause} size="lg" variant="secondary" className="w-32">
          <PauseIcon className="mr-2 h-4 w-4" /> Pause
        </Button>
      ) : (
        <Button onClick={onResume} size="lg" className="w-32">
          <PlayIcon className="mr-2 h-4 w-4" /> Resume
        </Button>
      )}

      <Button
        onClick={onStop}
        size="lg"
        variant="ghost"
        disabled={status === "Idle" || status === "Done"}
        className="w-32"
      >
        <SquareIcon className="mr-2 h-4 w-4" /> Stop
      </Button>

      {showReset && (
        <Button
          onClick={onReset}
          size="lg"
          variant="ghost"
          className="w-12 px-0"
          title="Reset Timer"
        >
          <RotateCcwIcon className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}
