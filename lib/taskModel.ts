import type { SubtaskItem, TaskItem } from "../types/index.ts";

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, Math.round(Number.isFinite(value) ? value : min)));

const withOrder = (tasks: TaskItem[]) => tasks.map((task, order) => ({ ...task, order }));

const withSubtaskOrder = (subtasks: SubtaskItem[]) =>
  subtasks.map((subtask, order) => ({ ...subtask, order }));

export function addSubtaskItem(
  tasks: TaskItem[],
  taskId: string,
  input: Pick<SubtaskItem, "id" | "text" | "createdAt">
): TaskItem[] {
  const text = input.text.trim();
  if (!text) return tasks;

  return tasks.map((task) => task.id !== taskId ? task : {
    ...task,
    subtasks: [...task.subtasks, {
      id: input.id,
      text,
      completed: false,
      createdAt: input.createdAt,
      order: task.subtasks.length,
    }],
  });
}

export function toggleSubtaskItem(
  tasks: TaskItem[],
  taskId: string,
  subtaskId: string
): TaskItem[] {
  return tasks.map((task) => task.id !== taskId ? task : {
    ...task,
    subtasks: task.subtasks.map((subtask) => subtask.id !== subtaskId
      ? subtask
      : { ...subtask, completed: !subtask.completed }),
  });
}

export function deleteSubtaskItem(
  tasks: TaskItem[],
  taskId: string,
  subtaskId: string
): TaskItem[] {
  return tasks.map((task) => task.id !== taskId ? task : {
    ...task,
    subtasks: withSubtaskOrder(task.subtasks.filter((subtask) => subtask.id !== subtaskId)),
  });
}

export function addTaskItem(
  tasks: TaskItem[],
  input: Pick<TaskItem, "id" | "text" | "createdAt"> & Partial<TaskItem>
): TaskItem[] {
  const text = input.text.trim();
  if (!text) return tasks;
  const estimatedMinutes = clamp(input.estimatedMinutes ?? 25, 5, 480);
  return withOrder([...tasks, {
    id: input.id,
    text,
    completed: false,
    estimatedPomos: clamp(input.estimatedPomos ?? Math.ceil(estimatedMinutes / 25), 1, 12),
    completedPomos: 0,
    createdAt: input.createdAt,
    emoji: input.emoji?.trim() || "✦",
    color: /^#[0-9a-f]{6}$/i.test(input.color ?? "") ? input.color! : "#7137ff",
    estimatedMinutes,
    focusedSeconds: 0,
    order: tasks.length,
    subtasks: [],
  }]);
}

export function reorderTaskItems(tasks: TaskItem[], movedId: string, targetId: string): TaskItem[] {
  const from = tasks.findIndex((task) => task.id === movedId);
  const to = tasks.findIndex((task) => task.id === targetId);
  if (from < 0 || to < 0 || from === to) return tasks;
  const next = [...tasks];
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return withOrder(next);
}

export function moveTaskItem(tasks: TaskItem[], id: string, offset: -1 | 1): TaskItem[] {
  const from = tasks.findIndex((task) => task.id === id);
  const to = from + offset;
  if (from < 0 || to < 0 || to >= tasks.length) return tasks;
  return reorderTaskItems(tasks, id, tasks[to].id);
}

export function updateTaskItem(
  tasks: TaskItem[],
  id: string,
  patch: Partial<Pick<TaskItem, "text" | "emoji" | "color" | "estimatedMinutes" | "focusedSeconds">>
): TaskItem[] {
  return tasks.map((task) => task.id !== id ? task : {
    ...task,
    ...(patch.text === undefined ? {} : { text: patch.text.trim() || task.text }),
    ...(patch.emoji === undefined ? {} : { emoji: patch.emoji.trim() || "✦" }),
    ...(patch.color === undefined ? {} : { color: /^#[0-9a-f]{6}$/i.test(patch.color) ? patch.color : task.color }),
    ...(patch.estimatedMinutes === undefined ? {} : {
      estimatedMinutes: clamp(patch.estimatedMinutes, 5, 480),
      estimatedPomos: clamp(Math.ceil(patch.estimatedMinutes / 25), 1, 12),
    }),
    ...(patch.focusedSeconds === undefined ? {} : { focusedSeconds: Math.max(0, Math.round(patch.focusedSeconds)) }),
  });
}

export function setTaskCompletion(tasks: TaskItem[], id: string, completed: boolean) {
  const target = tasks.find((task) => task.id === id);
  const completedFinalTask = Boolean(
    completed && target && !target.completed && tasks.filter((task) => !task.completed).length === 1
  );
  return {
    tasks: tasks.map((task) => task.id === id ? { ...task, completed } : task),
    completedFinalTask,
  };
}

export function resetTaskItems(tasks: TaskItem[]): TaskItem[] {
  return withOrder(tasks.map((task) => ({
    ...task,
    completed: false,
    completedPomos: 0,
    focusedSeconds: 0,
  })));
}

export const getTotalPlannedMinutes = (tasks: TaskItem[]) =>
  tasks.filter((task) => !task.completed).reduce((sum, task) => sum + task.estimatedMinutes, 0);

export const getProjectedFinishTime = (nowMs: number, tasks: TaskItem[]) =>
  nowMs + getTotalPlannedMinutes(tasks) * 60_000;

export const getTaskProgress = (task: TaskItem) =>
  clamp(task.focusedSeconds / (task.estimatedMinutes * 60) * 100, 0, 100);

export function getOverallProgress(tasks: TaskItem[]): number {
  const remaining = tasks.filter((task) => !task.completed);
  const totalSeconds = remaining.reduce((sum, task) => sum + task.estimatedMinutes * 60, 0);
  if (!totalSeconds) return tasks.length ? 100 : 0;
  const focusedSeconds = remaining.reduce(
    (sum, task) => sum + Math.min(task.focusedSeconds, task.estimatedMinutes * 60),
    0
  );
  return clamp(focusedSeconds / totalSeconds * 100, 0, 100);
}

export function selectActiveTask(tasks: TaskItem[], activeId: string | null): TaskItem | undefined {
  return tasks.find((task) => task.id === activeId && !task.completed)
    ?? tasks.find((task) => !task.completed);
}
