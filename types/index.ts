export type TimerStatus = "Idle" | "Running" | "Paused" | "Done";

export type NoteKind =
  | "learn_start"
  | "topic_set"
  | "learn_done"
  | "learn_stop"
  | "rest_done"
  | "rest_stop"
  | "yt_rest_done"
  | "yt_rest_stop";

export type DailyNoteEntry = {
  id: string;
  ts: number;
  day: string;
  kind: NoteKind;
  title: string;
  deltaLearnSec: number;
  deltaRestSec: number;
  totalLearnTitleSec: number;
  totalRestTitleSec: number;
};

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
// Notion Integration Types
// ──────────────────────────────────────────────

export type NotionSyncStatus = "idle" | "syncing" | "success" | "error";

export type NotionConfig = {
  connected: boolean;
  databaseId: string;
  lastSync: string | null;
};

export type SyncPayload = {
  day: string;
  topic: string;
  learnSec: number;
  restSec: number;
  notes: DailyNoteEntry[];
  scratchpad?: string;
};

export type PullResult = {
  day: string;
  topic: string;
  learnSec: number;
  restSec: number;
  notes: DailyNoteEntry[];
  scratchpad?: string;
  notionPageId: string;
};

export type NotionSyncState = {
  status: NotionSyncStatus;
  lastSync: string | null;
  connected: boolean;
  error: string | null;
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
