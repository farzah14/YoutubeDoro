import assert from "node:assert/strict";
import test from "node:test";
import { aggregateStats, dateKeys, percentChange, type DailyHistory } from "../lib/statsModel.ts";

const history: Record<string, DailyHistory> = {
  "2026-08-28": { focusSeconds: 3_600, breakSeconds: 600, tasksCompleted: 2, sessions: 3 },
  "2026-08-27": { focusSeconds: 1_800, breakSeconds: 300, tasksCompleted: 1, sessions: 2 },
  "2026-08-26": { focusSeconds: 0, breakSeconds: 0, tasksCompleted: 0, sessions: 0 },
  "2026-08-25": { focusSeconds: 900, breakSeconds: 120, tasksCompleted: 1, sessions: 1 },
  "2026-08-24": { focusSeconds: 900, breakSeconds: 60, tasksCompleted: 0, sessions: 1 },
};

test("returns inclusive date keys for a range", () => {
  assert.deepEqual(dateKeys("2026-08-28", 3), ["2026-08-26", "2026-08-27", "2026-08-28"]);
});

test("aggregates range metrics and streaks", () => {
  const stats = aggregateStats(history, "2026-08-28", 3);
  assert.equal(stats.focusSeconds, 5_400);
  assert.equal(stats.breakSeconds, 900);
  assert.equal(stats.tasksCompleted, 3);
  assert.equal(stats.sessions, 5);
  assert.equal(stats.currentStreak, 2);
  assert.equal(stats.longestStreak, 2);
});

test("compares periods without divide-by-zero errors", () => {
  assert.equal(percentChange(150, 100), 50);
  assert.equal(percentChange(0, 0), 0);
  assert.equal(percentChange(50, 0), 100);
});
