"use client";

import { FormEvent, useEffect, useState } from "react";
import { KEYS } from "@/lib/constants";
import {
  getOverallProgress,
  getProjectedFinishTime,
  getTaskProgress,
  getTotalPlannedMinutes,
} from "@/lib/taskModel";
import { DEFAULT_FOCUS_PREFERENCES, migrateFocusPreferences } from "@/lib/migrations";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import type { TaskItem } from "@/types";
import { CheckIcon, ChevronDownIcon, ChevronUpIcon, PlusIcon, TrashIcon } from "../icons";

interface TaskQueueProps {
  tasks: TaskItem[];
  activeTaskId: string | null;
  currentTopic: string;
  onSelectTask: (task: TaskItem) => void;
  onAddTask: (text: string, estimatedMinutes: number) => void;
  onToggleTask: (id: string) => boolean;
  onDeleteTask: (id: string) => void;
  onReorderTasks: (movedId: string, targetId: string) => void;
  onMoveTask: (id: string, offset: -1 | 1) => void;
  onUpdateTask: (
    id: string,
    patch: Partial<Pick<TaskItem, "text" | "emoji" | "color" | "estimatedMinutes" | "focusedSeconds">>
  ) => void;
  onResetTasks: () => void;
}

const plannedLabel = (minutes: number) => minutes >= 60
  ? `${Math.floor(minutes / 60)}h${minutes % 60 ? ` ${minutes % 60}m` : ""}`
  : `${minutes}m`;

export function TaskQueue({
  tasks,
  activeTaskId,
  currentTopic,
  onSelectTask,
  onAddTask,
  onToggleTask,
  onDeleteTask,
  onReorderTasks,
  onMoveTask,
  onUpdateTask,
  onResetTasks,
}: TaskQueueProps) {
  const [newText, setNewText] = useState("");
  const [estimatedMinutes, setEstimatedMinutes] = useState(25);
  const [now, setNow] = useState(() => Date.now());
  const [storedPreferences, setStoredPreferences] = useLocalStorage(KEYS.focusPreferences, DEFAULT_FOCUS_PREFERENCES);
  const [showProgress, setShowProgress] = useLocalStorage(KEYS.showTaskProgress, true);
  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(interval);
  }, []);
  const preferences = migrateFocusPreferences(storedPreferences);
  const activeTask = tasks.find((task) => task.id === activeTaskId && !task.completed)
    ?? tasks.find((task) => !task.completed);
  const totalMinutes = getTotalPlannedMinutes(tasks);
  const progress = getOverallProgress(tasks);
  const finishTime = new Intl.DateTimeFormat([], { hour: "numeric", minute: "2-digit" })
    .format(getProjectedFinishTime(now, tasks));

  const handleAdd = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!newText.trim()) return;
    onAddTask(newText, estimatedMinutes);
    setNewText("");
  };

  return (
    <section className="priorities-panel" aria-labelledby="priorities-title">
      <header className="priorities-panel__intro">
        <div>
          <p className="eyebrow">Focus plan</p>
          <h3 id="priorities-title">Focus Priorities</h3>
          <p>{activeTask?.text || currentTopic.trim() || "Choose one clear next step."}</p>
        </div>
        <button type="button" className="priorities-panel__reset" onClick={onResetTasks} disabled={!tasks.length}>Reset</button>
      </header>

      <div className="priorities-summary" aria-label="Task plan summary">
        <div><span>Total</span><strong>{plannedLabel(totalMinutes)}</strong></div>
        <div><span>Finishing at</span><strong>{finishTime}</strong></div>
        <div><span>Progress</span><strong>{progress}%</strong></div>
      </div>
      {showProgress && <div className="priorities-progress" role="progressbar" aria-valuenow={progress}><i style={{ width: `${progress}%` }} /></div>}

      <form className="priorities-add" onSubmit={handleAdd}>
        <input value={newText} onChange={(event) => setNewText(event.target.value)} placeholder="Add a focus priority" aria-label="Task title" />
        <label>
          <span className="sr-only">Estimated minutes</span>
          <input type="number" min="5" max="480" step="5" value={estimatedMinutes} onChange={(event) => setEstimatedMinutes(Number(event.target.value))} />
          <small>min</small>
        </label>
        <button type="submit" disabled={!newText.trim()}><PlusIcon aria-hidden="true" /> Add task</button>
      </form>

      <div className="priority-workbench" aria-label="Prioritized tasks">
        {tasks.length === 0 && <p className="priorities-empty">No priorities yet. Add the smallest useful step.</p>}
        {tasks.map((task, index) => {
          const taskProgress = getTaskProgress(task);
          const isActive = task.id === activeTask?.id;
          return (
            <article
              key={task.id}
              className="priority-work-row"
              data-active={isActive || undefined}
              data-complete={task.completed || undefined}
              draggable
              onDragStart={(event) => event.dataTransfer.setData("text/task-id", task.id)}
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => {
                event.preventDefault();
                onReorderTasks(event.dataTransfer.getData("text/task-id"), task.id);
              }}
            >
              <span className="priority-work-row__drag" aria-hidden="true" />
              <button type="button" className="priority-work-row__check" onClick={() => { onToggleTask(task.id); }} aria-label={task.completed ? "Mark " + task.text + " incomplete" : "Mark " + task.text + " complete"}>
                {task.completed && <CheckIcon aria-hidden="true" />}
              </button>
              <button type="button" className="priority-work-row__title" onClick={() => !task.completed && onSelectTask(task)} aria-current={isActive ? "true" : undefined}>
                <strong>{task.text}</strong>
                <span>{taskProgress}% focused</span>
              </button>
              <label className="priority-work-row__eta">
                <span className="sr-only">Estimated minutes for {task.text}</span>
                <input type="number" min="5" max="480" step="5" defaultValue={task.estimatedMinutes} onBlur={(event) => onUpdateTask(task.id, { estimatedMinutes: Number(event.target.value) })} />
                <small>min</small>
              </label>
              <div className="priority-work-row__moves">
                <button type="button" onClick={() => onMoveTask(task.id, -1)} disabled={index === 0} aria-label={`Move ${task.text} up`}><ChevronUpIcon /></button>
                <button type="button" onClick={() => onMoveTask(task.id, 1)} disabled={index === tasks.length - 1} aria-label={`Move ${task.text} down`}><ChevronDownIcon /></button>
              </div>
              <button type="button" className="priority-work-row__delete" onClick={() => onDeleteTask(task.id)} aria-label={`Delete ${task.text}`}><TrashIcon /></button>
              {showProgress && <div className="priority-work-row__progress"><i style={{ width: taskProgress + "%" }} /></div>}
            </article>
          );
        })}
      </div>

      <footer className="priorities-options">
        <label>
          Break duration
          <select value={preferences.breakMinutes} onChange={(event) => { const breakMinutes = Number(event.target.value); setStoredPreferences({ ...preferences, breakMinutes }); }}>
            {[5, 10, 15, 20, 30].map((minutes) => <option key={minutes} value={minutes}>{minutes} min</option>)}
          </select>
        </label>
        <label><input type="checkbox" checked={preferences.autoStartBreaks} onChange={(event) => setStoredPreferences({ ...preferences, autoStartBreaks: event.target.checked })} /> Auto-start breaks</label>
        <label><input type="checkbox" checked={showProgress} onChange={(event) => setShowProgress(event.target.checked)} /> Progress bars</label>
      </footer>
    </section>
  );
}
