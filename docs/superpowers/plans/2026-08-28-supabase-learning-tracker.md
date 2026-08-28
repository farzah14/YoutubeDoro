# Supabase Learning Tracker Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace YoutubeDoro’s Notion/local-storage learning tracker with a sign-in-gated, online-only Supabase tracker that records account-owned tasks, subtasks, per-session timing, one generic Break, session notes, browser migration, and History.

**Architecture:** Keep the existing Next.js App Router and anime workspace. Use Supabase Auth with cookie-based SSR clients, authenticated Next.js route handlers, and PostgreSQL Row Level Security. Keep presentation preferences in local storage, but move tracker reads and writes behind typed account-scoped APIs. Use deterministic browser source keys and a migration-runs table for a one-time merge-safe import.

**Tech Stack:** Next.js 16.1.1, React 19, strict TypeScript, Supabase Auth, @supabase/ssr, @supabase/supabase-js, PostgreSQL SQL migrations, Zod validation, Node 24 node:test, and the existing CSS/UI primitives.

---

## Current repository facts

- components/YouTubeRestTimer.tsx is the current orchestration point.
- Tasks/subtasks are currently stored by day through hooks/useTasks.ts and lib/storage.ts.
- Daily learning totals, break totals, and notes are currently browser-local.
- Focus timing is implemented by lib/focusTimerEngine.ts, hooks/useFocusTimer.ts, and components/timer/LearningCard.tsx.
- Rest timing is implemented by components/timer/RestCardContainer.tsx and the rest-card children.
- Current focus preferences still expose shortBreakMinutes and longBreakMinutes; the implementation must replace both with one breakMinutes value.
- Notion code is in app/api/notion/*, components/notion/*, hooks/useNotionSync.ts, lib/notion.ts, types/index.ts, lib/constants.ts, and package.json.
- Existing tests use Node’s TypeScript stripping. The verified local command is:

~~~powershell
$testFiles = Get-ChildItem -Path tests -Filter *.test.ts | Select-Object -ExpandProperty FullName
node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON --experimental-strip-types --test $testFiles
~~~

- Runtime is Node v24.18.1 and npm 11.17.0.
- Preserve the pre-existing deleted scratch file, screenshots, generated .playwright-mcp directory, and untracked theme assets. Never stage them for this feature.

## File map

### Create

- .env.example
- proxy.ts
- supabase/migrations/20260828000000_learning_tracker.sql
- types/tracker.ts
- lib/supabase/client.ts
- lib/supabase/server.ts
- lib/supabase/auth.ts
- lib/trackerValidation.ts
- lib/trackerModel.ts
- lib/duration.ts
- lib/browserMigration.ts
- lib/trackerApi.ts
- hooks/useCloudTasks.ts
- hooks/useSessionRecorder.ts
- hooks/useSessionHistory.ts
- components/auth/AuthScreen.tsx
- app/auth/callback/route.ts
- app/auth/reset-password/page.tsx
- app/api/tracker/tasks/route.ts
- app/api/tracker/tasks/[id]/route.ts
- app/api/tracker/tasks/[id]/subtasks/route.ts
- app/api/tracker/subtasks/[id]/route.ts
- app/api/tracker/sessions/route.ts
- app/api/tracker/sessions/[id]/route.ts
- app/api/tracker/sessions/recover/route.ts
- app/api/tracker/migration/route.ts
- components/history/HistoryPanel.tsx
- components/migration/MigrationPrompt.tsx
- components/session/SessionNoteEditor.tsx
- tests/duration.test.ts
- tests/sessionModel.test.ts
- tests/schemaContract.test.ts
- tests/authSurface.test.ts
- tests/trackerApiContract.test.ts
- tests/browserMigration.test.ts
- tests/historyPanel.test.ts
- tests/notionRemoval.test.ts

### Modify

- package.json
- package-lock.json
- README.md
- app/page.tsx
- app/globals.css
- components/YouTubeRestTimer.tsx
- components/layout/Header.tsx
- components/layout/WorkspaceDock.tsx
- components/timer/LearningCard.tsx
- components/timer/RestCardContainer.tsx
- components/timer/PlainRestCard.tsx
- components/timer/YouTubeRestCard.tsx
- components/settings/SettingsPanel.tsx
- components/tasks/TaskQueue.tsx
- components/stats/DailyStats.tsx
- components/stats/WeeklyHeatmap.tsx
- components/stats/StatsChart.tsx
- hooks/useFocusTimer.ts
- hooks/useTimer.ts
- lib/constants.ts
- lib/focusTimerEngine.ts
- lib/migrations.ts
- types/focus.ts
- types/index.ts
- types/workspace.ts
- tests/focusTimerEngine.test.ts
- tests/migrations.test.ts
- tests/subtaskPanel.test.ts
- tests/uiRedesign.test.ts
- tests/workspaceVisuals.test.ts

### Delete after callers are removed

- app/api/notion/pull/route.ts
- app/api/notion/status/route.ts
- app/api/notion/sync/route.ts
- app/api/notion/validate/route.ts
- components/notion/NotionSettingsModal.tsx
- components/notion/NotionSyncButton.tsx
- hooks/useNotionSync.ts
- lib/notion.ts
- components/notes/NotesPanel.tsx
- components/notes/NoteEntry.tsx
- components/notes/MarkdownScratchpad.tsx
- hooks/useDailyNotes.ts

## Task 1: Add Supabase packages, environment contract, and test command

**Files:** Modify package.json, package-lock.json, README.md; create .env.example.

- [ ] Step 1: Record the baseline without staging unrelated files.

Run:

~~~powershell
git status --short
npm run lint
$testFiles = Get-ChildItem -Path tests -Filter *.test.ts | Select-Object -ExpandProperty FullName
node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON --experimental-strip-types --test $testFiles
~~~

Expected: the known deleted scratch file and untracked artifacts remain visible; baseline commands report their current state.

- [ ] Step 2: Add packages and scripts.

Run:

~~~powershell
npm install @supabase/ssr @supabase/supabase-js zod
~~~

Set package.json scripts to include:

~~~json
"lint": "eslint",
"typecheck": "tsc --noEmit",
"test": "node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON --experimental-strip-types --test tests"
~~~

Run npm run typecheck. Expected: the script exists and any failures identify implementation work rather than a missing compiler command.

- [ ] Step 3: Create .env.example with only these non-secret values.

~~~dotenv
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_your-key
NEXT_PUBLIC_SITE_URL=http://127.0.0.1:3000
~~~

Do not add a service-role key.

- [ ] Step 4: Replace generated README text with setup instructions for copying .env.example to .env.local, applying the SQL migration, disabling email confirmation, enabling Google, configuring /auth/callback, and running npm test, npm run typecheck, npm run lint, and npm run build.

- [ ] Step 5: Review git diff and confirm only package/config/documentation files from this task are changed.

## Task 2: Add tracker types, pure models, duration formatting, and SQL schema

**Files:** Create types/tracker.ts, lib/trackerModel.ts, lib/duration.ts, supabase/migrations/20260828000000_learning_tracker.sql, tests/duration.test.ts, tests/sessionModel.test.ts, tests/schemaContract.test.ts; modify types/index.ts.

- [ ] Step 1: Write tests/duration.test.ts before the formatter.

~~~ts
import assert from "node:assert/strict";
import test from "node:test";
import { formatDuration } from "../lib/duration.ts";

test("formats hours and minutes with correct grammar", () => {
  assert.equal(formatDuration(60), "1 minute");
  assert.equal(formatDuration(3600), "1 hour");
  assert.equal(formatDuration(5400), "1 hour 30 minutes");
  assert.equal(formatDuration(7200), "2 hours");
});

test("uses seconds below one minute and clamps invalid input", () => {
  assert.equal(formatDuration(45), "45 seconds");
  assert.equal(formatDuration(0), "0 minutes");
  assert.equal(formatDuration(-1), "0 minutes");
  assert.equal(formatDuration(Number.NaN), "0 minutes");
});
~~~

Run the focused test. Expected: FAIL because lib/duration.ts is absent.

- [ ] Step 2: Implement formatDuration(totalSeconds: number). Floor nonnegative input, show seconds below 60, omit zero hour/minute units, and use singular/plural grammar. Run the focused test and expect 2 passing tests.

- [ ] Step 3: Write tests/sessionModel.test.ts for deriveTaskProgress and normalizeSessionPatch. The expected behaviors are 1,800 seconds over a 60-minute estimate equals 50 percent; over-target progress is 100; negative/invalid measurements clamp to zero; pausedSeconds is not included in the normalized payload. Run it and verify failure because lib/trackerModel.ts is absent.

- [ ] Step 4: Implement types/tracker.ts with SessionStatus = active | completed | stopped | interrupted | legacy, LearningSession with nullable breakCount, TrackerTask, SessionFilters, and MigrationSummary. Export the types from types/index.ts without adding Notion types. Implement deriveTaskProgress and normalizeSessionPatch, plus snake_case-to-camelCase row mappers, in lib/trackerModel.ts. Run the focused model tests and expect green.

- [ ] Step 5: Write tests/schemaContract.test.ts to read the SQL file and require auth.users, tasks, subtasks, learning_sessions, migration_runs, timestamptz, ON DELETE CASCADE, ENABLE ROW LEVEL SECURITY, auth.uid(), nullable break_count, and a unique migration key. Also reject timestamp without time zone, serial, and service-role secrets. Run it and verify failure because the SQL file is absent.

- [ ] Step 6: Create the SQL migration with tasks, subtasks, learning_sessions, and migration_runs. Use uuid keys with gen_random_uuid, user_id references to auth.users with ON DELETE CASCADE, text with nonblank checks, integer seconds with nonnegative checks, nullable break_count for unknown legacy data, status checks, indexes on user/order and user/timestamps, and owner policies for authenticated users. Use a unique (user_id, source_key) constraint for tasks and sessions and unique (user_id, source, source_key) for migration_runs. Do not grant tracker access to anon.

- [ ] Step 7: Run npm test and verify the new model/schema tests and all existing tests pass.

## Task 3: Add authenticated Supabase clients, auth routes, and gating

**Files:** Create lib/supabase/client.ts, lib/supabase/server.ts, lib/supabase/auth.ts, proxy.ts, components/auth/AuthScreen.tsx, app/auth/callback/route.ts, app/auth/reset-password/page.tsx, tests/authSurface.test.ts; modify app/page.tsx.

- [ ] Step 1: Write tests/authSurface.test.ts to require the auth files and source tokens createBrowserClient, createServerClient, signInWithOAuth, signInWithPassword, signUp, resetPasswordForEmail, exchangeCodeForSession, signOut, and /auth/callback. Assert there is no verifyOtp or mandatory email-verification copy. Run it and verify the expected missing-file failure.

- [ ] Step 2: Implement the browser client using the two NEXT_PUBLIC values. Implement the server client with createServerClient and async cookie getAll/setAll adapters. Implement getAuthenticatedUser using supabase.auth.getUser. Never read or expose a service-role key.

- [ ] Step 3: Implement proxy.ts to refresh cookie sessions using the server client and exclude _next/static, _next/image, favicon, and static public assets from its matcher.

- [ ] Step 4: Implement app/auth/callback/route.ts. Exchange a code for a session, allow only safe internal next paths, redirect success to /, and redirect errors to /auth?error=oauth.

- [ ] Step 5: Implement AuthScreen with Google OAuth, email sign-in/sign-up toggle, immediate sign-up success without verification instructions, forgot-password action, accessible labels, disabled submit states, and visible error states.

- [ ] Step 6: Implement reset-password/page.tsx with updateUser({ password }), success feedback, and a link back to /. Modify app/page.tsx to call getAuthenticatedUser server-side and render AuthScreen for no user or YouTubeRestTimer for a user. Do not request tracker data from the auth surface.

- [ ] Step 7: Run the auth contract test and npm run typecheck. Treat live OAuth as unverified until valid Supabase configuration exists.

## Task 4: Implement ownership-scoped tracker APIs

**Files:** Create lib/trackerValidation.ts, lib/trackerApi.ts, app/api/tracker/tasks/route.ts, app/api/tracker/tasks/[id]/route.ts, app/api/tracker/tasks/[id]/subtasks/route.ts, app/api/tracker/subtasks/[id]/route.ts, app/api/tracker/sessions/route.ts, app/api/tracker/sessions/[id]/route.ts, app/api/tracker/sessions/recover/route.ts, tests/trackerApiContract.test.ts.

- [ ] Step 1: Write source-contract tests requiring every route to call getAuthenticatedUser, return 401 without a user, validate input with Zod, and never use SUPABASE_SERVICE_ROLE_KEY. Require checkpoint/finalization handling in session updates. Run and verify missing-route failure.

- [ ] Step 2: Implement validators for trimmed titles, task estimates 5–480, valid hex colors, nonnegative ordering/seconds, the five timer modes, allowed status transitions, safe UUIDs, ISO date filters, and History limits 1–100. Implement TrackerApiError and typed fetch helpers that reject non-2xx responses.

- [ ] Step 3: Implement task routes. GET returns account tasks with nested subtasks and session-derived focus progress. POST inserts a task with the authenticated user ID. PATCH allows only task metadata. DELETE counts owned linked sessions for UI feedback and deletes the owned task so the database cascade removes subtasks/sessions. Return 400, 401, 404, 409, or 500 with consistent JSON shapes.

- [ ] Step 4: Implement subtask routes. Verify the parent task is owned before insert/update/delete. Preserve order and completion fields. Never accept a caller-supplied user_id.

- [ ] Step 5: Implement session routes. GET applies owned date/task filters and orders newest first. POST validates the optional owned task, creates active with breakCount 0, and returns the session. PATCH permits checkpoint fields only while active, finalization to completed/stopped/interrupted, and post-finalization title/task/note metadata only. Reject finalized timing changes with 409. DELETE removes only the owned row. Recover changes owned active rows to interrupted using stored checkpoint values and now() as ended_at; it never estimates closed-browser time.

- [ ] Step 6: Run trackerApiContract.test.ts and npm run typecheck. Expected: contract/type checks pass without live credentials.

## Task 5: Build deterministic browser migration

**Files:** Create lib/browserMigration.ts, app/api/tracker/migration/route.ts, tests/browserMigration.test.ts.

- [ ] Step 1: Write fixture-based migration tests for old task/subtask keys, daily/topic learning totals, rest totals, activity notes, task notes, and unrelated theme/music/appearance keys. Require deterministic task/session source keys, legacy status, null breakCount, preserved known rest seconds, matched/unmatched note placement, and identical output for the same migration key. Run and verify the expected missing-module failure.

- [ ] Step 2: Implement BrowserStorageLike and getBrowserMigrationKey. Persist ytdoro:cloud-migration-key; use crypto.randomUUID when available and a Date.now/random fallback otherwise. Export only tracker data. Keep source keys composed of the migration key plus original day/local ID; do not title-match tasks.

- [ ] Step 3: Convert old day/topic aggregates to legacy sessions with titles such as Legacy summary · 2026-08-28 · Python, status legacy, learningSeconds/rest seconds preserved, breakCount null, and imported note text. Attach matching old notes; give unmatched text a dated legacy entry. Ensure no fabricated session boundary or break count is emitted.

- [ ] Step 4: Implement POST /api/tracker/migration. Require the authenticated user, validate payload size/content, return the recorded summary for an already imported (user, browser-local, source_key), insert source-keyed tasks/subtasks/legacy sessions without overwriting cloud rows, and record migration_runs only after inserts succeed. Never read Notion values.

- [ ] Step 5: Run migration tests and npm run typecheck. Expected: pure normalization and route contract behavior pass.

## Task 6: Add cloud task/history hooks and session recorder

**Files:** Create hooks/useCloudTasks.ts, hooks/useSessionRecorder.ts, hooks/useSessionHistory.ts, tests/useCloudTasks.test.ts, tests/sessionRecorder.test.ts; modify lib/trackerApi.ts.

- [ ] Step 1: Write failing hook contracts requiring account-level loading, add/update/delete/reorder/subtask operations, no day-key or writeJSON persistence, and recorder methods start, checkpoint, breakStart, breakCheckpoint, breakEnd, finalize, updateMetadata, and recover. Run and verify missing-hook failure.

- [ ] Step 2: Implement useCloudTasks. Load /api/tracker/tasks once per authenticated mount, expose loading/error/reload, use existing taskModel operations in memory, await successful API responses before committing state, and clear the active task after a successful delete.

- [ ] Step 3: Implement useSessionRecorder. Create the server session before the visible focus timer starts. Keep the session ID and last saved measurements in refs. Checkpoint every 5 seconds and immediately on pause/break/finalization. Finalize exactly once. Surface save failures and keep the last client values available for retry. Never include paused seconds.

- [ ] Step 4: Implement useSessionHistory with optional from/to/taskId filters, abort-on-unmount behavior, reload, distinct loading/empty/error state, and typed session results.

- [ ] Step 5: Run both hook contract tests and npm run typecheck.

## Task 7: Collapse timer phases to one generic Break

**Files:** Modify types/focus.ts, lib/focusTimerEngine.ts, hooks/useFocusTimer.ts, hooks/useTimer.ts, lib/migrations.ts, lib/constants.ts, components/timer/LearningCard.tsx, components/timer/RestCardContainer.tsx, components/timer/PlainRestCard.tsx, components/timer/YouTubeRestCard.tsx, components/settings/SettingsPanel.tsx, components/tasks/TaskQueue.tsx, tests/focusTimerEngine.test.ts, tests/migrations.test.ts, tests/workspaceVisuals.test.ts.

- [ ] Step 1: Change timer tests first so TimerPhase is focus | break, every regular mode enters break, one breakMinutes controls the generic phase, and no UI test expects Short Break or Long Break. Run and verify failure against the old engine.

- [ ] Step 2: Change FocusPreferences to breakMinutes. Update phaseSeconds, advanceTimer, selectTimerPhase, settings migration, and all controls. Preserve fixed 52/17 behavior only for that mode’s fixed break. Remove shortBreakMinutes and longBreakMinutes writes; legacy preferences read short first then long and emit breakMinutes.

- [ ] Step 3: Add onFocusStart and onBreakStart callback boundaries to useFocusTimer. Invoke them once per explicit transition. Keep actual focus/break done/stop seconds. Update rest cards so generic and YouTube breaks share the same break callbacks.

- [ ] Step 4: Run timer and migration tests. Expected: all tests pass and source contains no Short Break/Long Break labels or old preference writes.

## Task 8: Integrate cloud state into the workspace

**Files:** Modify components/YouTubeRestTimer.tsx, components/timer/LearningCard.tsx, components/stats/DailyStats.tsx, components/stats/WeeklyHeatmap.tsx, components/stats/StatsChart.tsx, components/layout/Header.tsx, types/workspace.ts, tests/uiRedesign.test.ts, tests/workspaceVisuals.test.ts; create components/session/SessionNoteEditor.tsx.

- [ ] Step 1: Extend UI tests to require useCloudTasks, useSessionRecorder, useSessionHistory, session IDs, SessionNoteEditor, and cloud-derived stats; reject learning/break readNumber/writeNumber and useDailyNotes in the root. Run and verify failure.

- [ ] Step 2: Replace topic/day task identity with account tasks. Resolve the current task title or Untitled learning session. Preserve the task panel’s existing checklist controls.

- [ ] Step 3: Wire focus start to recorder.start and start the visible timer only after the server returns a session. Checkpoint active seconds, flush on pause, and finalize on stop/completion. Reload History/stats after finalization.

- [ ] Step 4: Wire explicit Break start/end and YouTube rest to the current session. If no focus session exists, show an error and do not create a detached global break record.

- [ ] Step 5: Implement SessionNoteEditor with raw Markdown, character count, debounced active-session save, blur flush, read-only timing context, and post-session editing.

- [ ] Step 6: Make DailyStats, WeeklyHeatmap, and StatsChart consume session-derived records. Include completed/stopped session focus in totals, preserve legacy durations, and exclude legacy rows from completed-session counts.

- [ ] Step 7: On authenticated mount call recorder.recover. Show a dismissible interrupted-session notice with last saved duration. Run focused UI tests and npm run typecheck.

## Task 9: Add History and migration UI

**Files:** Create components/history/HistoryPanel.tsx, components/migration/MigrationPrompt.tsx, tests/historyPanel.test.ts; modify components/layout/WorkspaceDock.tsx, components/YouTubeRestTimer.tsx, app/globals.css, types/workspace.ts.

- [ ] Step 1: Write failing source tests requiring account-wide History, date/task filters, formatDuration, unknown legacy break counts, editable title/task/note, read-only timing values, confirmation before session deletion, and Import/Cancel migration actions. Run and verify failure.

- [ ] Step 2: Implement HistoryPanel with newest-first rows showing local date/time, title, task snapshot, status, timer mode, learning duration, break duration/count, and note availability. Distinguish loading, empty, error, and loaded states. Metadata edits call the API; finalized timing fields render as text. Delete uses confirmation.

- [ ] Step 3: Implement MigrationPrompt. Preview counts, require Import, call the migration route, mark completion only after success, leave local storage untouched, and keep a cancellation marker for the current browser migration key.

- [ ] Step 4: Replace the notes workspace panel with History navigation and modal title. Add responsive styles using existing atelier/overlay/no-scrollbar primitives; do not add a UI library.

- [ ] Step 5: Run History tests, npm run typecheck, and inspect mobile/desktop source states.

## Task 10: Remove Notion and obsolete local note surfaces

**Files:** Delete all Notion routes/components/hook/helper listed in the file map; delete old NotesPanel, NoteEntry, MarkdownScratchpad, and useDailyNotes after callers are removed; modify types/index.ts, lib/constants.ts, SettingsPanel.tsx, YouTubeRestTimer.tsx, package.json, package-lock.json, README.md; create tests/notionRemoval.test.ts.

- [ ] Step 1: Write the failing removal test. Scan only app/api, components, hooks, lib, types, package.json, and README.md. Reject notion, NOTION_, @notionhq/client, useNotionSync, NotionSettingsModal, and NotionSyncButton. Exclude the approved design/plan documents.

- [ ] Step 2: Run the removal test and verify it fails with current references.

- [ ] Step 3: Delete Notion routes, UI, hook, helper, types/constants, root callbacks, settings section, and sync payload code. Delete obsolete local note UI after SessionNoteEditor/History callers are live. Keep legacy parsing only in browserMigration.ts.

- [ ] Step 4: Run npm uninstall @notionhq/client, remove stale README/environment references, and ensure .env.example contains only Supabase values.

- [ ] Step 5: Run the removal test and:
~~~powershell
rg -n -i 'notion|NOTION_|@notionhq/client|useNotionSync|NotionSettingsModal|NotionSyncButton' app components hooks lib types package.json README.md
~~~
Expected: no runtime/config matches. Intentional references in the approved design/plan documents are excluded.

## Task 11: Complete account actions and update regressions

**Files:** Modify components/layout/Header.tsx, components/YouTubeRestTimer.tsx, tests/subtaskPanel.test.ts, tests/uiRedesign.test.ts, tests/workspaceVisuals.test.ts; replace tests/useTasks.test.ts with cloud-hook assertions.

- [ ] Step 1: Add signed-in email/provider display and a Sign out action using supabase.auth.signOut, followed by navigation/refresh to /. Never put tokens in local storage or rendered HTML.

- [ ] Step 2: Replace regression expectations for daily local tasks, task notes, old break phases, Notes, and Notion with account tasks, session-specific notes, generic break, History, and Supabase-backed hooks.

- [ ] Step 3: Run npm test. Expected: every existing and new pure/source-contract test passes.

## Task 12: Final verification

**Files:** Modify README.md only if a verified setup instruction is inaccurate.

- [ ] Step 1: Run all local gates:
~~~powershell
npm test
npm run typecheck
npm run lint
npm run build
~~~
Expected: all pass.

- [ ] Step 2: Search for stale local tracker writes and old break names:
~~~powershell
rg -n -i 'notion|NOTION_|@notionhq/client|useNotionSync|shortBreakMinutes|longBreakMinutes|tasksByDay|learnByDay|restByDay|taskNotesByDay' app components hooks lib types package.json README.md
~~~
Expected: no runtime matches except deliberate legacy-key parsing in browserMigration.ts and migration tests.

- [ ] Step 3: With valid user-provided Supabase values, run npm run dev and verify unauthenticated auth UI, email sign-up without verification, sign-in/sign-out, password reset, Google callback wiring, migration prompt/import, task/subtask persistence, generic Break accounting, session note save, History formatting, interruption recovery, immutable timing fields, and cascade deletion. Do not claim live auth/database success without valid configuration.

- [ ] Step 4: Run git diff --check, git status --short, and git diff --stat. Confirm unrelated screenshots, generated artifacts, theme assets, and deleted scratch file are preserved and unstaged.

- [ ] Step 5: Commit only focused feature changes after green gates, using:
~~~text
feat: add supabase tracker schema and types
feat: add authenticated access and tracker APIs
feat: migrate timer and tasks to cloud sessions
feat: add session history and browser migration
refactor: remove notion tracker integration
test: verify cloud learning tracker behavior
~~~

## Plan self-review

- Every approved decision maps to a task: Supabase, required sign-in, Google/email auth, no verification, password reset, online-only behavior, browser-only migration, merge without overwrite, local backup, legacy unknown break count, persistent tasks, task-owned subtasks, session notes, one generic Break, pause/close behavior, account-wide History, duration formatting, cascade deletion, and complete Notion removal.
- No step introduces a timestamp without timezone, serial, frontend service-role key, fabricated legacy break count, or offline queue.
- Finalized timing is immutable while metadata remains editable.
- Task deletion intentionally cascades sessions because that was explicitly selected.
- Live provider verification is separated from local tests, lint, typecheck, and build.
