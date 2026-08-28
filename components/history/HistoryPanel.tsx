"use client";

import { useMemo, useState } from "react";
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

function displayDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Unknown time" : new Intl.DateTimeFormat([], {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function labelStatus(status: LearningSession["status"]) {
  return status === "legacy" ? "Imported" : status.charAt(0).toUpperCase() + status.slice(1);
}

function HistoryRow({ session, tasks, reload }: { session: LearningSession; tasks: TaskItem[]; reload: () => Promise<void> }) {
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

  return (
    <article className="history-row">
      <header className="history-row__header">
        <div>
          <p className="eyebrow">{displayDate(session.startedAt)}</p>
          <h3>{session.title}</h3>
          <p className="history-row__task">Task: {session.taskTitleSnapshot}</p>
        </div>
        <span className={`history-status history-status--${session.status}`}>{labelStatus(session.status)}</span>
      </header>

      <dl className="history-row__metrics">
        <div><dt>Learning</dt><dd>{formatDuration(session.learningSeconds)} <small>read-only</small></dd></div>
        <div><dt>Break</dt><dd>{formatDuration(session.breakSeconds)} <small>{session.breakCount === null ? "count unknown" : `${session.breakCount} ${session.breakCount === 1 ? "break" : "breaks"}`}</small></dd></div>
        <div><dt>Mode</dt><dd>{session.timerMode}</dd></div>
      </dl>

      <div className="history-row__fields">
        <label>Session title<input value={title} onChange={(event) => setTitle(event.target.value)} maxLength={240} /></label>
        <label>Task<select value={taskId} onChange={(event) => setTaskId(event.target.value)}>
          <option value="">No linked task</option>
          {session.taskId && !tasks.some((task) => task.id === session.taskId) && <option value={session.taskId}>{session.taskTitleSnapshot}</option>}
          {tasks.map((task) => <option key={task.id} value={task.id}>{task.text}</option>)}
        </select></label>
        <label className="history-row__note">Session note<textarea value={note} onChange={(event) => setNote(event.target.value)} maxLength={20_000} placeholder="Markdown note" /></label>
      </div>
      <p className="history-row__timing">Timing is immutable after the session. Notes and metadata remain editable.</p>
      {error && <p className="history-row__error" role="alert">{error}</p>}
      <footer className="history-row__actions">
        <span>{note.trim() ? "Note attached" : "No note"}</span>
        <div><Button type="button" variant="secondary" size="sm" onClick={() => { void save(); }} disabled={saving || deleting || !title.trim()}>{saving ? "Saving…" : "Save details"}</Button><Button type="button" variant="danger" size="sm" onClick={() => { void remove(); }} disabled={saving || deleting}>{deleting ? "Deleting…" : "Delete session"}</Button></div>
      </footer>
    </article>
  );
}

export function HistoryPanel({ tasks }: HistoryPanelProps) {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [taskId, setTaskId] = useState("");
  const filters = useMemo(() => ({
    from: from ? localBoundary(from, false) : undefined,
    to: to ? localBoundary(to, true) : undefined,
    taskId: taskId || undefined,
    limit: 100,
  }), [from, taskId, to]);
  const { sessions, loading, error, empty, reload } = useSessionHistory(filters);

  return (
    <section className="history-panel" aria-labelledby="history-title">
      <header className="history-panel__intro">
        <div><p className="eyebrow">Account record</p><h3 id="history-title">History</h3><p>Every saved focus session, including imported summaries.</p></div>
        <button type="button" className="history-clear" onClick={() => { setFrom(""); setTo(""); setTaskId(""); }}>Clear filters</button>
      </header>

      <div className="history-filters" aria-label="History filters">
        <label>From<input type="date" value={from} onChange={(event) => setFrom(event.target.value)} /></label>
        <label>To<input type="date" value={to} onChange={(event) => setTo(event.target.value)} /></label>
        <label>Task<select value={taskId} onChange={(event) => setTaskId(event.target.value)}><option value="">All tasks</option>{tasks.map((task) => <option key={task.id} value={task.id}>{task.text}</option>)}</select></label>
      </div>

      {loading && <p className="history-state">Loading session history…</p>}
      {!loading && error && <p className="history-state history-state--error" role="alert">{error}</p>}
      {!loading && !error && empty && <p className="history-state">No sessions match these filters.</p>}
      {!loading && !error && sessions.length > 0 && <div className="history-list">{sessions.map((session) => <HistoryRow key={session.id} session={session} tasks={tasks} reload={reload} />)}</div>}
    </section>
  );
}
