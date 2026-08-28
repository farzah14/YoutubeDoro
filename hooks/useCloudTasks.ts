"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { TaskItem } from "@/types";
import type { TrackerTask } from "@/types/tracker";
import { trackerApi } from "@/lib/trackerApi";
import {
  moveTaskItem,
  reorderTaskItems,
  selectActiveTask,
  setTaskCompletion,
  toggleSubtaskItem,
} from "@/lib/taskModel";

function toTaskItem(task: TrackerTask): TaskItem {
  return {
    id: task.id,
    text: task.title,
    completed: task.completed,
    estimatedPomos: Math.max(1, Math.ceil(task.estimatedMinutes / 25)),
    completedPomos: task.completedSessions,
    createdAt: Date.parse(task.createdAt) || 0,
    emoji: task.emoji,
    color: task.color,
    estimatedMinutes: task.estimatedMinutes,
    focusedSeconds: task.focusedSeconds,
    linkedSessionCount: task.linkedSessionCount,
    order: task.order,
    subtasks: task.subtasks.map((subtask) => ({
      id: subtask.id,
      text: subtask.text,
      completed: subtask.completed,
      createdAt: Date.parse(subtask.createdAt) || 0,
      order: subtask.order,
    })),
  };
}

function taskPatch(patch: Partial<TaskItem>) {
  return {
    ...(patch.text === undefined ? {} : { title: patch.text }),
    ...(patch.completed === undefined ? {} : { completed: patch.completed }),
    ...(patch.estimatedMinutes === undefined ? {} : { estimatedMinutes: patch.estimatedMinutes }),
    ...(patch.emoji === undefined ? {} : { emoji: patch.emoji }),
    ...(patch.color === undefined ? {} : { color: patch.color }),
    ...(patch.order === undefined ? {} : { order: patch.order }),
  };
}

export function useCloudTasks() {
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const result = await trackerApi.listTasks();
      const next = result.tasks.map(toTaskItem).sort((a, b) => a.order - b.order);
      setTasks(next);
      setActiveTaskId((current) => selectActiveTask(next, current)?.id ?? null);
      setError("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not load tasks.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void reload(); }, [reload]);

  const addTask = useCallback(async (text: string, estimatedMinutes = 25) => {
    const trimmed = text.trim();
    if (!trimmed) return undefined;
    try {
      const result = await trackerApi.createTask({ title: trimmed, estimatedMinutes, order: tasks.length });
      const task = toTaskItem(result.task);
      setTasks((current) => [...current, task].sort((a, b) => a.order - b.order));
      setActiveTaskId((current) => current ?? task.id);
      setError("");
      return task;
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not create task.");
      return undefined;
    }
  }, [tasks.length]);

  const toggleTask = useCallback(async (id: string) => {
    const target = tasks.find((task) => task.id === id);
    if (!target) return false;
    try {
      await trackerApi.updateTask(id, { completed: !target.completed });
      const next = setTaskCompletion(tasks, id, !target.completed).tasks;
      setTasks(next);
      if (!target.completed) setActiveTaskId((current) => current === id ? selectActiveTask(next, null)?.id ?? null : current);
      setError("");
      return true;
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not update task.");
      return false;
    }
  }, [tasks]);

  const deleteTask = useCallback(async (id: string) => {
    const task = tasks.find((item) => item.id === id);
    if (!task || (typeof window !== "undefined" && !window.confirm(`Delete “${task.text}” permanently? This also removes ${task.linkedSessionCount ?? 0} linked session${task.linkedSessionCount === 1 ? "" : "s"} and its subtasks.`))) return;
    try {
      await trackerApi.deleteTask(id);
      setTasks((current) => current.filter((task) => task.id !== id).map((task, order) => ({ ...task, order })));
      setActiveTaskId((current) => current === id ? null : current);
      setError("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not delete task.");
    }
  }, [tasks]);

  const updateTask = useCallback(async (id: string, patch: Partial<TaskItem>) => {
    try {
      const result = await trackerApi.updateTask(id, taskPatch(patch));
      setTasks((current) => current.map((task) => {
        if (task.id !== id) return task;
        const updated = toTaskItem(result.task);
        return { ...task, ...updated, subtasks: task.subtasks, focusedSeconds: task.focusedSeconds, completedPomos: task.completedPomos };
      }));
      setError("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not update task.");
    }
  }, []);

  const updateTaskText = useCallback((id: string, text: string) => { void updateTask(id, { text }); }, [updateTask]);
  const updateEstimatedPomos = useCallback((id: string, estimatedPomos: number) => { void updateTask(id, { estimatedMinutes: estimatedPomos * 25 }); }, [updateTask]);

  const reorderTasks = useCallback(async (movedId: string, targetId: string) => {
    const next = reorderTaskItems(tasks, movedId, targetId);
    if (next === tasks) return;
    try {
      await Promise.all(next.map((task) => trackerApi.updateTask(task.id, { order: task.order })));
      setTasks(next);
      setError("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not reorder tasks.");
    }
  }, [tasks]);

  const moveTask = useCallback(async (id: string, offset: -1 | 1) => {
    const target = moveTaskItem(tasks, id, offset);
    if (target === tasks) return;
    try {
      await Promise.all(target.map((task) => trackerApi.updateTask(task.id, { order: task.order })));
      setTasks(target);
      setError("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not move task.");
    }
  }, [tasks]);

  const addSubtask = useCallback(async (taskId: string, text: string) => {
    const task = tasks.find((item) => item.id === taskId);
    if (!task || !text.trim()) return;
    try {
      await trackerApi.createSubtask(taskId, { text: text.trim(), order: task.subtasks.length });
      await reload();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not add subtask.");
    }
  }, [reload, tasks]);

  const toggleSubtask = useCallback(async (taskId: string, subtaskId: string) => {
    const task = tasks.find((item) => item.id === taskId);
    const subtask = task?.subtasks.find((item) => item.id === subtaskId);
    if (!subtask) return;
    try {
      await trackerApi.updateSubtask(subtaskId, { completed: !subtask.completed });
      setTasks((current) => toggleSubtaskItem(current, taskId, subtaskId));
      setError("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not update subtask.");
    }
  }, [tasks]);

  const deleteSubtask = useCallback(async (taskId: string, subtaskId: string) => {
    try {
      await trackerApi.deleteSubtask(subtaskId);
      setTasks((current) => current.map((task) => task.id !== taskId ? task : {
        ...task,
        subtasks: task.subtasks.filter((subtask) => subtask.id !== subtaskId).map((subtask, order) => ({ ...subtask, order })),
      }));
      setError("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not delete subtask.");
    }
  }, []);

  const resetTasks = useCallback(async () => {
    try {
      await Promise.all(tasks.filter((task) => task.completed).map((task) => trackerApi.updateTask(task.id, { completed: false })));
      setTasks((current) => current.map((task) => ({ ...task, completed: false })));
      setActiveTaskId((current) => selectActiveTask(tasks, current)?.id ?? tasks[0]?.id ?? null);
      setError("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not reset tasks.");
    }
  }, [tasks]);

  const activeTask = useMemo(() => selectActiveTask(tasks, activeTaskId), [activeTaskId, tasks]);

  return {
    tasks,
    activeTaskId,
    activeTask,
    setActiveTaskId,
    loading,
    error,
    reload,
    addTask,
    toggleTask,
    deleteTask,
    updateTaskText,
    updateEstimatedPomos,
    recordTaskFocus: () => undefined,
    reorderTasks,
    moveTask,
    updateTask,
    addSubtask,
    toggleSubtask,
    deleteSubtask,
    resetTasks,
  };
}
