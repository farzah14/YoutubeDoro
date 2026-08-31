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

test("Delete session uses the same vermilion action color as Sign out", () => {
  const source = readFileSync(join(process.cwd(), "components/history/HistoryPanel.tsx"), "utf8");
  const styles = readFileSync(join(process.cwd(), "app/globals.css"), "utf8");
  assert.match(source, /history-row__delete-session/);
  assert.match(styles, /\.settings-account__actions \.settings-account__sign-out,\s*\.history-row__actions \.history-row__delete-session\s*\{[\s\S]*background:\s*var\(--manga-vermilion\)/);
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

test("History is a grouped, collapsible study logbook", () => {
  const source = readFileSync(join(process.cwd(), "components/history/HistoryPanel.tsx"), "utf8");
  for (const token of ["history-day", "history-day__heading", "history-row__summary",
    "aria-expanded", "history-row__editor", "hasFilters", "history-retry"]) {
    assert.match(source, new RegExp(token), `missing ${token}`);
  }
  assert.match(source, /Completed or stopped focus sessions will appear here\./);
  assert.match(source, /onClick=\{\(\) => \{ void reload\(\); \}\}/);
});
