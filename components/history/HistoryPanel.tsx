"use client";

import { useEffect, useMemo, useState } from "react";
import styles from "./HistoryPanel.module.css";
import { formatDuration } from "@/lib/duration";
import { trackerApi } from "@/lib/trackerApi";
import { useSessionHistory } from "@/hooks/useSessionHistory";
import type { LearningSession } from "@/types/tracker";
import type { TaskItem } from "@/types";
import { Button } from "../ui/Button";

interface HistoryPanelProps {
  tasks: TaskItem[];
}

function localBoundary(day: string, end: boolean) {
  const [year, month, date] = day.split("-").map(Number);
  if (![year, month, date].every(Number.isFinite)) return undefined;
  return new Date(year, month - 1, date + (end ? 1 : 0), end ? 0 : 0, 0, end ? 0 : 0, end ? -1 : 0).toISOString();
}

function localDayKey(value: Date) {
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;
}

function shiftLocalDay(day: string, offset: number) {
  const [year, month, date] = day.split("-").map(Number);
  return localDayKey(new Date(year, month - 1, date + offset));
}

function clampHistoryDay(value: string, oldestDay: string, today: string) {
  if (!value) return "";
  return value < oldestDay ? oldestDay : value > today ? today : value;
}

function useLocalToday() {
  const [today, setToday] = useState<string | null>(null);

  useEffect(() => {
    let timer = 0;
    const updateAtLocalMidnight = () => {
      const now = new Date();
      setToday(localDayKey(now));
      const nextMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
      timer = window.setTimeout(updateAtLocalMidnight, nextMidnight.getTime() - now.getTime() + 25);
    };

    updateAtLocalMidnight();
    return () => window.clearTimeout(timer);
  }, []);

  return today;
}

function dayGroup(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return { key: "unknown", label: "Unknown date" };
  return {
    key: localDayKey(date),
    label: new Intl.DateTimeFormat([], { dateStyle: "full" }).format(date),
  };
}

function displayTime(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Unknown time"
    : new Intl.DateTimeFormat([], { timeStyle: "short" }).format(date);
}

function labelStatus(status: LearningSession["status"]) {
  return status === "legacy" ? "Imported" : status.charAt(0).toUpperCase() + status.slice(1);
}

interface HistoryRowProps {
  session: LearningSession;
  tasks: TaskItem[];
  reload: () => Promise<void>;
  expanded: boolean;
  onToggle: () => void;
  editorId: string;
}

function HistoryRow({ session, tasks, reload, expanded, onToggle, editorId }: HistoryRowProps) {
  const [title, setTitle] = useState(session.title);
  const [taskId, setTaskId] = useState(session.taskId ?? "");
  const [note, setNote] = useState(session.note);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  const save = async () => {
    setSaving(true);
    setError("");
    try {
      await trackerApi.updateSession(session.id, { title: title.trim(), taskId: taskId || null, note });
      await reload();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not save session details.");
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!window.confirm(`Delete “${session.title}” permanently?`)) return;
    setDeleting(true);
    setError("");
    try {
      await trackerApi.deleteSession(session.id);
      await reload();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not delete this session.");
      setDeleting(false);
    }
  };

  const hasDistinctTaskTitle = session.taskTitleSnapshot.trim() !== session.title.trim();
  const breakLabel = session.breakCount === null
    ? "Break · count unknown"
    : `Break · ${session.breakCount} ${session.breakCount === 1 ? "break" : "breaks"}`;

  return (
    <article className="history-row">
      <button type="button" className={styles.summary}
        aria-expanded={expanded} aria-controls={editorId} onClick={onToggle}>
        <span className={styles.summaryMain}>
          <span className={styles.identity}>
            <strong>{session.title}</strong>
            {hasDistinctTaskTitle && <small>{session.taskTitleSnapshot}</small>}
          </span>
          <time className={styles.time}>{displayTime(session.startedAt)}</time>
        </span>
        <span className={styles.summaryDetails}>
          <span className={styles.summaryMetrics}>
            <span className={styles.summaryMetric}><small>Focus</small><strong>{formatDuration(session.learningSeconds)}</strong></span>
            <span className={styles.summaryMetric}><small>{breakLabel}</small><strong>{formatDuration(session.breakSeconds)}</strong></span>
          </span>
          <span className={`history-status history-status--${session.status}`}>{labelStatus(session.status)}</span>
        </span>
      </button>
      {expanded && (
        <div id={editorId} className="history-row__editor">
          <div className="history-row__fields">
            <label>Session title<input value={title} onChange={(event) => setTitle(event.target.value)} maxLength={240} /></label>
            <label>Task<select value={taskId} onChange={(event) => setTaskId(event.target.value)}>
              <option value="">No linked task</option>
              {session.taskId && !tasks.some((task) => task.id === session.taskId) && (
                <option value={session.taskId}>{session.taskTitleSnapshot}</option>
              )}
              {tasks.map((task) => <option key={task.id} value={task.id}>{task.text}</option>)}
            </select></label>
            <label className="history-row__note">Session note<textarea value={note}
              onChange={(event) => setNote(event.target.value)} maxLength={20_000} placeholder="Markdown note" /></label>
          </div>
          <p className="history-row__timing">Timing is immutable after the session. Notes and metadata remain editable.</p>
          {error && <p className="history-row__error" role="alert">{error}</p>}
          <footer className="history-row__actions">
            <span>{note.trim() ? "Note attached" : "No note"}</span>
            <div>
              <Button type="button" variant="secondary" size="sm" onClick={() => { void save(); }}
                disabled={saving || deleting || !title.trim()}>{saving ? "Saving..." : "Save details"}</Button>
              <Button type="button" variant="danger" size="sm" className="history-row__delete-session" onClick={() => { void remove(); }}
                disabled={saving || deleting}>{deleting ? "Deleting..." : "Delete session"}</Button>
            </div>
          </footer>
        </div>
      )}
    </article>
  );
}

