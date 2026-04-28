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
  onReady?: (event: YouTubeReadyEvent) => void;
  onPlay?: () => void;
  onPause?: () => void;
  onEnd?: () => void;
  onError?: () => void;
  onStateChange?: (event: YouTubeStateChangeEvent) => void;
};
