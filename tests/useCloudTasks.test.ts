import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

test("cloud task hook owns account-level task state", () => {
  const file = join(process.cwd(), "hooks/useCloudTasks.ts");
  assert.equal(existsSync(file), true);
  const source = readFileSync(file, "utf8");
  for (const token of ["trackerApi", "addTask", "updateTask", "deleteTask", "addSubtask", "toggleSubtask", "deleteSubtask", "reload"]) {
    assert.equal(source.includes(token), true, `missing ${token}`);
  }
  assert.equal(source.includes("tasksByDay"), false);
  assert.equal(source.includes("writeJSON"), false);
});
