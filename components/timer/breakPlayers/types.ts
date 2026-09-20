export interface BreakPlayerHandle {
  play: () => Promise<void> | void;
  pause: () => Promise<void> | void;
  stop: () => Promise<void> | void;
}

export interface BreakPlayerEvents {
  onReady: (durationSeconds: number) => void;
  onPlay: () => void;
  onPause: () => void;
  onProgress: (elapsedSeconds: number) => void;
  onBuffering: () => void;
  onEnded: () => void;
  onError: () => void;
}
