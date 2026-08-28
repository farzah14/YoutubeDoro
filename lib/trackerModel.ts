import type {
  LearningSession,
  SessionPatchInput,
  SessionStatus,
  TrackerSubtask,
  TrackerTask,
} from "../types/tracker";
import type { TimerMode } from "../types/focus";

const SESSION_STATUSES: SessionStatus[] = ["active", "completed", "stopped", "interrupted", "legacy"];
const TIMER_MODES: TimerMode[] = ["pomodoro", "countdown", "stopwatch", "animedoro", "52-17"];

function safeInteger(value: unknown, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value) ? Math.max(0, Math.floor(value)) : fallback;
}

function safeText(value: unknown, fallback: string): string {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

export function deriveTaskProgress(focusedSeconds: number, estimatedMinutes: number): number {
  const focused = safeInteger(focusedSeconds);
  const estimate = safeInteger(estimatedMinutes);
  if (estimate <= 0) return 0;
  return Math.min(100, Math.round((focused / (estimate * 60)) * 100));
}

export function normalizeSessionPatch(input: SessionPatchInput) {
  return {
    learningSeconds: safeInteger(input.learningSeconds),
    breakCount: safeInteger(input.breakCount),
    breakSeconds: safeInteger(input.breakSeconds),
  };
}

export function mapSubtaskRow(row: Record<string, unknown>): TrackerSubtask {
  return {
    id: safeText(row.id, ""),
    taskId: safeText(row.task_id, ""),
    text: safeText(row.text, "Untitled subtask"),
    completed: row.completed === true,
    order: safeInteger(row.subtask_order),
    createdAt: safeText(row.created_at, ""),
    updatedAt: safeText(row.updated_at, safeText(row.created_at, "")),
  };
}

export function mapTaskRow(
  row: Record<string, unknown>,
  subtasks: TrackerSubtask[] = [],
  focusedSeconds = 0,
  completedSessions = 0,
): TrackerTask {
  const createdAt = safeText(row.created_at, "");
  const color = safeText(row.color, "");
  return {
    id: safeText(row.id, ""),
    userId: safeText(row.user_id, ""),
    title: safeText(row.title, "Untitled task"),
    completed: row.completed === true,
    estimatedMinutes: Math.min(480, Math.max(5, safeInteger(row.estimated_minutes, 25))),
    emoji: safeText(row.emoji, "✦"),
    color: /^#[0-9a-f]{6}$/i.test(color) ? color : "#7c3aed",
    order: safeInteger(row.task_order),
    focusedSeconds: safeInteger(focusedSeconds),
    completedSessions: safeInteger(completedSessions),
    subtasks: subtasks.slice().sort((a, b) => a.order - b.order),
    createdAt,
    updatedAt: safeText(row.updated_at, createdAt),
    sourceKey: typeof row.source_key === "string" ? row.source_key : null,
  };
}

export function mapSessionRow(row: Record<string, unknown>): LearningSession {
  const timerMode = TIMER_MODES.includes(row.timer_mode as TimerMode) ? row.timer_mode as TimerMode : "pomodoro";
  const status = SESSION_STATUSES.includes(row.status as SessionStatus) ? row.status as SessionStatus : "stopped";
  return {
    id: safeText(row.id, ""),
    userId: safeText(row.user_id, ""),
    taskId: typeof row.task_id === "string" ? row.task_id : null,
    taskTitleSnapshot: safeText(row.task_title_snapshot, "Untitled learning session"),
    title: safeText(row.title, "Untitled learning session"),
    timerMode,
    plannedSeconds: row.planned_seconds === null ? null : safeInteger(row.planned_seconds),
    learningSeconds: safeInteger(row.learning_seconds),
    breakCount: row.break_count === null ? null : safeInteger(row.break_count),
    breakSeconds: safeInteger(row.break_seconds),
    status,
    note: typeof row.note === "string" ? row.note : "",
    startedAt: safeText(row.started_at, ""),
    endedAt: typeof row.ended_at === "string" ? row.ended_at : null,
    sourceKey: typeof row.source_key === "string" ? row.source_key : null,
    createdAt: safeText(row.created_at, ""),
    updatedAt: safeText(row.updated_at, safeText(row.created_at, "")),
  };
}
