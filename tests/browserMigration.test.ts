import assert from "node:assert/strict";
import test from "node:test";
import { exportBrowserTrackerData } from "../lib/browserMigration.ts";

class MemoryStorage {
  private readonly values = new Map<string, string>();
  constructor(seed: Record<string, unknown>) {
    for (const [key, value] of Object.entries(seed)) this.values.set(key, typeof value === "string" ? value : JSON.stringify(value));
  }
  get length() { return this.values.size; }
  key(index: number) { return [...this.values.keys()][index] ?? null; }
  getItem(key: string) { return this.values.get(key) ?? null; }
  setItem(key: string, value: string) { this.values.set(key, value); }
}

test("exports tracker browser data deterministically and excludes presentation data", () => {
  const storage = new MemoryStorage({
    "ytdoro:2026-08-28:tasks": [{ id: "local-task", text: "Python", estimatedMinutes: 60, subtasks: [{ id: "sub-1", text: "Read docs", completed: true }] }],
    "ytdoro:2026-08-28:topic": "Python",
    "ytdoro:2026-08-28:learnSec": "5400",
    "ytdoro:2026-08-28:restSec": "90",
    "ytdoro:2026-08-28:Python:learnSec": "5400",
    "ytdoro:2026-08-28:Python:restSec": "90",
    "ytdoro:2026-08-28:notes": [{ kind: "learn_done", title: "Python", deltaLearnSec: 1800, deltaRestSec: 0 }],
    "ytdoro:2026-08-28:taskNotes": { "local-task": "Keep the parser example nearby." },
    "ytdoro:theme": "night-study",
    "ytdoro:lofi:station": "rain",
    "ytdoro:dashboardName": "Ada",
  });

  const first = exportBrowserTrackerData(storage, "migration-key-12345");
  const second = exportBrowserTrackerData(storage, "migration-key-12345");
  assert.deepEqual(first, second);
  assert.equal(first.tasks.length, 1);
  assert.equal(first.tasks[0].subtasks.length, 1);
  assert.match(first.tasks[0].sourceKey, /migration-key-12345.*2026-08-28.*local-task/);
  assert.equal(first.sessions.some((session) => session.breakCount === null), true);
  assert.equal(first.sessions.some((session) => session.learningSeconds === 5400 && session.breakSeconds === 90), true);
  assert.equal(first.sessions.some((session) => session.note.includes("Keep the parser example nearby.")), true);
  assert.equal(JSON.stringify(first).includes("night-study"), false);
  assert.equal(JSON.stringify(first).includes("Ada"), false);
});
