import type {
  BrowserMigrationPayload,
  MigrationSessionInput,
  MigrationSummary,
  MigrationTaskInput,
} from "../types/tracker";
import type { TimerMode } from "../types/focus";
import { migrateTaskItems } from "./migrations.ts";

export interface BrowserStorageLike {
  length: number;
  key(index: number): string | null;
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export interface BrowserMigrationExport extends BrowserMigrationPayload {
  summary: MigrationSummary;
}

export const BROWSER_MIGRATION_KEY = "ytdoro:cloud-migration-key";

function fallbackMigrationKey(now: number) {
  return `migration_${now}_${Math.random().toString(36).slice(2, 12)}`;
}

function browserStorage(): BrowserStorageLike | null {
  return typeof window === "undefined" ? null : window.localStorage;
}

export function getBrowserMigrationKey(storage: BrowserStorageLike | null = browserStorage(), now = Date.now()): string {
  const existing = storage?.getItem(BROWSER_MIGRATION_KEY)?.trim();
  if (existing) return existing;

  const generated = typeof globalThis.crypto?.randomUUID === "function"
    ? globalThis.crypto.randomUUID()
    : fallbackMigrationKey(now);
  storage?.setItem(BROWSER_MIGRATION_KEY, generated);
  return generated;
}

function keys(storage: BrowserStorageLike) {
  return Array.from({ length: storage.length }, (_, index) => storage.key(index)).filter((key): key is string => Boolean(key));
}

function readJson(storage: BrowserStorageLike, key: string): unknown {
  const raw = storage.getItem(key);
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}

function readNumber(storage: BrowserStorageLike, key: string) {
  const value = Number(storage.getItem(key));
  return Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
}

function readString(storage: BrowserStorageLike, key: string) {
  return storage.getItem(key)?.trim() ?? "";
}

function record(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function localTimestamp(day: string, end = false) {
  const time = end ? "23:59:59.999" : "00:00:00.000";
  return new Date(`${day}T${time}`).toISOString();
}

function localDayKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function sourcePart(value: string) {
  return encodeURIComponent(value).slice(0, 300);
}

function noteText(value: unknown) {
  const item = record(value);
  if (!item) return "";
  const direct = text(item.note) || text(item.content) || text(item.text);
  if (direct) return direct;
  const title = text(item.title);
  const kind = text(item.kind);
  const learn = Number(item.deltaLearnSec);
  const rest = Number(item.deltaRestSec);
  const measurements = [
    Number.isFinite(learn) && learn > 0 ? `focus ${Math.floor(learn)} seconds` : "",
    Number.isFinite(rest) && rest > 0 ? `break ${Math.floor(rest)} seconds` : "",
  ].filter(Boolean).join(", ");
  return [kind, title, measurements ? `(${measurements})` : ""].filter(Boolean).join(" ").trim();
}

function appendNote(session: MigrationSessionInput, value: string) {
  if (!value) return false;
  session.note = session.note ? `${session.note}\n\n${value}` : value;
  return true;
}

export function exportBrowserTrackerData(storage: BrowserStorageLike, migrationKey = getBrowserMigrationKey(storage)): BrowserMigrationExport {
  const allKeys = keys(storage);
  const days = new Set<string>();
  const dayKeyPattern = /^ytdoro:(\d{4}-\d{2}-\d{2}):/;
  for (const key of allKeys) {
    const match = key.match(dayKeyPattern);
    if (match) days.add(match[1]);
  }

  const tasks: MigrationTaskInput[] = [];
  const tasksByDayAndId = new Map<string, MigrationTaskInput>();
  const taskKeyPattern = /^ytdoro:(\d{4}-\d{2}-\d{2}):tasks$/;
  for (const key of allKeys) {
    const match = key.match(taskKeyPattern);
    if (!match) continue;
    const day = match[1];
    const migrated = migrateTaskItems(readJson(storage, key));
    for (const task of migrated) {
      const sourceKey = `${migrationKey}:task:${day}:${sourcePart(task.id)}`;
      const output: MigrationTaskInput = {
        sourceKey,
        title: task.text,
        estimatedMinutes: task.estimatedMinutes,
        completed: task.completed,
        emoji: task.emoji,
        color: task.color,
        order: task.order,
        subtasks: task.subtasks.map((subtask) => ({
          sourceKey: `${sourceKey}:subtask:${sourcePart(subtask.id)}`,
          text: subtask.text,
          completed: subtask.completed,
          order: subtask.order,
        })),
      };
      tasks.push(output);
      tasksByDayAndId.set(`${day}:${task.id}`, output);
    }
  }

  const sessionMap = new Map<string, MigrationSessionInput>();
  const notesByDay = new Map<string, unknown[]>();
  const taskNotesByDay = new Map<string, Record<string, string>>();
  const ensureSession = (day: string, topic: string, sourceSuffix = topic) => {
    const safeTopic = topic || "Untitled learning";
    const key = `${day}\u0000${safeTopic}\u0000${sourceSuffix}`;
    const existing = sessionMap.get(key);
    if (existing) return existing;
    const session: MigrationSessionInput = {
      sourceKey: `${migrationKey}:session:${day}:${sourcePart(sourceSuffix)}`,
      title: `Legacy summary · ${day} · ${safeTopic}`,
      taskTitleSnapshot: safeTopic,
      timerMode: "stopwatch" as TimerMode,
      learningSeconds: 0,
      breakSeconds: 0,
      breakCount: null,
      note: "",
      startedAt: localTimestamp(day),
      endedAt: localTimestamp(day, true),
    };
    sessionMap.set(key, session);
    return session;
  };

  const topicTotals = new Map<string, { learning: number; rest: number }>();
  for (const key of allKeys) {
    const match = key.match(/^ytdoro:(\d{4}-\d{2}-\d{2}):(.+):(learnSec|restSec)$/);
    if (!match) continue;
    const [, day, topic, kind] = match;
    const totals = topicTotals.get(`${day}\u0000${topic}`) ?? { learning: 0, rest: 0 };
    if (kind === "learnSec") totals.learning = readNumber(storage, key);
    else totals.rest = readNumber(storage, key);
    topicTotals.set(`${day}\u0000${topic}`, totals);
  }

  for (const day of days) {
    const topicEntries = [...topicTotals.entries()].filter(([key]) => key.startsWith(`${day}\u0000`));
    if (topicEntries.length) {
      for (const [key, totals] of topicEntries) {
        const topic = key.slice(day.length + 1);
        const session = ensureSession(day, topic);
        session.learningSeconds = totals.learning;
        session.breakSeconds = totals.rest || readNumber(storage, `ytdoro:${day}:breakSec`);
      }
    } else {
      const session = ensureSession(day, readString(storage, `ytdoro:${day}:topic`) || "Untitled learning");
      session.learningSeconds = readNumber(storage, `ytdoro:${day}:learnSec`);
      session.breakSeconds = readNumber(storage, `ytdoro:${day}:restSec`) || readNumber(storage, `ytdoro:${day}:breakSec`);
    }
    const rawActivity = readJson(storage, `ytdoro:${day}:notes`);
    if (Array.isArray(rawActivity)) notesByDay.set(day, rawActivity);
    const rawTaskNotes = readJson(storage, `ytdoro:${day}:taskNotes`);
    if (record(rawTaskNotes)) taskNotesByDay.set(day, rawTaskNotes as Record<string, string>);
  }

  let notes = 0;
  for (const [day, entries] of notesByDay) {
    for (const entry of entries) {
      const item = record(entry);
      const value = noteText(entry);
      if (!value) continue;
      const title = text(item?.title);
      const match = [...sessionMap.values()].find((session) => session.title.startsWith(`Legacy summary · ${day} ·`) && session.taskTitleSnapshot.toLowerCase() === title.toLowerCase());
      if (match) {
        if (appendNote(match, value)) notes += 1;
      } else {
        const unmatched = ensureSession(day, "Legacy note", `note:${sourcePart(title || value)}`);
        if (appendNote(unmatched, value)) notes += 1;
      }
    }
  }

  for (const [day, taskNotes] of taskNotesByDay) {
    for (const [localId, value] of Object.entries(taskNotes)) {
      const note = text(value);
      if (!note) continue;
      const task = tasksByDayAndId.get(`${day}:${localId}`);
      const target = [...sessionMap.values()].find((session) => session.title === `Legacy summary · ${day} · ${task?.title}`)
        ?? (task ? [...sessionMap.values()].find((session) => session.title.startsWith(`Legacy summary · ${day} ·`)) : undefined);
      const session = target ?? ensureSession(day, "Legacy note", `task-note:${sourcePart(localId)}`);
      if (appendNote(session, note)) notes += 1;
    }
  }

  const scratchpad = readString(storage, "ytdoro:scratchpad");
  if (scratchpad) {
    const day = localDayKey();
    if (appendNote(ensureSession(day, "Legacy note", "scratchpad"), scratchpad)) notes += 1;
  }

  const sessions = [...sessionMap.values()];
  return {
    migrationKey,
    tasks,
    sessions,
    summary: {
      tasks: tasks.length,
      subtasks: tasks.reduce((total, task) => total + task.subtasks.length, 0),
      sessions: sessions.length,
      notes,
    },
  };
}
