"use client";

import { useMemo, useState } from "react";
import { useDailyNotes } from "@/hooks/useDailyNotes";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { readNumber } from "@/lib/storage";
import { KEYS } from "@/lib/constants";
import { formatMMSS } from "@/lib/time";
import type { TaskItem } from "@/types";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { NoteEntry } from "./NoteEntry";
import { TrashIcon } from "../icons";

interface NotesPanelProps {
  initialDay: string;
  tasks: TaskItem[];
  activeTaskId: string | null;
}

const EMPTY_TASK_NOTES: Record<string, string> = {};

export function NotesPanel({ initialDay, tasks, activeTaskId }: NotesPanelProps) {
  const [selectedDay, setSelectedDay] = useState(initialDay);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(activeTaskId);
  const [taskNotes, setTaskNotes] = useLocalStorage<Record<string, string>>(
    KEYS.taskNotesByDay(selectedDay),
    EMPTY_TASK_NOTES,
  );
  const { getNotes, clearNotesForDay, removeOneNote, notesBump } = useDailyNotes(selectedDay);
  const entries = getNotes();
  const selectedTask = tasks.find((task) => task.id === selectedTaskId)
    ?? tasks.find((task) => task.id === activeTaskId)
    ?? tasks.find((task) => !task.completed)
    ?? tasks[0];
  const selectedNote = selectedTask ? taskNotes[selectedTask.id] ?? "" : "";

  const { learnTotal, restTotal } = useMemo(() => {
    if (!selectedDay) return { learnTotal: 0, restTotal: 0 };
    void notesBump;
    return {
      learnTotal: readNumber(KEYS.learnByDay(selectedDay)),
      restTotal: readNumber(KEYS.restByDay(selectedDay)) || readNumber(KEYS.legacyBreakByDay(selectedDay)),
    };
  }, [selectedDay, notesBump]);

  function handleRemoveAll() {
    if (!selectedDay || entries.length === 0) return;
    if (window.confirm(`Clear activity for ${selectedDay}?\n(Saved priority notes stay safe)`)) {
      clearNotesForDay();
    }
  }

  function handleRemoveOne(id: string) {
    if (window.confirm("Delete this activity entry?")) removeOneNote(id);
  }

  function handleTaskNoteChange(value: string) {
    if (!selectedTask) return;
    setTaskNotes((current) => ({ ...current, [selectedTask.id]: value }));
  }

  return (
    <section className="priority-notes" aria-labelledby="priority-notes-title">
      <header className="priority-notes__header">
        <div>
          <p className="eyebrow">Priority notebook</p>
          <h3 id="priority-notes-title">Keep the next step close.</h3>
          <p>Every note stays attached to the priority it belongs to.</p>
        </div>
        <label className="priority-notes__date">
          <span className="eyebrow">Day</span>
          <Input
            id="notes-date"
            type="date"
            value={selectedDay}
            onChange={(event) => setSelectedDay(event.target.value)}
          />
        </label>
      </header>

      <div className="priority-notes__summary" aria-label="Daily note summary">
        <span><small>Focus</small><strong>{formatMMSS(learnTotal)}</strong></span>
        <span><small>Break</small><strong>{formatMMSS(restTotal)}</strong></span>
        <span><small>Activity</small><strong>{entries.length}</strong></span>
        <Button variant="ghost" size="sm" onClick={handleRemoveAll} disabled={entries.length === 0}>
          <TrashIcon className="mr-2 h-4 w-4" aria-hidden="true" /> Clear activity
        </Button>
      </div>

      <div className="priority-notes__workspace">
        <section className="priority-notes__tasks" aria-labelledby="priority-notes-tasks-title">
          <header className="priority-notes__section-heading">
            <div>
              <p className="eyebrow">Focus plan</p>
              <h4 id="priority-notes-tasks-title">Priority Tasks</h4>
            </div>
            <span>{tasks.length}</span>
          </header>
          {tasks.length === 0 ? (
            <p className="priority-notes__empty">Add a priority in Focus Priorities, then its notes will live here.</p>
          ) : (
            <div className="priority-notes__task-list" role="listbox" aria-label="Priority Tasks">
              {tasks.map((task) => {
                const completedSteps = task.subtasks.filter((subtask) => subtask.completed).length;
                const taskNote = taskNotes[task.id]?.trim();
                return (
                  <button
                    key={task.id}
                    type="button"
                    role="option"
                    className={`priority-notes__task ${selectedTask?.id === task.id ? "is-selected" : ""}`}
                    aria-selected={selectedTask?.id === task.id}
                    onClick={() => setSelectedTaskId(task.id)}
                  >
                    <i className={task.completed ? "is-done" : ""} aria-hidden="true" />
                    <span>
                      <strong>{task.text}</strong>
                      <small>{task.subtasks.length ? `${completedSteps}/${task.subtasks.length} steps` : "No sub-tasks yet"}</small>
                    </span>
                    {taskNote && <em aria-label="Has note">noted</em>}
                  </button>
                );
              })}
            </div>
          )}
        </section>

        <section className="priority-notes__editor" aria-labelledby="priority-note-title">
          {selectedTask ? (
            <>
              <header className="priority-notes__editor-heading">
                <div>
                  <p className="eyebrow">Working note</p>
                  <h4 id="priority-note-title">{selectedTask.text}</h4>
                </div>
                {selectedTask.id === activeTaskId && <span className="priority-notes__current">Current</span>}
              </header>
              <textarea
                value={selectedNote}
                onChange={(event) => handleTaskNoteChange(event.target.value)}
                placeholder="What is the next useful thing to remember?"
                aria-label={`Note for ${selectedTask.text}`}
              />
              <footer>
                <span>{selectedNote.trim() ? `${selectedNote.trim().length} characters` : "Blank page"}</span>
                <span>Saved locally</span>
              </footer>
            </>
          ) : (
            <p className="priority-notes__empty">Choose a priority to start a note.</p>
          )}
        </section>
      </div>

      <section className="priority-notes__activity" aria-labelledby="priority-notes-activity-title">
        <header className="priority-notes__section-heading">
          <div>
            <p className="eyebrow">Session trail</p>
            <h4 id="priority-notes-activity-title">Activity log</h4>
          </div>
          <span>{entries.length} {entries.length === 1 ? "entry" : "entries"}</span>
        </header>
        {entries.length === 0 ? (
          <p className="priority-notes__empty">Focus activity will appear here without changing your priority notes.</p>
        ) : (
          <div className="priority-notes__activity-list">
            {entries.map((entry) => <NoteEntry key={entry.id} entry={entry} onRemove={handleRemoveOne} />)}
          </div>
        )}
      </section>
    </section>
  );
}
