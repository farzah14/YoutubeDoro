"use client";

import { formatMMSS } from "@/lib/time";
import type { FocusTimer } from "@/hooks/useFocusTimer";
import { supportsDocumentPictureInPicture } from "@/lib/browserFeatures";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import type { TaskItem } from "@/types";
import type { TimerPhase } from "@/types/focus";
import { FlameIcon, LightbulbIcon, PencilIcon, PictureInPictureIcon, RotateCcwIcon } from "../icons";

interface LearningCardProps {
  topicToday: string;
  totalTodaySec: number;
  pipBackgroundUrl: string;
  timer: FocusTimer;
  onRunningChange?: (running: boolean) => void;
  tasks: TaskItem[];
  activeTaskId: string | null;
  onOpenTasks: () => void;
  onProgress?: (phase: TimerPhase, elapsedSeconds: number, status: "idle" | "running" | "paused" | "done") => void;
}

interface PipSnapshot {
  displaySeconds: number;
  phase: TimerPhase;
  showTaskInPip: boolean;
  taskLabel: string;
}

interface PipNodes {
  time: HTMLElement;
  phase: HTMLElement;
}

const phases: Array<["focus" | "break", string]> = [
  ["focus", "Focus"],
  ["break", "Break"],
];

const phaseIcons = {
  focus: LightbulbIcon,
  break: FlameIcon,
};

interface PhasePickerProps {
  phase: "focus" | "break";
  disabled: boolean;
  onChange: (phase: "focus" | "break") => void;
}

