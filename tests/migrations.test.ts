import assert from "node:assert/strict";
import test from "node:test";

import {
  migrateFocusPreferences,
  migrateTaskItems,
  migrateThemeSlots,
} from "../lib/migrations.ts";

test("migrates legacy pomodoro tasks without losing progress", () => {
  const [task] = migrateTaskItems(
    [
      {
        id: "task-1",
        text: "Finish the report",
        completed: false,
        estimatedPomos: 3,
        completedPomos: 1,
        createdAt: 123,
      },
    ],
    25
  );

  assert.deepEqual(task, {
    id: "task-1",
    text: "Finish the report",
    completed: false,
    estimatedPomos: 3,
    completedPomos: 1,
    createdAt: 123,
    emoji: "✦",
    color: "#7c3aed",
    estimatedMinutes: 75,
    focusedSeconds: 1500,
    order: 0,
    subtasks: [],
  });
});

test("normalizes nested sub-tasks and preserves valid completion", () => {
  const [task] = migrateTaskItems([{
    id: "task-3",
    text: "Learning Data Engineering",
    subtasks: [
      { id: "s-1", text: "  Learn Python  ", completed: true, createdAt: 5, order: 99 },
      { id: "s-2", text: "   ", completed: "yes", createdAt: -1 },
      null,
      { id: "s-3", text: " Learn SQL ", completed: false, createdAt: 7 },
    ],
  }]);

  assert.deepEqual(task.subtasks, [
    { id: "s-1", text: "Learn Python", completed: true, createdAt: 5, order: 0 },
    { id: "s-3", text: "Learn SQL", completed: false, createdAt: 7, order: 1 },
  ]);
});

test("drops malformed tasks and clamps stored task values", () => {
  const tasks = migrateTaskItems(
    [
      null,
      { id: "", text: "Missing id" },
      {
        id: "task-2",
        text: "  Read chapter  ",
        completed: true,
        estimatedPomos: 99,
        completedPomos: -3,
        createdAt: 0,
        emoji: "📚",
        color: "not-a-color",
        estimatedMinutes: 9999,
        focusedSeconds: -10,
        order: -8,
      },
    ],
    25
  );

  assert.equal(tasks.length, 1);
  assert.equal(tasks[0].text, "Read chapter");
  assert.equal(tasks[0].estimatedPomos, 12);
  assert.equal(tasks[0].completedPomos, 0);
  assert.equal(tasks[0].estimatedMinutes, 480);
  assert.equal(tasks[0].focusedSeconds, 0);
  assert.equal(tasks[0].color, "#7c3aed");
  assert.equal(tasks[0].order, 0);
});

test("migrates only the remaining Home and Focus theme slots", () => {
  assert.deepEqual(
    migrateThemeSlots(
      {
        home: "rainy-evening",
        focus: "unknown-theme",
        ambient: "rainy-evening",
      },
      "sunset-study",
      ["night-study", "rainy-evening", "sunset-study"],
      "night-study"
    ),
    {
      home: "rainy-evening",
      focus: "sunset-study",
    }
  );
});

test("sanitizes focus preferences into supported ranges", () => {
  assert.deepEqual(
    migrateFocusPreferences({
      mode: "invalid",
      focusMinutes: 0,
      shortBreakMinutes: 999,
      longBreakMinutes: 20,
      countdownMinutes: 42,
      autoStartBreaks: "yes",
      notificationEnabled: true,
      alertSound: "unknown",
      alertVolume: -1,
      showTaskInPip: true,
    }),
    {
      mode: "pomodoro",
      focusMinutes: 25,
      breakMinutes: 120,
      countdownMinutes: 42,
      autoStartBreaks: false,
      notificationEnabled: true,
      alertSound: "soft",
      alertVolume: 0,
      showTaskInPip: true,
    }
  );
});
