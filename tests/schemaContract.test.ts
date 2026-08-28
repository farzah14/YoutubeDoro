import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const migration = readFileSync(join(process.cwd(), "supabase/migrations/20260828000000_learning_tracker.sql"), "utf8");

test("schema defines owned tracker tables and safe time types", () => {
  for (const token of [
    "auth.users",
    "create table public.tasks",
    "create table public.subtasks",
    "create table public.learning_sessions",
    "create table public.migration_runs",
    "timestamptz",
    "on delete cascade",
    "enable row level security",
    "auth.uid()",
    "break_count integer",
    "unique (user_id, source, source_key)",
  ]) {
    assert.equal(migration.toLowerCase().includes(token.toLowerCase()), true, `missing ${token}`);
  }
  assert.match(migration, /break_count\s+integer[\s\S]*?default\s+0[\s\S]*?check/i);
  assert.doesNotMatch(migration.toLowerCase(), /timestamp without time zone|\bserial\b|supabase_service_role_key/);
});
