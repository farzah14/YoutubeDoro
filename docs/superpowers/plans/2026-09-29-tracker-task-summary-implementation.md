# Tracker task summaries and integration byte guard: implementation plan

> **For the implementing agent:** Read the design spec and audit first. Work in a real YoutubeDoro Git branch. Write failing tests before changing the route or migration. Execute every verification command and record failures; do not infer production RLS behavior from mocked tests.

**Goal:** Return complete task/subtask lists and exact focus totals beyond Supabase's default 1,000-row response cap; enforce the advertised 512 KiB integration-plan limit in UTF-8 bytes.
**Architecture:** PostgreSQL aggregates session counts under the caller's RLS identity. The task route pages tasks, courses, subtasks, and summary rows with stable ordering. A separate small plan-route change counts bytes before decoding JSON.
**Tech stack:** Next.js 16 route handlers, Supabase JS 2, PostgreSQL/RLS, TypeScript, Node `node:test` through `tsx`.
**Design:** [2026-09-29-tracker-task-summary-design.md](../specs/2026-09-29-tracker-task-summary-design.md).
**Base audited:** YoutubeDoro `db6002b9361f6707deacbdf62ca946eb97400f5b`.

**Execution status (2026-09-29):** implemented on the companion provider PR branch. Regression tests, repository gates, and disposable PostgreSQL/RLS checks passed. Target Supabase migration and deployment remain unchecked release steps.

## Task 0: Baseline and branch

- [x] Create `codex/tracker-task-summary` from the audited commit or inspect/rebase if main advanced. Run `npm ci`, `npm test`, `npm run typecheck`, and `npm run lint`. Expected at the audited base: 187 tests pass and each command exits 0.
- [x] Read `app/api/tracker/tasks/route.ts`, `lib/trackerModel.ts`, `lib/supabase/server.ts`, `supabase/migrations/20260828000000_learning_tracker.sql`, the most recent Synapse migration, `tests/trackerApiContract.test.ts`, and `package.json`. Confirm there is no newer aggregate or changed row cap. Do not add a service-role client to the tracker route.

## Task 1: Add failing pagination and aggregation tests

**Create:** `tests/trackerTaskRead.test.ts`. **Planned module under test:** `lib/trackerTaskRead.ts`.

- [x] Define a fake page source that records requested inclusive ranges, returns an exact total count, and returns a slice of a fixed array, optionally with an error on a chosen page. Write tests for 0, 499, 500, 501, 1,000, and 1,001 rows at `PAGE_SIZE=500`. The first exact count tells the helper when to stop, so exactly 500 and 1,000 rows need no empty final query. Assert concatenated rows are complete and in order, and no requested range is wider than 500.
- [x] Simulate a project API cap of 100 rows despite a requested 500-row range. For 1,001 rows, expect range starts 0, 100, 200, … and all rows returned. This catches a false stop on a short page. Missing/invalid exact count, duplicate row ID, or a changed count must fail or trigger one full retry; never return a partial 200.
- [x] Write an error-path test: page 1 succeeds, page 2 returns an error or null data. Expect the page helper to throw; it must not return the first page as a successful partial list.
- [x] Add a 5,000-session synthetic fixture to test the aggregation contract without a live DB. Compare the expected sum and counts with a fake *aggregated* RPC row: 5,000 linked, correct completed count, and exact `focusedSeconds`. Assert the task reader never queries `.from('learning_sessions')` raw rows. Use fake task IDs and summary rows. The fake should enforce a 1,000-row ceiling to catch accidental unpaged reads.
- [x] Add tests for 51 task IDs to assert two subtask query batches, for 1,001 subtasks to assert every child is retained under its parent, and for 1,001 summary rows to assert RPC pagination. Include a duplicate summary ID, malformed bigint, a value above `Number.MAX_SAFE_INTEGER`, and a malformed or negative metric for an inactive task summary; each must raise an error.
- [x] If testing the route with a fake Supabase client requires awkward module mocking, extract the route's read work into an injectable `readTrackerTasks(supabase, userId)` and test that directly. Keep the handler itself thin and preserve its 401/500 response tests or add a direct handler test using dependency injection. Source-text assertions alone are insufficient.
- [x] Run `npx tsx --test tests/trackerTaskRead.test.ts`. Expected **red** until the reader is implemented. Do not weaken the >1,000-row assertions.

