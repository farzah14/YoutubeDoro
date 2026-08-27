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
    <div className="flex flex-wrap items-center justify-center gap-2.5">
      {status === "Idle" || status === "Done" ? (
        <Button
          onClick={onStart}
          size="lg"
          variant="primary"
          className="min-w-40 text-sm"
        >
          <PlayIcon className="mr-2 h-4 w-4 fill-current" /> Start Focus
        </Button>
      ) : status === "Running" ? (
        <Button
          onClick={onPause}
          size="lg"
          variant="primary"
          className="min-w-40 text-sm"
        >
          <PauseIcon className="mr-2 h-4 w-4 fill-current" /> Pause
        </Button>
      ) : (
        <Button
          onClick={onResume}
          size="lg"
          variant="primary"
          className="min-w-40 text-sm"
        >
          <PlayIcon className="mr-2 h-4 w-4 fill-current" /> Resume
        </Button>
      )}

      <Button
        onClick={onStop}
        size="lg"
        variant="secondary"
        disabled={status === "Idle" || status === "Done"}
        className="min-w-24 text-sm"
      >
        <SquareIcon className="mr-2 h-4 w-4" /> Stop
      </Button>

      {showReset && onReset && (
        <Button
          onClick={onReset}
          size="icon"
          variant="ghost"
          className="h-11 w-11 text-text-muted hover:text-foreground"
          aria-label="Reset timer"
          title="Reset timer"
        >
          <RotateCcwIcon className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}
