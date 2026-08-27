"use client";

import { FormEvent, useId, useRef, useState } from "react";
import { TaskItem } from "@/types";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { Badge } from "../ui/Badge";
import {
  BookIcon,
  CheckIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  PlusIcon,
  TargetIcon,
  TrashIcon,
} from "../icons";

interface TaskQueueProps {
  tasks: TaskItem[];
  activeTaskId: string | null;
  currentTopic: string;
  onSelectTask: (task: TaskItem) => void;
  onAddTask: (text: string, estimatedPomos: number) => void;
  onToggleTask: (id: string) => void;
  onDeleteTask: (id: string) => void;
}

export function TaskQueue({
  tasks,
  activeTaskId,
  currentTopic,
  onSelectTask,
  onAddTask,
  onToggleTask,
  onDeleteTask,
}: TaskQueueProps) {
  const [newText, setNewText] = useState("");
  const [estPomos, setEstPomos] = useState(2);
  const [isExpanded, setIsExpanded] = useState(true);
  const [showCompleted, setShowCompleted] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const inputId = useId();
  const estimateId = useId();
  const completedId = useId();

  const completedTasks = tasks.filter((task) => task.completed);
  const activeTask = tasks.find((task) => task.id === activeTaskId);
  const topicTask = tasks.find(
    (task) =>
      !task.completed &&
      currentTopic.trim() !== "" &&
      task.text.toLowerCase() === currentTopic.trim().toLowerCase()
  );
  const currentTask = activeTask || topicTask;
  const upNextTasks = tasks.filter(
    (task) => !task.completed && task.id !== currentTask?.id
  );
  const currentLabel = currentTask?.text || currentTopic.trim();

  const handleAdd = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!newText.trim()) return;
    onAddTask(newText.trim(), estPomos);
    setNewText("");
  };

  const focusInput = () => inputRef.current?.focus();

  const renderTaskRow = (task: TaskItem, completed = false) => {
    const isCurrent = task.id === currentTask?.id;
    return (
      <div
        key={task.id}
        className={`flex min-w-0 items-center gap-3 border px-3 py-3 transition-colors focus-within:border-border-focus ${
          isCurrent
            ? "border-accent bg-accent-soft"
            : "border-border-subtle bg-surface-secondary/60 hover:border-border"
        }`}
      >
        <button
          type="button"
          onClick={() => onToggleTask(task.id)}
          className={`flex h-11 w-11 shrink-0 items-center justify-center border transition-colors ${
            task.completed
              ? "border-success bg-success text-surface"
              : "border-border hover:border-border-focus hover:text-accent"
          }`}
          aria-label={task.completed ? `Mark ${task.text} incomplete` : `Mark ${task.text} complete`}
          title={task.completed ? "Mark incomplete" : "Mark complete"}
        >
          {task.completed && <CheckIcon className="h-4 w-4" />}
        </button>

        <button
          type="button"
          onClick={() => onSelectTask(task)}
          className={`min-w-0 flex-1 text-left text-sm font-semibold transition-colors hover:text-accent focus-visible:outline-none ${
            completed ? "text-text-muted line-through" : "text-foreground"
          }`}
          title={completed ? "Reopen and set as current task" : "Set as current task"}
        >
          <span className="block truncate">{task.text}</span>
          <span className="mt-1 flex items-center gap-1 text-[0.68rem] font-mono font-normal text-text-muted">
            <TargetIcon className="h-3 w-3" aria-hidden="true" />
            {task.completedPomos}/{task.estimatedPomos} sessions
          </span>
        </button>

        <div className="flex shrink-0 items-center gap-2">
          {isCurrent && !completed && <Badge className="hidden sm:inline-flex">Current</Badge>}
          <button
            type="button"
            onClick={() => onDeleteTask(task.id)}
            className="flex h-11 w-11 items-center justify-center text-text-muted transition-colors hover:text-danger"
            aria-label={`Delete ${task.text}`}
            title="Delete task"
          >
            <TrashIcon className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  };

  return (
    <section className="quiet-panel min-w-0 p-4 sm:p-5" aria-labelledby="task-queue-title">
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="eyebrow">Task rail · タスク</p>
          <h2 id="task-queue-title" className="mt-2 text-lg font-bold tracking-tight text-foreground">
            Task Queue
          </h2>
          <p className="mt-1 text-xs text-text-muted">Choose the next small step before the timer starts.</p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="shrink-0"
          onClick={() => setIsExpanded((expanded) => !expanded)}
          aria-expanded={isExpanded}
          aria-controls={`${inputId}-content`}
          aria-label={isExpanded ? "Collapse task queue" : "Expand task queue"}
          title={isExpanded ? "Collapse task queue" : "Expand task queue"}
        >
          {isExpanded ? <ChevronUpIcon className="h-4 w-4" /> : <ChevronDownIcon className="h-4 w-4" />}
        </Button>
      </header>

      {isExpanded && (
        <div id={`${inputId}-content`} className="mt-5 space-y-5">
          <section className="border-y border-border-subtle py-4" aria-labelledby={`${inputId}-current`}>
            <div className="flex items-center justify-between gap-3">
              <h3 id={`${inputId}-current`} className="eyebrow">Current task</h3>
              {currentTask && <Badge variant="outline">In view</Badge>}
            </div>
            {currentLabel ? (
              <p className="mt-3 truncate text-base font-semibold text-foreground" title={currentLabel}>
                {currentLabel}
              </p>
            ) : (
              <div className="mt-3 flex items-center gap-2 text-sm text-text-muted">
                <BookIcon className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span>Nothing selected yet.</span>
              </div>
            )}
          </section>

          <form onSubmit={handleAdd} className="space-y-3" aria-label="Add a task">
            <label htmlFor={inputId} className="eyebrow">Add a small task</label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input
                ref={inputRef}
                id={inputId}
                value={newText}
                onChange={(event) => setNewText(event.target.value)}
                placeholder="What will you focus on?"
                className="min-w-0 flex-1"
              />
              <div className="flex gap-2">
                <label htmlFor={estimateId} className="sr-only">Estimated focus sessions</label>
                <select
                  id={estimateId}
                  value={estPomos}
                  onChange={(event) => setEstPomos(Number(event.target.value))}
                  aria-label="Estimated focus sessions"
                  className="h-10 min-w-0 flex-1 border border-border bg-surface-secondary px-3 text-xs font-mono text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus sm:flex-none"
                >
                  {[1, 2, 3, 4, 5, 6, 8].map((count) => (
                    <option key={count} value={count} className="bg-surface text-foreground">
                      {count} {count === 1 ? "session" : "sessions"}
                    </option>
                  ))}
                </select>
                <Button type="submit" variant="primary" disabled={!newText.trim()} className="shrink-0">
                  <PlusIcon className="mr-2 h-4 w-4" aria-hidden="true" />
                  Add task
                </Button>
              </div>
            </div>
          </form>

          {tasks.length === 0 && (
            <div className="border border-dashed border-border-subtle bg-surface-secondary/40 px-4 py-4">
              <p className="text-sm font-semibold text-foreground">A clear desk starts with one small task.</p>
              <p className="mt-1 text-xs text-text-muted">Add one intention and let the timer hold the space.</p>
              <Button type="button" variant="secondary" size="sm" className="mt-3" onClick={focusInput}>
                Add your first task
              </Button>
            </div>
          )}

          <section aria-labelledby={`${inputId}-up-next`}>
            <div className="flex items-center justify-between gap-3">
              <h3 id={`${inputId}-up-next`} className="eyebrow">Up next</h3>
              <span className="text-xs font-mono text-text-muted">{upNextTasks.length} queued</span>
            </div>
            <div className="mt-3 space-y-2">
              {upNextTasks.length > 0 ? (
                upNextTasks.map((task) => renderTaskRow(task))
              ) : (
                <p className="border border-border-subtle px-3 py-3 text-xs text-text-muted">
                  No other tasks queued.
                </p>
              )}
            </div>
          </section>

          {completedTasks.length > 0 && (
            <section aria-labelledby={completedId}>
              <button
                type="button"
                className="flex min-h-11 w-full items-center justify-between border-t border-border-subtle pt-4 text-left"
                onClick={() => setShowCompleted((shown) => !shown)}
                aria-expanded={showCompleted}
                aria-controls={`${completedId}-list`}
              >
                <span>
                  <span id={completedId} className="eyebrow">Completed</span>
                  <span className="ml-2 text-xs font-mono text-text-muted">{completedTasks.length}</span>
                </span>
                {showCompleted ? <ChevronUpIcon className="h-4 w-4 text-text-muted" /> : <ChevronDownIcon className="h-4 w-4 text-text-muted" />}
              </button>
              {showCompleted && (
                <div id={`${completedId}-list`} className="mt-3 space-y-2">
                  {completedTasks.map((task) => renderTaskRow(task, true))}
                </div>
              )}
            </section>
          )}
        </div>
      )}
    </section>
  );
}
