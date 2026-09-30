import assert from "node:assert/strict";
import test from "node:test";
import {
  addTaskItem,
  addSubtaskItem,
  deleteSubtaskItem,
  getOverallProgress,
  getProjectedFinishTime,
  getTaskProgress,
  getTotalPlannedMinutes,
  reorderTaskItems,
  resetTaskItems,
  selectActiveTask,
  setTaskCompletion,
  toggleSubtaskItem,
} from "../lib/taskModel.ts";
import type { TaskItem } from "../types/index.ts";

const task = (id: string, overrides: Partial<TaskItem> = {}): TaskItem => ({
  id,
  text: id.toUpperCase(),
  completed: false,
  estimatedPomos: 1,
  completedPomos: 0,
  createdAt: 1,
  emoji: "✦",
  color: "#7137ff",
  estimatedMinutes: 25,
  focusedSeconds: 0,
  order: 0,
  subtasks: [],
  ...overrides,
});

test("adds a trimmed task and clamps its ETA", () => {
  const tasks = addTaskItem([task("a")], {
    id: "b",
    text: "  Read chapter  ",
    estimatedMinutes: 999,
    createdAt: 2,
  });

  assert.equal(tasks[1].text, "Read chapter");
  assert.equal(tasks[1].estimatedMinutes, 480);
  assert.deepEqual(tasks.map((item) => item.order), [0, 1]);
});

test("reorders by dragged and target ids", () => {
  const tasks = reorderTaskItems([task("a"), task("b"), task("c")], "c", "a");
  assert.deepEqual(tasks.map((item) => item.id), ["c", "a", "b"]);
  assert.deepEqual(tasks.map((item) => item.order), [0, 1, 2]);
});

test("completes tasks and identifies only the final completion", () => {
  const first = setTaskCompletion([task("a"), task("b")], "a", true);
  assert.equal(first.completedFinalTask, false);

  const final = setTaskCompletion(first.tasks, "b", true);
  assert.equal(final.completedFinalTask, true);
  assert.equal(final.tasks.every((item) => item.completed), true);
});

test("resets task completion and focused progress", () => {
  const tasks = resetTaskItems([task("a", { completed: true, focusedSeconds: 800, completedPomos: 2 })]);
  assert.deepEqual(tasks[0], task("a"));
});

test("calculates ETA, finish time, and clamped progress", () => {
  const tasks = [
    task("a", { estimatedMinutes: 30, focusedSeconds: 900 }),
    task("b", { estimatedMinutes: 60, focusedSeconds: 9_999 }),
    task("c", { estimatedMinutes: 45, completed: true }),
  ];

  assert.equal(getTotalPlannedMinutes(tasks), 90);
  assert.equal(getProjectedFinishTime(1_000, tasks), 1_000 + 90 * 60_000);
  assert.equal(getTaskProgress(tasks[0]), 50);
  assert.equal(getTaskProgress(tasks[1]), 100);
  assert.equal(getOverallProgress(tasks), 83);
});

test("selects the requested incomplete task or the first remaining task", () => {
  const tasks = [task("a", { completed: true }), task("b"), task("c")];
  assert.equal(selectActiveTask(tasks, "c")?.id, "c");
  assert.equal(selectActiveTask(tasks, "a")?.id, "b");
  assert.equal(selectActiveTask(tasks, null)?.id, "b");
});

test("manages nested sub-tasks without completing the parent", () => {
  const added = addSubtaskItem([task("a")], "a", {
    id: "a-1",
    text: "  Learn Python  ",
    createdAt: 2,
  });

  assert.deepEqual(added[0].subtasks, [{
    id: "a-1",
    text: "Learn Python",
    completed: false,
    createdAt: 2,
    order: 0,
  }]);

  const checked = toggleSubtaskItem(added, "a", "a-1");
  assert.equal(checked[0].subtasks[0].completed, true);
  assert.equal(checked[0].completed, false);

  const deleted = deleteSubtaskItem(checked, "a", "a-1");
  assert.deepEqual(deleted[0].subtasks, []);
});

test("ignores blank sub-tasks and unknown parent or child ids", () => {
  const original = [task("a")];
  assert.deepEqual(addSubtaskItem(original, "a", {
    id: "blank",
    text: "   ",
    createdAt: 2,
  }), original);
  assert.deepEqual(toggleSubtaskItem(original, "missing", "blank"), original);
  assert.deepEqual(deleteSubtaskItem(original, "a", "missing"), original);
});