function PhasePicker({ phase, disabled, onChange }: PhasePickerProps) {
  const [open, setOpen] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const CurrentIcon = phaseIcons[phase];
  const phaseLabel = phase === "focus" ? "Focus" : "Break";
  const pickerOpen = open && !disabled;

  useEffect(() => {
    if (!pickerOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (!pickerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setOpen(false);
      triggerRef.current?.focus();
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [pickerOpen]);

  return (
    <div className="focus-dashboard__phase-picker" ref={pickerRef}>
      <button
        ref={triggerRef}
        type="button"
        className="focus-dashboard__phase-trigger"
        aria-label={`Timer phase: ${phaseLabel}`}
        aria-haspopup="listbox"
        aria-expanded={pickerOpen}
        aria-controls="focus-phase-menu"
        title={`Timer phase: ${phaseLabel}`}
        onClick={() => setOpen((isOpen) => !isOpen)}
        disabled={disabled}
      >
        <CurrentIcon className="h-5 w-5" aria-hidden="true" />
        <span className="sr-only">Timer phase: {phaseLabel}</span>
      </button>
      {pickerOpen && (
        <div id="focus-phase-menu" className="focus-dashboard__phase-menu" role="listbox" aria-label="Timer phase">
          {phases.map(([option, label]) => {
            const PhaseIcon = phaseIcons[option];
            const selected = phase === option;
            return (
              <button
                key={option}
                type="button"
                className="focus-dashboard__phase-option"
                data-phase={option}
                role="option"
                aria-selected={selected}
                onClick={() => {
                  onChange(option);
                  setOpen(false);
                }}
              >
                <PhaseIcon className="h-4 w-4" aria-hidden="true" />
                <span>{label}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

const subscribeToPipSupport = () => () => {};

export function LearningCard({
  topicToday,
  pipBackgroundUrl,
  timer,
  onRunningChange,
  tasks,
  activeTaskId,
  onOpenTasks,
  onProgress,
}: LearningCardProps) {
  const pipSupported = useSyncExternalStore(
    subscribeToPipSupport,
    supportsDocumentPictureInPicture,
    () => false,
  );
  const activeTask = tasks.find((task) => task.id === activeTaskId)
    ?? tasks.find((task) => !task.completed);
  const taskLabel = activeTask?.text || topicToday.trim() || "What do you want to focus on?";
  const isRunning = timer.state.status === "running";
  const isPaused = timer.state.status === "paused";
  const visiblePhase = timer.state.phase === "focus" ? "focus" : "break";
  const showPhases = timer.preferences.mode !== "countdown" && timer.preferences.mode !== "stopwatch";

  useEffect(() => {
    onProgress?.(timer.state.phase, timer.state.elapsedSeconds, timer.state.status);
  }, [onProgress, timer.state.elapsedSeconds, timer.state.phase, timer.state.status]);

  const pipWindowRef = useRef<Window | null>(null);
  const pipNodesRef = useRef<PipNodes | null>(null);
  const pipSnapshotRef = useRef<PipSnapshot>({
    displaySeconds: timer.displaySeconds,
    phase: timer.state.phase,
    showTaskInPip: timer.preferences.showTaskInPip,
    taskLabel,
  });

  const updatePip = useCallback(() => {
    const nodes = pipNodesRef.current;
    const pipWindow = pipWindowRef.current;
    if (!nodes || !pipWindow || pipWindow.closed) return;

    const snapshot = pipSnapshotRef.current;
    const phaseLabel = snapshot.phase === "focus" ? "Focus" : "Break";
    nodes.time.textContent = formatMMSS(snapshot.displaySeconds);
    nodes.phase.textContent = snapshot.showTaskInPip
      ? `${phaseLabel} · ${snapshot.taskLabel}`
      : phaseLabel;
  }, []);

  useEffect(() => {
    pipSnapshotRef.current = {
      displaySeconds: timer.displaySeconds,
      phase: timer.state.phase,
      showTaskInPip: timer.preferences.showTaskInPip,
      taskLabel,
    };
    updatePip();
  }, [taskLabel, timer.displaySeconds, timer.preferences.showTaskInPip, timer.state.phase, updatePip]);

  useEffect(() => {
    const running = timer.state.status === "running";
    onRunningChange?.(running);
    return () => onRunningChange?.(false);
  }, [onRunningChange, timer.state.status]);

  useEffect(() => () => {
    pipWindowRef.current?.close();
    pipWindowRef.current = null;
    pipNodesRef.current = null;
  }, []);

  const openPip = async () => {
    const pictureInPicture = (window as Window & { documentPictureInPicture?: { requestWindow: (options: { width: number; height: number }) => Promise<Window> } }).documentPictureInPicture;
    if (!pictureInPicture) return;

    const existingWindow = pipWindowRef.current;
    if (existingWindow && !existingWindow.closed) {
      existingWindow.focus();
      updatePip();
      return;
    }

    try {
      const pipWindow = await pictureInPicture.requestWindow({ width: 320, height: 180 });
      pipWindowRef.current = pipWindow;
      pipWindow.document.body.innerHTML = "";
      const style = pipWindow.document.createElement("style");
      style.textContent = `
        :root { color-scheme: dark; }
        * { box-sizing: border-box; }
        html, body { min-height: 100%; }
        body {
          display: grid;
          min-height: 100vh;
          margin: 0;
          place-items: center;
          background-color: #0b1a2a;
          background-position: center;
          background-size: cover;
          color: #dde7e2;
          font-family: Inter, ui-sans-serif, system-ui, sans-serif;
        }
        body::before {
          position: fixed;
          inset: 0;
          background: rgba(7, 16, 27, 0.66);
          content: "";
        }
        main {
          position: relative;
          display: grid;
          width: 100%;
          height: 100%;
          align-content: center;
          justify-items: center;
          gap: 0.3rem;
          padding: 1rem;
          background: rgba(11, 26, 42, 0.32);
          text-align: center;
        }
        time {
          color: #fff;
          font: 700 clamp(2rem, 18vw, 4rem)/0.9 ui-monospace, SFMono-Regular, Consolas, monospace;
          letter-spacing: 0.04em;
        }
        small {
          max-width: 100%;
          overflow: hidden;
          color: #dde7e2;
          font-size: 0.68rem;
          font-weight: 700;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
      `;
      pipWindow.document.head.append(style);
      const main = pipWindow.document.createElement("main");
      const time = pipWindow.document.createElement("time");
      const phase = pipWindow.document.createElement("small");
      main.append(time, phase);
      pipWindow.document.body.append(main);
      pipWindow.document.body.style.backgroundImage = `url(${JSON.stringify(pipBackgroundUrl)})`;
      pipNodesRef.current = { time, phase };
      updatePip();
      pipWindow.addEventListener("pagehide", () => {
        if (pipWindowRef.current !== pipWindow) return;
        pipWindowRef.current = null;
        pipNodesRef.current = null;
      }, { once: true });
    } catch { /* unsupported or closed by the browser */ }
  };

  const handlePrimary = () => {
    if (isRunning) timer.pause();
    else if (isPaused) timer.resume();
    else {
      void timer.start();
    }
  };

  return (
    <section className="focus-dashboard" aria-labelledby="focus-task-title" data-phase={visiblePhase}>
      <header className="focus-dashboard__context">
        <span className="focus-dashboard__context-label">Current priority</span>
        <button type="button" className="focus-dashboard__priority-action" onClick={onOpenTasks} title="Change priority">
          <span id="focus-task-title" className="focus-dashboard__task-label">{taskLabel}</span>
          <PencilIcon className="focus-dashboard__priority-icon h-4 w-4" aria-hidden="true" />
          <span className="sr-only">Change priority</span>
        </button>
      </header>

      <time className="focus-dashboard__time numeric-time" aria-live="polite">
        {formatMMSS(timer.displaySeconds)}
      </time>

      <div className="focus-dashboard__controls">
        <button type="button" className="focus-dashboard__primary" onClick={handlePrimary}>
          {isRunning ? "Pause" : isPaused ? "Resume" : "Start"}
        </button>
        <button type="button" className="focus-dashboard__icon" onClick={timer.reset} aria-label="Reset timer">
          <RotateCcwIcon className="h-7 w-7" aria-hidden="true" />
        </button>
        <button type="button" className="focus-dashboard__pip" onClick={() => { void openPip(); }} disabled={!pipSupported} aria-label="Open picture-in-picture" title={pipSupported ? "Open picture-in-picture" : "Picture-in-picture is not supported in this browser"}>
          <PictureInPictureIcon className="h-5 w-5" aria-hidden="true" />
        </button>
        {showPhases && <PhasePicker phase={visiblePhase} disabled={isRunning} onChange={(phase) => timer.selectPhase(phase)} />}
      </div>

    </section>
  );
}
