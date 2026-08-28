export type TimerMode = "pomodoro" | "countdown" | "stopwatch" | "animedoro" | "52-17";

export type TimerPhase = "focus" | "break";

export interface FocusPreferences {
  mode: TimerMode;
  focusMinutes: number;
  breakMinutes: number;
  countdownMinutes: number;
  autoStartBreaks: boolean;
  notificationEnabled: boolean;
  alertSound: "soft" | "level-up" | "none";
  alertVolume: number;
  showTaskInPip: boolean;
}
