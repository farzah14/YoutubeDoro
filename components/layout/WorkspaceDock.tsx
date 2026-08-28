"use client";

import type { WorkspaceMode, WorkspacePanel } from "@/types/workspace";
import {
  CheckIcon,
  BookIcon,
  HomeIcon,
  LightbulbIcon,
  MaximizeIcon,
  MusicIcon,
  SettingsIcon,
} from "../icons";

interface WorkspaceDockProps {
  mode: WorkspaceMode;
  openPanel: WorkspacePanel | null;
  onModeChange: (mode: WorkspaceMode) => void;
  onPanelToggle: (panel: WorkspacePanel) => void;
  timerRunning?: boolean;
  onFullscreen?: () => void;
}

const dockButtonClass = (active: boolean) =>
  `workspace-dock__button ${active ? "workspace-dock__button--active" : ""}`;

export function WorkspaceDock({
  mode,
  openPanel,
  onModeChange,
  onPanelToggle,
  timerRunning = false,
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
          <span className="sr-only">Sub-tasks</span>
        </button>
        <button
          type="button"
          className={dockButtonClass(openPanel === "notes")}
          aria-pressed={openPanel === "notes"}
          onClick={() => onPanelToggle("notes")}
          title="Notes"
        >
          <BookIcon className="h-5 w-5" aria-hidden="true" />
          <span className="sr-only">Notes</span>
        </button>
      </div>

      <div className="workspace-dock__right">
        <div className="workspace-dock__modes" aria-label="Workspace modes">
          <button
            type="button"
            className={dockButtonClass(mode === "home")}
            aria-current={mode === "home" ? "page" : undefined}
            onClick={() => onModeChange("home")}
            title="Home"
          >
            <HomeIcon className="h-5 w-5" aria-hidden="true" />
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
            <span className="sr-only">Focus</span>
          </button>
        </div>

        <button
          type="button"
          className={dockButtonClass(openPanel === "settings")}
          aria-pressed={openPanel === "settings"}
          onClick={() => onPanelToggle("settings")}
          title="Settings"
        >
          <SettingsIcon className="h-5 w-5" aria-hidden="true" />
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
            <span className="sr-only">Toggle fullscreen</span>
          </button>
        )}
      </div>
    </nav>
  );
}