## Task 2: Add the owner-scoped aggregate function

**Create:** `supabase/migrations/20260929000000_tracker_task_session_summaries.sql` with the exact SQL in the design spec.

- [x] Create `public.task_session_summaries()` as `LANGUAGE sql STABLE SECURITY INVOKER`, returning `task_id uuid`, `focused_seconds bigint`, `completed_sessions bigint`, and `linked_session_count bigint`. Filter `public.learning_sessions` by `(select auth.uid())` and `task_id IS NOT NULL`; group by `ls.task_id`. Use `sum(learning_seconds)`, a filtered completed count, and total count. Do not aggregate by task title, status alone, or client-supplied user ID.
- [x] Set `search_path = pg_catalog, public`; revoke execute from `public, anon`; grant execute to `authenticated`. Do not use `SECURITY DEFINER` or a service-role RPC. Keep the migration additive with no table rewrite or data deletion.
- [x] If local Supabase/PostgreSQL is available, apply migrations in filename order to a disposable database and test two distinct authenticated users: each RPC call returns only that user's task metrics, while anon cannot execute it. If no local DB is configured, record this as an unverified release gate and do not claim RLS was exercised.

## Task 3: Implement a complete paged task reader

**Create:** `lib/trackerTaskRead.ts`. **Edit:** `app/api/tracker/tasks/route.ts`.

- [x] Export `PAGE_SIZE=500` and `TASK_ID_BATCH_SIZE=50` from the reader. Implement one `fetchAllPages<T>(queryPage)` helper: for each range, construct a **fresh query** for `.range(from,from+499)`. Obtain `{count:'exact'}` on the first filtered select/RPC call; reject null or invalid count. Throw on `error` or null `data`. Append returned rows, advance `from` by `data.length`, and stop only when the accumulated length equals the exact count. A short page can mean a configured API cap below 500. Reject an empty page before the count, duplicate unique IDs, or inconsistent count. Include a unique final tie-break ordering in every query.
- [x] Page active tasks with `.eq('user_id', userId).eq('synapse_active', true)` and `.order('task_order').order('created_at').order('id')`. Page active courses with `.eq('user_id', userId).eq('active', true).order('course_order').order('source_key')`.
- [x] If there are zero task rows, return `{synapseCourses, tasks:[]}` without subtask/RPC calls. Otherwise split returned task UUIDs into 50-ID slices. For each slice, page `.from('subtasks').select('*').in('task_id',slice).order('task_id').order('subtask_order').order('id')`. Map with `mapSubtaskRow` and collect by task ID. Fail if a returned subtask's task ID is not in the slice, rather than attaching it to an unrelated task.
- [x] Page `supabase.rpc('task_session_summaries', {}, {count:'exact'})` ordered by `task_id`, with `.range` through the same page helper. Do not apply a 50-ID `.in` filter to this RPC unless a tested function signature supports it. Reject a null/duplicate `task_id` and validate every metric before filtering summaries to task IDs returned in the task query. A malformed row for an inactive or otherwise unreturned task must also fail. Reject metrics that are negative, nonnumeric, fractional, or exceed `Number.MAX_SAFE_INTEGER`. Supabase can decode bigint as a number or string; `Number(value)` plus `Number.isSafeInteger` handles both.
- [x] Map each task using `mapTaskRow(row, subtasks, seconds, completed, linked)` and zero defaults. Keep the JSON shape `{synapseCourses, tasks}` and existing course mapping exactly as before. In the GET handler, keep authentication/configuration checks; catch reader exceptions and return an error status (500) without serializing a partial list. Do not change POST task creation.
- [x] Run `npx tsx --test tests/trackerTaskRead.test.ts` and `npm run typecheck`. Expected **green**. Fix TypeScript errors by typing the helper and query callback; avoid `any` casts that bypass result validation.

## Task 4: Verify database math and API shape

