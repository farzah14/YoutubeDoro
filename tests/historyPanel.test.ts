import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

test("History exposes filters, editable metadata, and immutable timing", () => {
  const file = join(process.cwd(), "components/history/HistoryPanel.tsx");
  assert.equal(existsSync(file), true);
  const source = readFileSync(file, "utf8");
  for (const token of ["useSessionHistory", "formatDuration", "type=\"date\"", "taskId", "title", "note", "window.confirm", "deleteSession"]) {
    assert.match(source, new RegExp(token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")), `missing ${token}`);
  }
  assert.match(source, /breakCount\s*===\s*null|breakCount\s*==\s*null/);
  assert.match(source, /read-only|immutable/i);
});

test("Migration prompt requires explicit import or cancellation", () => {
  const file = join(process.cwd(), "components/migration/MigrationPrompt.tsx");
  assert.equal(existsSync(file), true);
  const source = readFileSync(file, "utf8");
  assert.match(source, /Import/);
  assert.match(source, /Cancel/);
  assert.match(source, /trackerApi\.migrate/);
  assert.match(source, /localStorage/);
});
