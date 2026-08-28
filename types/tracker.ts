import type { TimerMode } from "./focus";

export type SessionStatus = "active" | "completed" | "stopped" | "interrupted" | "legacy";

export interface TrackerSubtask {
  id: string;
  taskId: string;
  text: string;
  completed: boolean;
  order: number;
  createdAt: string;
  updatedAt: string;
}

export interface TrackerTask {
  id: string;
  userId: string;
  title: string;
  completed: boolean;
  estimatedMinutes: number;
  emoji: string;
  color: string;
  order: number;
  focusedSeconds: number;
  completedSessions: number;
  subtasks: TrackerSubtask[];
  createdAt: string;
  updatedAt: string;
  sourceKey: string | null;
}

export interface LearningSession {
  id: string;
  userId: string;
  taskId: string | null;
  taskTitleSnapshot: string;
  title: string;
  timerMode: TimerMode;
  plannedSeconds: number | null;
  learningSeconds: number;
  breakCount: number | null;
  breakSeconds: number;
  status: SessionStatus;
  note: string;
  startedAt: string;
  endedAt: string | null;
  sourceKey: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SessionFilters {
  from?: string;
  to?: string;
  taskId?: string;
  limit?: number;
}

export interface MigrationSummary {
  tasks: number;
  subtasks: number;
  sessions: number;
  notes: number;
}

export interface SessionPatchInput {
  learningSeconds?: unknown;
  breakCount?: unknown;
  breakSeconds?: unknown;
  pausedSeconds?: unknown;
  status?: unknown;
  title?: unknown;
  taskId?: unknown;
  taskTitleSnapshot?: unknown;
  note?: unknown;
  endedAt?: unknown;
}

export interface MigrationTaskInput {
  sourceKey: string;
  title: string;
  estimatedMinutes: number;
  completed: boolean;
  emoji: string;
  color: string;
  order: number;
  subtasks: Array<{
    sourceKey: string;
    text: string;
    completed: boolean;
    order: number;
  }>;
}

export interface MigrationSessionInput {
  sourceKey: string;
  title: string;
  taskTitleSnapshot: string;
  timerMode: TimerMode;
  learningSeconds: number;
  breakSeconds: number;
  breakCount: number | null;
  note: string;
  startedAt: string;
  endedAt: string;
}

export interface BrowserMigrationPayload {
  migrationKey: string;
  tasks: MigrationTaskInput[];
  sessions: MigrationSessionInput[];
}