- [x] Extend `tests/trackerTaskRead.test.ts` with a small mixed fixture: one task with completed, stopped, and active sessions; one task with none; one session with `task_id=null`; one inactive imported task. Expected: all statuses contribute to focus seconds and linked count; only completed status contributes to completed count; null/inactive task cases do not create extra response tasks.
- [x] Keep a route-level test for 401 unauthenticated and 500 missing Supabase configuration. Verify the successful JSON field names are unchanged with `tests/useCloudTasks.test.ts` and `tests/trackerApiContract.test.ts`.
- [x] If a disposable local DB exists, create 1,001 sessions for one task, run the RPC under its owner, and compare all three returned values with a direct owner-scoped SQL aggregate. Repeat with a second user to check isolation. Record the actual query outputs in the PR/test log, not user data or secrets.
- [x] Run `npx tsx --test tests/trackerTaskRead.test.ts tests/trackerApiContract.test.ts tests/useCloudTasks.test.ts`. Expected: all pass. If the exact runner invocation differs on current main, use the `npm test` script and document the adjustment.

## Task 5: Fix the integration plan's UTF-8 byte cap

**Edit:** `app/api/integrations/v1/plan/route.ts`. **Create or edit:** `tests/synapsePlan.test.ts` or a dedicated `tests/synapsePlanPayload.test.ts`.

- [x] Add a failing test that builds a JSON string containing at least 200,000 `界` characters. Verify `raw.length < 524288` while `new TextEncoder().encode(raw).byteLength > 524288`. A request without a `Content-Length` header must be rejected with status 413 and `{error:'payload_too_large'}` before Zod validation. Add the 524,288-byte inclusive and 524,289-byte exclusive boundaries, plus a deliberately understated header.
- [x] Keep the early numeric `Content-Length` rejection as an optimization, but make the authoritative test the actual received bytes. Replace `request.text()` with `request.arrayBuffer()`, reject when `byteLength>524288`, then decode with `new TextDecoder('utf-8',{fatal:true})` and parse JSON. Return 400 `invalid_request` for invalid UTF-8 or malformed JSON. Preserve authentication, content-type, cache-control, and existing success/error behavior.
- [x] Run the focused payload test and `tests/synapsePlan.test.ts`. Expected: the new byte-boundary tests and existing valid plan tests pass. Do not relax the provider's 512 KiB contract to accept a larger payload.

## Task 6: Documentation, verification, and release

- [x] Update `README.md` where the tracker and integration limits are described: task counts are complete beyond 1,000 sessions; the 512 KiB limit is UTF-8 bytes. Add the new migration to migration/setup guidance. No client API change should be advertised.
- [x] Run `npm test`, `npm run typecheck`, `npm run lint`, `npm run build`, and `git diff --check`. Expected: every command exits 0; at the audited base there were 187 tests before additions. Inspect the diff for accidental service-role access, leaked credentials, dropped RLS, or changed polling frequency.
- [ ] Release the migration **before** the route that calls the RPC. Confirm the function exists and authenticated execute/RLS work in the target environment. Deploy the provider route. Compare a >1,000-session owner's task response to an owner-scoped SQL aggregate. Verify an anonymous request is 401 and another user's data cannot enter the result.
- [ ] If rollback is needed, revert the route first. Leave the unused additive SQL function until a reviewed cleanup migration. Do not drop it before the deployed route stops calling it.

**Production gate:** This plan does not report a live Supabase result; the audited environment has no configured project credentials. A deploy or claim of production correctness requires the target-project RLS and large-history checks above.

## Completed local verification

- `npm test`: 199 tests passed. This includes exact pagination boundaries, a simulated 100-row API page cap, 1,001 active tasks and summary rows, 1,001 sub-tasks, 51-task-ID batching, malformed and duplicate summaries (including malformed metrics for an inactive task), and no-task short-circuit behavior.
- `npm run typecheck`, `npm run lint`, `npm run build`, and `git diff --check`: passed.
- Disposable PostgreSQL 17: applied both new migrations. The summary RPC returned exactly 12,502,500 focused seconds, 2,500 completed sessions, and 5,000 linked sessions for the synthetic 5,000-session task. A second authenticated identity saw only its own task summary. Anonymous execute was denied.
- Owner update policy: the historical cross-owner link was nulled while its session row and task-title snapshot remained. Same-owner relink and null unlink succeeded; linking to the other user's task failed with RLS.

These are local reproducible checks against synthetic data; they do not replace the target-project migration preflight, backup, or authenticated Supabase verification.
