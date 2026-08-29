import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

test("workspace uses account-backed sessions and notes", () => {
  const rootFile = join(process.cwd(), "components/YouTubeRestTimer.tsx");
  const historyFile = join(process.cwd(), "components/history/HistoryPanel.tsx");
  const statsFile = join(process.cwd(), "components/stats/DailyStats.tsx");
  assert.equal(existsSync(historyFile), true);
  const root = readFileSync(rootFile, "utf8");
  const history = readFileSync(historyFile, "utf8");
  const stats = readFileSync(statsFile, "utf8");
  for (const token of ["useCloudTasks", "useSessionRecorder", "useSessionHistory"]) {
    assert.equal(root.includes(token), true, `missing ${token}`);
  }
  assert.equal(root.includes("SessionNoteEditor"), false);
  assert.equal(root.includes("useDailyNotes"), false);
  assert.equal(root.includes("writeNumber"), false);
  assert.equal(root.includes("KEYS.learnByDay"), false);
  assert.match(history, /Session note/);
  assert.match(stats, /useSessionHistory|formatDuration|sessions/);
});
