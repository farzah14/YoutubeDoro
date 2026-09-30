export type TimerMode = "pomodoro" | "stopwatch" | "animedoro" | "52-17";

export type TimerPhase = "focus" | "break";

export interface FocusPreferences {
  mode: TimerMode;
  focusMinutes: number;
  breakMinutes: number;
  autoStartBreaks: boolean;
  notificationEnabled: boolean;
  attentionMonitoringEnabled: boolean;
  alertSound: "soft" | "level-up" | "none";
  alertVolume: number;
  showTaskInPip: boolean;
}
