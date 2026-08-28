import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { fileURLToPath } from "node:url";

const hookSource = readFileSync(
  fileURLToPath(new URL("../hooks/useTasks.ts", import.meta.url)),
  "utf8"
);

test("useTasks exposes nested subtask actions through daily task persistence", () => {
  assert.match(hookSource, /addSubtaskItem/);
  assert.match(hookSource, /toggleSubtaskItem/);
  assert.match(hookSource, /deleteSubtaskItem/);
  assert.match(hookSource, /writeJSON\(KEYS\.tasksByDay\(day\), newTasks\)/);
  assert.match(hookSource, /addSubtask,/);
  assert.match(hookSource, /toggleSubtask,/);
  assert.match(hookSource, /deleteSubtask,/);
});
