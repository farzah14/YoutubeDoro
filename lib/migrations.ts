import type { FocusPreferences, TimerMode } from "../types/focus.ts";
import type { SubtaskItem, TaskItem } from "../types/index.ts";
import type { ThemeSlot } from "../types/workspace.ts";

const DEFAULT_TASK_COLOR = "#7c3aed";
export const DEFAULT_FOCUS_PREFERENCES: FocusPreferences = {
  mode: "pomodoro",
  focusMinutes: 25,
  shortBreakMinutes: 5,
  longBreakMinutes: 20,
  countdownMinutes: 25,
  autoStartBreaks: false,
  notificationEnabled: false,
  alertSound: "soft",
  alertVolume: 70,
  showTaskInPip: false,
};

function record(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function integer(value: unknown, fallback: number, min: number, max: number): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, Math.round(value)));
}

function duration(value: unknown, fallback: number, max: number): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 1) return fallback;
  return Math.min(max, Math.round(value));
}

function text(value: unknown, fallback: string): string {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function migrateSubtasks(value: unknown): SubtaskItem[] {
  if (!Array.isArray(value)) return [];

  const subtasks: SubtaskItem[] = [];
  for (const item of value) {
    const source = record(item);
    const id = text(source?.id, "");
    const subtaskText = text(source?.text, "");
    if (!source || !id || !subtaskText) continue;

    subtasks.push({
      id,
      text: subtaskText,
      completed: source.completed === true,
      createdAt: integer(source.createdAt, 0, 0, Number.MAX_SAFE_INTEGER),
      order: subtasks.length,
    });
  }

  return subtasks;
}

export function migrateTaskItems(value: unknown, focusMinutes = 25): TaskItem[] {
  if (!Array.isArray(value)) return [];

  const safeFocusMinutes = integer(focusMinutes, 25, 1, 120);
  const tasks: TaskItem[] = [];

  for (const item of value) {
    const source = record(item);
    const id = text(source?.id, "");
    const taskText = text(source?.text, "");
    if (!source || !id || !taskText) continue;

    const estimatedPomos = integer(source.estimatedPomos, 1, 1, 12);
    const completedPomos = integer(source.completedPomos, 0, 0, 12);
    const color = text(source.color, DEFAULT_TASK_COLOR);

    tasks.push({
      id,
      text: taskText,
      completed: source.completed === true,
      estimatedPomos,
      completedPomos,
      createdAt: integer(source.createdAt, 0, 0, Number.MAX_SAFE_INTEGER),
      emoji: text(source.emoji, "✦"),
      color: /^#[0-9a-f]{6}$/i.test(color) ? color : DEFAULT_TASK_COLOR,
      estimatedMinutes: integer(
        source.estimatedMinutes,
        estimatedPomos * safeFocusMinutes,
        5,
        480
      ),
      focusedSeconds: integer(
        source.focusedSeconds,
        completedPomos * safeFocusMinutes * 60,
        0,
        Number.MAX_SAFE_INTEGER
      ),
      order: tasks.length,
      subtasks: migrateSubtasks(source.subtasks),
    });
  }

  return tasks;
}

export function migrateThemeSlots<T extends string>(
  value: unknown,
  legacyTheme: unknown,
  allowedThemes: readonly T[],
  fallback: T
): Record<ThemeSlot, T> {
  const source = record(value);
  const legacy = typeof legacyTheme === "string" && allowedThemes.includes(legacyTheme as T)
    ? (legacyTheme as T)
    : fallback;
  const resolve = (slot: ThemeSlot) => {
    const candidate = source?.[slot];
    return typeof candidate === "string" && allowedThemes.includes(candidate as T)
      ? (candidate as T)
      : legacy;
  };

  return { home: resolve("home"), focus: resolve("focus") };
}

export function migrateFocusPreferences(value: unknown): FocusPreferences {
  const source = record(value) ?? {};
  const modes: TimerMode[] = ["pomodoro", "countdown", "stopwatch", "animedoro", "52-17"];
  const mode = typeof source.mode === "string" && modes.includes(source.mode as TimerMode)
    ? (source.mode as TimerMode)
    : DEFAULT_FOCUS_PREFERENCES.mode;
  const alertSound = source.alertSound === "level-up" || source.alertSound === "none" || source.alertSound === "soft"
    ? source.alertSound
    : DEFAULT_FOCUS_PREFERENCES.alertSound;

  return {
    mode,
    focusMinutes: duration(source.focusMinutes, DEFAULT_FOCUS_PREFERENCES.focusMinutes, 120),
    shortBreakMinutes: duration(source.shortBreakMinutes, DEFAULT_FOCUS_PREFERENCES.shortBreakMinutes, 120),
    longBreakMinutes: duration(source.longBreakMinutes, DEFAULT_FOCUS_PREFERENCES.longBreakMinutes, 240),
    countdownMinutes: duration(source.countdownMinutes, DEFAULT_FOCUS_PREFERENCES.countdownMinutes, 480),
    autoStartBreaks: source.autoStartBreaks === true,
    notificationEnabled: source.notificationEnabled === true,
    alertSound,
    alertVolume: integer(source.alertVolume, DEFAULT_FOCUS_PREFERENCES.alertVolume, 0, 100),
    showTaskInPip: source.showTaskInPip === true,
  };
}
