import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const trackerApiSource = readFileSync(join(process.cwd(), "lib/trackerApi.ts"), "utf8");
const routeFiles = [
  "app/api/tracker/tasks/route.ts",
  "app/api/tracker/tasks/[id]/route.ts",
  "app/api/tracker/tasks/[id]/subtasks/route.ts",
  "app/api/tracker/subtasks/[id]/route.ts",
  "app/api/tracker/sessions/route.ts",
  "app/api/tracker/sessions/[id]/route.ts",
  "app/api/tracker/sessions/recover/route.ts",
  "app/api/tracker/migration/route.ts",
].map((file) => join(process.cwd(), file));

test("tracker routes enforce auth, validation, and safe ownership", () => {
  const sources = routeFiles.map((file) => {
    assert.equal(existsSync(file), true, `missing ${file}`);
    return readFileSync(file, "utf8");
  });
  for (const source of sources) {
    assert.equal(source.includes("getAuthenticatedUser"), true);
    assert.match(source, /401/);
    assert.match(source, /safeParse|parse/);
    assert.equal(source.includes("SUPABASE_SERVICE_ROLE_KEY"), false);
    assert.equal(source.includes("body.user_id"), false);
  }

  const sessions = sources.filter((source) => source.includes("learning_sessions")).join("\n");
  assert.match(sessions, /checkpoint|learningSeconds/);
  assert.match(sessions, /finaliz|ended_at|endedAt/);
});

test("tracker client explains an uninstalled Supabase schema", () => {
  assert.match(trackerApiSource, /PGRST205/);
  assert.match(trackerApiSource, /supabase\/migrations\/20260828000000_learning_tracker\.sql/);
  assert.match(trackerApiSource, /Supabase SQL Editor/);
});
