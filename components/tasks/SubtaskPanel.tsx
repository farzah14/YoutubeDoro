"use client";

import { FormEvent, useState } from "react";
import type { TaskItem } from "@/types";
import { PlusIcon, TrashIcon } from "../icons";

interface SubtaskPanelProps {
  activeTask?: TaskItem;
  onAddSubtask: (taskId: string, text: string) => void;
  onToggleSubtask: (taskId: string, subtaskId: string) => void;
  onDeleteSubtask: (taskId: string, subtaskId: string) => void;
  onOpenTasks: () => void;
}

export function SubtaskPanel({
  activeTask,
  onAddSubtask,
  onToggleSubtask,
  onDeleteSubtask,
  onOpenTasks,
}: SubtaskPanelProps) {
  const [newText, setNewText] = useState("");

  const handleAdd = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!activeTask || !newText.trim()) return;
    onAddSubtask(activeTask.id, newText);
    setNewText("");
  };

  const completedCount = activeTask?.subtasks.filter((subtask) => subtask.completed).length ?? 0;
  const totalCount = activeTask?.subtasks.length ?? 0;
  const progress = totalCount ? Math.round((completedCount / totalCount) * 100) : 0;

  return (
    <section className="subtasks-panel" aria-labelledby="subtasks-title">
      <div className="subtasks-context">
        <p className="subtasks-context__folio">FOLIO / {activeTask ? "FOCUS PLAN" : "NO PRIORITY"}</p>
        <p className="eyebrow">Focus plan</p>
        <h3 id="subtasks-title">Sub-tasks</h3>
        <p>{activeTask ? "Focus plan / " + activeTask.text : "Choose a focus priority first."}</p>
      </div>

      {!activeTask ? (
        <div className="subtasks-empty">
          <p>No active focus priority. Choose one before adding sub-tasks.</p>
          <button type="button" className="subtasks-empty__action" onClick={onOpenTasks}>
            Open Focus Priorities
          </button>
        </div>
      ) : (
        <>
          <div className="subtasks-progress" role="progressbar" aria-label="Sub-task progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress}>
            <span>{completedCount} of {totalCount} complete</span>
            <i style={{ width: progress + "%" }} />
          </div>

          <ol className="subtasks-list no-scrollbar" aria-label={"Sub-tasks for " + activeTask.text}>
            {activeTask.subtasks.length === 0 && <li className="subtasks-empty">No sub-tasks yet. Add the next small step.</li>}
            {activeTask.subtasks.map((subtask, index) => (
              <li className="subtask-row" data-complete={subtask.completed || undefined} key={subtask.id}>
                <span className="subtask-row__index" aria-hidden="true">CUT {String(index + 1).padStart(2, "0")}</span>
                <label>
                  <input type="checkbox" checked={subtask.completed} onChange={() => onToggleSubtask(activeTask.id, subtask.id)} aria-label={(subtask.completed ? "Mark incomplete sub-task " : "Mark complete sub-task ") + subtask.text} />
                  <span>{subtask.text}</span>
                </label>
                <button
                  type="button"
                  className="subtask-row__delete"
                  onClick={() => onDeleteSubtask(activeTask.id, subtask.id)}
                  aria-label={"Delete sub-task " + subtask.text}
                  title={"Delete sub-task " + subtask.text}
                >
                  <TrashIcon aria-hidden="true" />
                </button>
              </li>
            ))}
          </ol>

          <form className="subtasks-add" onSubmit={handleAdd}>
            <input value={newText} onChange={(event) => setNewText(event.target.value)} placeholder="Add a sub-task" aria-label="Sub-task title" />
            <button type="submit" disabled={!newText.trim()}><PlusIcon aria-hidden="true" /> Add</button>
          </form>
        </>
      )}
    </section>
  );
}
