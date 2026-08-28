export type TimerMode = "pomodoro" | "countdown" | "stopwatch" | "animedoro" | "52-17";

export type TimerPhase = "focus" | "short-break" | "long-break";

export interface FocusPreferences {
  mode: TimerMode;
  focusMinutes: number;
  shortBreakMinutes: number;
  longBreakMinutes: number;
  countdownMinutes: number;
  autoStartBreaks: boolean;
  notificationEnabled: boolean;
  alertSound: "soft" | "level-up" | "none";
  alertVolume: number;
  showTaskInPip: boolean;
}