export function HistoryPanel({ tasks }: HistoryPanelProps) {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [taskId, setTaskId] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const today = useLocalToday();
  const oldestDay = today ? shiftLocalDay(today, -2) : "";
  const hasFilters = Boolean(from || to || taskId);
  const filters = useMemo(() => ({
    from: today && oldestDay
      ? localBoundary(from ? clampHistoryDay(from, oldestDay, today) : oldestDay, false)
      : undefined,
    to: today && oldestDay
      ? localBoundary(to ? clampHistoryDay(to, oldestDay, today) : today, true)
      : undefined,
    taskId: taskId || undefined,
    limit: 100,
  }), [from, oldestDay, taskId, today, to]);
  const { sessions, loading, error, reload } = useSessionHistory(filters, Boolean(today));

  useEffect(() => {
    if (!today || !oldestDay) return;
    setFrom((value) => clampHistoryDay(value, oldestDay, today));
    setTo((value) => clampHistoryDay(value, oldestDay, today));
  }, [oldestDay, today]);

  const groups = useMemo(() => {
    const grouped = new Map<string, { label: string; sessions: LearningSession[] }>();
    if (!today || !oldestDay) return [];
    for (const session of sessions) {
      const sessionDate = new Date(session.startedAt);
      if (Number.isNaN(sessionDate.getTime())) continue;
      const sessionDay = localDayKey(sessionDate);
      if (sessionDay < oldestDay || sessionDay > today) continue;
      const day = dayGroup(session.startedAt);
      const current = grouped.get(day.key) ?? { label: day.label, sessions: [] };
      current.sessions.push(session);
      grouped.set(day.key, current);
    }
    return Array.from(grouped, ([key, value]) => ({ key, ...value }));
  }, [oldestDay, sessions, today]);

  return (
    <section className="history-panel" aria-labelledby="history-title">
      <header className="history-panel__intro">
        <div><p className="eyebrow">Account record</p><h3 id="history-title">History</h3><p>Showing today and the previous two days. Older sessions stay saved but hidden.</p></div>
        {hasFilters && <button type="button" className="history-clear" onClick={() => {
          setFrom(""); setTo(""); setTaskId("");
        }}>Clear filters</button>}
      </header>

      <div className="history-filters" aria-label="History filters">
        <label>From<input type="date" value={from} min={oldestDay || undefined} max={today || undefined}
          onChange={(event) => setFrom(today ? clampHistoryDay(event.target.value, oldestDay, today) : "")} /></label>
        <label>To<input type="date" value={to} min={oldestDay || undefined} max={today || undefined}
          onChange={(event) => setTo(today ? clampHistoryDay(event.target.value, oldestDay, today) : "")} /></label>
        <label>Task<select value={taskId} onChange={(event) => setTaskId(event.target.value)}><option value="">All tasks</option>{tasks.map((task) => <option key={task.id} value={task.id}>{task.text}</option>)}</select></label>
      </div>

      {loading && <p className="history-state">Loading session history...</p>}
      {!loading && error && <div className="history-state history-state--error" role="alert">
        <p>{error}</p>
        <button type="button" className="history-retry" onClick={() => { void reload(); }}>Retry</button>
      </div>}
      {!loading && !error && groups.length === 0 && <p className="history-state">
        {hasFilters ? "No sessions match these filters." : "No sessions in the last 3 days."}
      </p>}

      {!loading && !error && groups.map((group) => (
        <section className="history-day" key={group.key}>
          <h4 className="history-day__heading">{group.label}</h4>
          <div className="history-list">
            {group.sessions.map((session) => <HistoryRow key={session.id} session={session} tasks={tasks}
              reload={reload} expanded={expandedId === session.id}
              editorId={`history-editor-${session.id}`}
              onToggle={() => setExpandedId((current) => current === session.id ? null : session.id)} />)}
          </div>
        </section>
      ))}
    </section>
  );
}
