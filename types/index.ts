export type TimerStatus = "Idle" | "Running" | "Paused" | "Done";

// YouTube Wrapper Types
export type PlayerLike = {
  playVideo: () => void;
  pauseVideo: () => void;
  stopVideo: () => void;
  seekTo: (seconds: number, allowSeekAhead: boolean) => void;
  getDuration: () => number;
  getCurrentTime: () => number;
  setVolume: (volume: number) => void;
};

export type YouTubeReadyEvent = { target: PlayerLike };
export type YouTubeStateChangeEvent = { target: PlayerLike; data: number };

export type YouTubeComponentProps = {
  videoId: string;
  opts?: {
    width?: string | number;
    height?: string | number;
    playerVars?: Record<string, string | number>;
  };
  className?: string;
  iframeClassName?: string;
  onReady?: (event: YouTubeReadyEvent) => void;
  onPlay?: () => void;
  onPause?: () => void;
  onEnd?: () => void;
  onError?: (event: unknown) => void;
  onStateChange?: (event: YouTubeStateChangeEvent) => void;
};

// ──────────────────────────────────────────────
// Task Queue & Productivity Types
// ──────────────────────────────────────────────

export interface SubtaskItem {
  id: string;
  text: string;
  completed: boolean;
  createdAt: number;
  order: number;
}

export interface TaskItem {
  id: string;
  text: string;
  completed: boolean;
  estimatedPomos: number;
  completedPomos: number;
  createdAt: number;
  emoji: string;
  color: string;
  estimatedMinutes: number;
  focusedSeconds: number;
  linkedSessionCount?: number;
  order: number;
  subtasks: SubtaskItem[];
}

export interface RadioStation {
  id: string;
  name: string;
  genre: string;
  videoId: string;
  icon: string;
}

export interface BreakPreset {
  id: string;
  title: string;
  category: "stretch" | "eyes" | "breathe" | "nature" | "cafe";
  categoryLabel: string;
  videoId: string;
  durationLabel: string;
}

export interface SavedBreakVideo {
  id: string;
  title: string;
  videoId: string;
  addedAt: number;
}

export type {
  BrowserMigrationPayload,
  LearningSession,
  MigrationSessionInput,
  MigrationSummary,
  MigrationTaskInput,
  SessionFilters,
  SessionPatchInput,
  SessionStatus,
  TrackerSubtask,
  TrackerTask,
} from "./tracker";
