"use client";

import { useState, useCallback, useEffect } from "react";
import { TaskItem } from "@/types";
import { readJSON, readNumber, writeJSON, writeNumber } from "@/lib/storage";
import { KEYS } from "@/lib/constants";
import { migrateTaskItems } from "@/lib/migrations";
import {
  addTaskItem,
  addSubtaskItem,
  deleteSubtaskItem,
  moveTaskItem,
  reorderTaskItems,
  resetTaskItems,
  selectActiveTask,
  setTaskCompletion,
  toggleSubtaskItem,
  updateTaskItem,
} from "@/lib/taskModel";

export function useTasks(day: string) {
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);

  // Hydrate persisted tasks after the server/client markup has matched.
  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    const hydrated = day ? migrateTaskItems(readJSON<unknown>(KEYS.tasksByDay(day), [])) : [];
    setTasks(hydrated);
    setActiveTaskId(selectActiveTask(hydrated, null)?.id ?? null);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [day]);

  // Persist helper
  const saveTasks = useCallback(
    (newTasks: TaskItem[]) => {
      setTasks(newTasks);
      if (day) {
        writeJSON(KEYS.tasksByDay(day), newTasks);
      }
    },
    [day]
  );

  const addTask = useCallback(
    (text: string, estimatedMinutes: number = 25) => {
      const trimmed = text.trim();
      if (!trimmed) return;
      const id = `task_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const updated = addTaskItem(tasks, { id, text: trimmed, estimatedMinutes, createdAt: Date.now() });
      saveTasks(updated);
      if (!selectActiveTask(tasks, activeTaskId)) setActiveTaskId(id);
      const newTask = updated.find((task) => task.id === id);
      return newTask;
    },
    [activeTaskId, tasks, saveTasks]
  );

  const toggleTask = useCallback(
    (id: string) => {
      const target = tasks.find((task) => task.id === id);
      if (!target) return false;
      const result = setTaskCompletion(tasks, id, !target.completed);
      saveTasks(result.tasks);
      if (!target.completed && result.tasks.find((task) => task.id === id)?.completed && day) {
        writeNumber(KEYS.taskCompletionsByDay(day), readNumber(KEYS.taskCompletionsByDay(day)) + 1);
      }
      if (!target.completed && activeTaskId === id) {
        setActiveTaskId(selectActiveTask(result.tasks, null)?.id ?? null);
      }
      return result.completedFinalTask;
    },
    [activeTaskId, day, tasks, saveTasks]
  );

  const deleteTask = useCallback(
    (id: string) => {
      const updated = tasks.filter((t) => t.id !== id).map((task, order) => ({ ...task, order }));
      if (activeTaskId === id) setActiveTaskId(selectActiveTask(updated, null)?.id ?? null);
      saveTasks(updated);
    },
    [tasks, activeTaskId, saveTasks]
  );

  const updateTaskText = useCallback(
    (id: string, text: string) => {
      saveTasks(updateTaskItem(tasks, id, { text }));
    },
    [tasks, saveTasks]
  );

  const updateEstimatedPomos = useCallback(
    (id: string, estimatedPomos: number) => {
      saveTasks(updateTaskItem(tasks, id, { estimatedMinutes: estimatedPomos * 25 }));
    },
    [tasks, saveTasks]
  );

  const recordTaskFocus = useCallback(
    (taskIdOrTitle: string | undefined, seconds: number, completedSession = false) => {
      if (!taskIdOrTitle) return;
      const updated = tasks.map((t) => {
        if (t.id === taskIdOrTitle || t.text.toLowerCase() === taskIdOrTitle.toLowerCase()) {
          return {
            ...t,
            focusedSeconds: t.focusedSeconds + Math.max(0, Math.round(seconds)),
            completedPomos: t.completedPomos + (completedSession ? 1 : 0),
          };
        }
        return t;
      });
      saveTasks(updated);
    },
    [tasks, saveTasks]
  );

  const reorderTasks = useCallback((movedId: string, targetId: string) => {
    saveTasks(reorderTaskItems(tasks, movedId, targetId));
  }, [saveTasks, tasks]);

  const moveTask = useCallback((id: string, offset: -1 | 1) => {
    saveTasks(moveTaskItem(tasks, id, offset));
  }, [saveTasks, tasks]);

  const updateTask = useCallback((id: string, patch: Parameters<typeof updateTaskItem>[2]) => {
    saveTasks(updateTaskItem(tasks, id, patch));
  }, [saveTasks, tasks]);

  const addSubtask = useCallback(
    (taskId: string, text: string) => {
      const trimmed = text.trim();
      if (!trimmed) return;
      const id = "subtask_" + Date.now() + "_" + Math.random().toString(36).substring(2, 7);
      saveTasks(addSubtaskItem(tasks, taskId, {
        id,
        text: trimmed,
        createdAt: Date.now(),
      }));
    },
    [saveTasks, tasks]
  );

  const toggleSubtask = useCallback(
    (taskId: string, subtaskId: string) => {
      saveTasks(toggleSubtaskItem(tasks, taskId, subtaskId));
    },
    [saveTasks, tasks]
  );

  const deleteSubtask = useCallback(
    (taskId: string, subtaskId: string) => {
      saveTasks(deleteSubtaskItem(tasks, taskId, subtaskId));
    },
    [saveTasks, tasks]
  );

  const resetTasks = useCallback(() => {
    const reset = resetTaskItems(tasks);
    saveTasks(reset);
    setActiveTaskId(selectActiveTask(reset, null)?.id ?? null);
  }, [saveTasks, tasks]);

  const activeTask = selectActiveTask(tasks, activeTaskId);

  return {
    tasks,
    activeTaskId,
    activeTask,
    setActiveTaskId,
    addTask,
    toggleTask,
    deleteTask,
    updateTaskText,
    updateEstimatedPomos,
    recordTaskFocus,
    reorderTasks,
    moveTask,
    updateTask,
    addSubtask,
    toggleSubtask,
    deleteSubtask,
    resetTasks,
  };
}
