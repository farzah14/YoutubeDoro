import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

test("workspace uses account-backed sessions and notes", () => {
  const rootFile = join(process.cwd(), "components/YouTubeRestTimer.tsx");
  const noteFile = join(process.cwd(), "components/session/SessionNoteEditor.tsx");
  const statsFile = join(process.cwd(), "components/stats/DailyStats.tsx");
  assert.equal(existsSync(noteFile), true);
  const root = readFileSync(rootFile, "utf8");
  const notes = readFileSync(noteFile, "utf8");
  const stats = readFileSync(statsFile, "utf8");
  for (const token of ["useCloudTasks", "useSessionRecorder", "useSessionHistory", "SessionNoteEditor", "sessionId"]) {
    assert.equal(root.includes(token), true, `missing ${token}`);
  }
  assert.equal(root.includes("useDailyNotes"), false);
  assert.equal(root.includes("writeNumber"), false);
  assert.equal(root.includes("KEYS.learnByDay"), false);
  assert.match(notes, /Markdown|note|auto/i);
  assert.match(stats, /useSessionHistory|formatDuration|sessions/);
});
