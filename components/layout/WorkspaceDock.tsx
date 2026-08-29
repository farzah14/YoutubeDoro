"use client";

import { useEffect, useRef, useState, type ComponentProps, type ReactNode } from "react";
import type { TimerMode } from "@/types/focus";
import type { WorkspaceMode, WorkspacePanel } from "@/types/workspace";
import {
  CheckIcon,
  ClockIcon,
  HomeIcon,
  LightbulbIcon,
  MaximizeIcon,
  MonitorIcon,
  MusicIcon,
  NotepadIcon,
  PomodoroIcon,
  SettingsIcon,
  TargetIcon,
  WaveformIcon,
} from "../icons";

interface WorkspaceDockProps {
  mode: WorkspaceMode;
  openPanel: WorkspacePanel | null;
  onModeChange: (mode: WorkspaceMode) => void;
  onPanelToggle: (panel: WorkspacePanel) => void;
  timerRunning?: boolean;
  timerBusy?: boolean;
  timerMode?: TimerMode;
  onTimerModeChange?: (mode: TimerMode) => void;
  onFullscreen?: () => void;
}

const modes: Array<[TimerMode, string]> = [
  ["pomodoro", "Pomodoro"],
  ["countdown", "Countdown"],
  ["stopwatch", "Stopwatch"],
  ["animedoro", "Animedoro"],
  ["52-17", "52 / 17"],
];

type ModeIcon = (props: ComponentProps<"svg">) => ReactNode;

const modeIcons: Record<TimerMode, ModeIcon> = {
  pomodoro: PomodoroIcon,
  countdown: ClockIcon,
  stopwatch: WaveformIcon,
  animedoro: MonitorIcon,
  "52-17": TargetIcon,
};

const dockButtonClass = (active: boolean) =>
  `workspace-dock__button ${active ? "workspace-dock__button--active" : ""}`;

function LearningMethodPicker({
  mode,
  disabled,
  onModeChange,
}: {
  mode: TimerMode;
  disabled: boolean;
  onModeChange: (mode: TimerMode) => void;
}) {
  const [open, setOpen] = useState(false);
  const pickerRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const current = modes.find(([value]) => value === mode) ?? modes[0];
  const CurrentIcon = modeIcons[current[0]];

  useEffect(() => {
    if (!open) return;
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
  }, [open]);

  return (
    <div className="workspace-dock__method-picker" ref={pickerRef}>
      <button
        ref={triggerRef}
        type="button"
        className="workspace-dock__button workspace-dock__method-trigger"
        aria-label={`Learning method: ${current[1]}`}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls="workspace-learning-method-menu"
        onClick={() => setOpen((value) => !value)}
        title={current[1]}
        disabled={disabled}
      >
        <CurrentIcon className="h-5 w-5" aria-hidden="true" />
        <span className="sr-only">Learning method: {current[1]}</span>
      </button>

      {open && !disabled && (
        <div
          id="workspace-learning-method-menu"
          className="workspace-dock__method-menu"
          role="listbox"
          aria-label="Learning methods"
        >
          {modes.map(([value, label]) => {
            const ModeIcon = modeIcons[value];
            const selected = mode === value;
            return (
              <button
                key={value}
                type="button"
                className="workspace-dock__method-option"
                role="option"
                aria-selected={selected}
                onClick={() => {
                  onModeChange(value);
                  setOpen(false);
                }}
              >
                <ModeIcon className="workspace-dock__method-option-icon h-4 w-4" aria-hidden="true" />
                <span>{label}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function WorkspaceDock({
  mode,
  openPanel,
  onModeChange,
  onPanelToggle,
  timerRunning = false,
  timerBusy = timerRunning,
  timerMode,
  onTimerModeChange,
  onFullscreen,
}: WorkspaceDockProps) {
  return (
    <nav className={`workspace-dock ${timerRunning ? "workspace-dock--hidden" : ""}`} aria-hidden={timerRunning || undefined} aria-label="YoutubeDoro workspace controls">
      <div className="workspace-dock__left" aria-label="Focus tools">
        <button
          type="button"
          className={dockButtonClass(openPanel === "music")}
          aria-pressed={openPanel === "music"}
          onClick={() => onPanelToggle("music")}
          title="Music"
        >
          <MusicIcon className="h-5 w-5" aria-hidden="true" />
          <span className="workspace-dock__label" aria-hidden="true">Music</span>
          <span className="sr-only">Music</span>
        </button>
        <button
          type="button"
          className={dockButtonClass(openPanel === "subtasks")}
          aria-pressed={openPanel === "subtasks"}
          onClick={() => onPanelToggle("subtasks")}
          title="Sub-tasks"
        >
          <CheckIcon className="h-5 w-5" aria-hidden="true" />
          <span className="workspace-dock__label" aria-hidden="true">Sub-tasks</span>
          <span className="sr-only">Sub-tasks</span>
        </button>
        <button
          type="button"
          className={dockButtonClass(openPanel === "history")}
          aria-pressed={openPanel === "history"}
          onClick={() => onPanelToggle("history")}
          title="History"
        >
          <NotepadIcon className="h-5 w-5" aria-hidden="true" />
          <span className="workspace-dock__label" aria-hidden="true">History</span>
          <span className="sr-only">History</span>
        </button>
      </div>

      <div className="workspace-dock__center" aria-label="Workspace modes">
        <button
          type="button"
          className={dockButtonClass(mode === "home")}
          aria-current={mode === "home" ? "page" : undefined}
          onClick={() => onModeChange("home")}
          title="Home"
        >
          <HomeIcon className="h-5 w-5" aria-hidden="true" />
          <span className="workspace-dock__label" aria-hidden="true">Home</span>
          <span className="sr-only">Home</span>
        </button>
        <button
          type="button"
          className={dockButtonClass(mode === "focus")}
          aria-current={mode === "focus" ? "page" : undefined}
          onClick={() => onModeChange("focus")}
          title="Focus mode"
        >
          <LightbulbIcon className="h-5 w-5" aria-hidden="true" />
          <span className="workspace-dock__label" aria-hidden="true">Focus</span>
          <span className="sr-only">Focus</span>
        </button>
      </div>

      <div className="workspace-dock__right">
        {mode === "focus" && timerMode && onTimerModeChange && (
          <LearningMethodPicker key={timerBusy ? "busy" : "ready"} mode={timerMode} disabled={timerBusy} onModeChange={onTimerModeChange} />
        )}
        <button
          type="button"
          className={dockButtonClass(openPanel === "settings")}
          aria-pressed={openPanel === "settings"}
          onClick={() => onPanelToggle("settings")}
          title="Settings"
        >
          <SettingsIcon className="h-5 w-5" aria-hidden="true" />
          <span className="workspace-dock__label" aria-hidden="true">Settings</span>
          <span className="sr-only">Settings</span>
        </button>
        {onFullscreen && (
          <button
            type="button"
            className="workspace-dock__button"
            onClick={onFullscreen}
            title="Toggle fullscreen"
          >
            <MaximizeIcon className="h-5 w-5" aria-hidden="true" />
            <span className="workspace-dock__label" aria-hidden="true">Fullscreen</span>
            <span className="sr-only">Toggle fullscreen</span>
          </button>
        )}
      </div>
    </nav>
  );
}
