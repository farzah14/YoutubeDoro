"use client";

import { formatMMSS } from "@/lib/time";
import { useFocusTimer } from "@/hooks/useFocusTimer";
import { supportsDocumentPictureInPicture } from "@/lib/browserFeatures";
import { useCallback, useEffect, useRef, useSyncExternalStore } from "react";
import type { TaskItem } from "@/types";
import type { TimerMode, TimerPhase } from "@/types/focus";
import { ChevronDownIcon, PictureInPictureIcon, RotateCcwIcon } from "../icons";

interface LearningCardProps {
  topicToday: string;
  totalTodaySec: number;
  pipBackgroundUrl: string;
  onRunningChange?: (running: boolean) => void;
  tasks: TaskItem[];
  activeTaskId: string | null;
  onOpenTasks: () => void;
  onStartWithTitle: (title: string) => void;
  onFocusStart?: () => void | Promise<boolean | void>;
  onBreakStart?: () => void | Promise<boolean | void>;
  onLearnDone: (seconds: number) => void;
  onLearnStop: (seconds: number) => void;
  onBreakDone: (seconds: number) => void;
  onBreakStop: (seconds: number) => void;
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

const modes: Array<[TimerMode, string]> = [
  ["pomodoro", "Pomodoro"],
  ["countdown", "Countdown"],
  ["stopwatch", "Stopwatch"],
  ["animedoro", "Animedoro"],
  ["52-17", "52 / 17"],
];

const subscribeToPipSupport = () => () => {};

export function LearningCard({
  topicToday,
  totalTodaySec,
  pipBackgroundUrl,
  onRunningChange,
  tasks,
  activeTaskId,
  onOpenTasks,
  onStartWithTitle,
  onFocusStart,
  onBreakStart,
  onLearnDone,
  onLearnStop,
  onBreakDone,
  onBreakStop,
}: LearningCardProps) {
  const timer = useFocusTimer({
    onFocusStart,
    onBreakStart,
    onFocusDone: onLearnDone,
    onFocusStop: onLearnStop,
    onBreakDone,
    onBreakStop,
  });
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
      if (taskLabel !== "What do you want to focus on?") onStartWithTitle(taskLabel);
      void timer.start();
    }
  };

  return (
    <section className="focus-dashboard" aria-labelledby="focus-task-title">
      <button type="button" className="focus-dashboard__task" onClick={onOpenTasks}>
        <span id="focus-task-title" className="focus-dashboard__task-label">{taskLabel}</span>
        <span aria-hidden="true">✎</span>
      </button>

      <div className="focus-dashboard__mode">
        <span className="focus-dashboard__mode-control">
          <select
            aria-label="Timer type"
            value={timer.preferences.mode}
            onChange={(event) => timer.setMode(event.target.value as TimerMode)}
            disabled={isRunning || isPaused}
          >
            {modes.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
          <ChevronDownIcon aria-hidden="true" />
        </span>
      </div>

      {timer.preferences.mode !== "countdown" && timer.preferences.mode !== "stopwatch" && (
        <div className="focus-dashboard__phases" role="group" aria-label="Timer phase">
          {phases.map(([phase, label]) => (
            <button
              key={phase}
              type="button"
              className={visiblePhase === phase ? "is-active" : ""}
              aria-pressed={visiblePhase === phase}
              onClick={() => timer.selectPhase(phase)}
              disabled={isRunning}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      <div className="focus-dashboard__tally" aria-label={`${timer.state.completedFocusSessions % 4} of 4 focus sessions`}>
        {[0, 1, 2, 3].map((index) => (
          <span key={index} className={index < timer.state.completedFocusSessions % 4 ? "is-complete" : ""} />
        ))}
      </div>

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
      </div>

      <p className="focus-dashboard__today">Today · {formatMMSS(totalTodaySec)} focused</p>
    </section>
  );
}
