import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { fileURLToPath } from "node:url";

const hookSource = readFileSync(
  fileURLToPath(new URL("../hooks/useCloudTasks.ts", import.meta.url)),
  "utf8"
);

test("cloud task hook exposes account-backed nested subtask actions", () => {
  assert.match(hookSource, /trackerApi\.listTasks/);
  assert.match(hookSource, /trackerApi\.createTask/);
  assert.match(hookSource, /trackerApi\.createSubtask/);
  assert.match(hookSource, /trackerApi\.updateSubtask/);
  assert.match(hookSource, /trackerApi\.deleteSubtask/);
  assert.match(hookSource, /addSubtask,/);
  assert.match(hookSource, /toggleSubtask,/);
  assert.match(hookSource, /deleteSubtask,/);
  assert.doesNotMatch(hookSource, /writeJSON|tasksByDay|learnByDay/);
});
