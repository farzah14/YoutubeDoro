"use client";

import { useEffect, useRef, useState } from "react";
import { formatDuration } from "@/lib/duration";
import type { SessionStatus } from "@/types/tracker";

interface SessionNoteEditorProps {
  sessionId: string | null;
  initialValue?: string;
  title?: string;
  learningSeconds: number;
  status: SessionStatus | "idle";
  onSave: (note: string) => Promise<boolean> | boolean;
  onTitleSave?: (title: string) => Promise<boolean> | boolean;
  onValueChange?: (note: string) => void;
}

export function SessionNoteEditor({ sessionId, initialValue = "", title = "", learningSeconds, status, onSave, onTitleSave, onValueChange }: SessionNoteEditorProps) {
  const [note, setNote] = useState(initialValue);
  const [sessionTitle, setSessionTitle] = useState(title);
  const [saved, setSaved] = useState(false);
  const timer = useRef<number | null>(null);
  const valueRef = useRef(initialValue);
  const titleRef = useRef(title);

  useEffect(() => {
    valueRef.current = initialValue;
    setNote(initialValue);
    titleRef.current = title;
    setSessionTitle(title);
  }, [initialValue, sessionId, title]);

  useEffect(() => () => {
    if (timer.current !== null) window.clearTimeout(timer.current);
  }, []);

  const flush = async () => {
    if (!sessionId) return;
    if (timer.current !== null) window.clearTimeout(timer.current);
    const result = await onSave(valueRef.current);
    setSaved(result);
  };

  const change = (value: string) => {
    valueRef.current = value;
    setNote(value);
    onValueChange?.(value);
    setSaved(false);
    if (status === "active" && sessionId) {
      if (timer.current !== null) window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => { void flush(); }, 750);
    }
  };

  const saveTitle = async () => {
    if (!sessionId || !onTitleSave || !titleRef.current.trim()) return;
    setSaved(await onTitleSave(titleRef.current.trim()));
  };

  return (
    <section className="session-note-editor" aria-labelledby="session-note-title">
      <div className="session-note-editor__heading">
        <div>
          <p className="eyebrow">Session note</p>
          <h3 id="session-note-title">Keep the useful detail.</h3>
        </div>
        <span>{note.length} characters</span>
      </div>
      <p className="session-note-editor__context">{sessionId ? `${formatDuration(learningSeconds)} of learning · timing is read-only` : "Start a learning session to attach a note."}</p>
      <label className="session-note-editor__title">Session title<input value={sessionTitle} onChange={(event) => { titleRef.current = event.target.value; setSessionTitle(event.target.value); setSaved(false); }} onBlur={() => { void saveTitle(); }} disabled={!sessionId} maxLength={240} /></label>
      <textarea value={note} onChange={(event) => change(event.target.value)} onBlur={() => { void flush(); }} disabled={!sessionId} placeholder="What should you remember from this session? Markdown is supported." aria-label="Session Markdown note" />
      <footer><span>{status === "active" ? "Auto-saves while active" : "Editable after the session"}</span><span>{saved ? "Saved" : ""}</span></footer>
    </section>
  );
}
