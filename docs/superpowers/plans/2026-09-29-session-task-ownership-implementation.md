# Learning-session task ownership: implementation plan

> **For the implementing agent:** Read the [design spec](../specs/2026-09-29-session-task-ownership-design.md). This is a database security fix. A source-text assertion is not a substitute for a direct two-account RLS test. Do not run the repair on production without a backup and a recorded pre-migration mismatch count.

**Goal:** Prevent an authenticated user from linking their own learning session to another user's task through direct Supabase UPDATE.
**Architecture:** Replace the `learning_sessions` UPDATE RLS policy with the same nullable-task ownership check used by INSERT, and clear any historically invalid links without deleting sessions.
**Tech stack:** Supabase PostgreSQL, RLS, SQL migrations, direct authenticated database tests.
**Base audited:** YoutubeDoro `db6002b9361f6707deacbdf62ca946eb97400f5b`.

**Execution status (2026-09-29):** the migration was implemented on the provider PR branch and applied to a disposable PostgreSQL 17 database with two simulated authenticated JWT subjects. Local RLS checks passed. No target-project migration or backup was performed.

## Task 0: Inspect current schema and establish a safe database

- [x] Work in `codex/session-task-ownership` or combine this migration with the provider branch after reviewing both diffs. Confirm `supabase/migrations/20260828000000_learning_tracker.sql` still defines the INSERT and UPDATE policies exactly as in the spec, and that no later migration already replaced the UPDATE policy.
- [x] Start a disposable local Supabase/PostgreSQL environment with the repository's migrations applied in filename order. If one is unavailable, write the migration but leave the direct RLS test and release gate explicitly unverified. Never call an unconfigured test a pass.
- [ ] In a target existing database, run this read-only preflight through an operator role, record the count only, and take a restorable backup before any production execution:

```sql
select count(*) as cross_owner_links
from public.learning_sessions as ls
join public.tasks as t on t.id = ls.task_id
where ls.user_id <> t.user_id;
```

## Task 1: Write a failing direct-RLS test

- [x] Create a database integration test under `tests/` using two real test users/JWT subjects A and B in the disposable project. Insert A's and B's tasks and sessions through allowed auth clients. Attempt to update A's session `task_id` to B's task UUID **directly through Supabase**, bypassing `app/api/tracker/sessions/[id]/route.ts`. On the audited policy this is expected to succeed if B's UUID is known; record the red result without keeping a cross-owner row in shared test data.
- [x] Add the symmetric B-to-A case, A-to-A relink, A-to-null unlink, and A trying to update B's session. Assert the persisted row values after each attempt, not only response status. Keep existing route-level owner checks intact.

## Task 2: Add the migration and retest

**Create:** `supabase/migrations/20260929010000_learning_session_task_owner_update.sql`.

- [x] Add the exact `UPDATE ... FROM tasks` repair and `DROP POLICY`/`CREATE POLICY` statements from the spec. Preserve `task_title_snapshot` and all session timing fields; the repair changes only `task_id` and `updated_at` for invalid links. Do not remove the INSERT policy or alter table grants.
- [x] Apply the migration to the disposable database. Repeat the direct-RLS tests: foreign-task links must fail, own-task and null links must succeed, and no foreign user's session may be modified. Insert an intentionally cross-owner test row with an elevated test role before migration in a fresh disposable database and verify migration clears its link but keeps its session record.
- [x] Verify the post-migration cross-owner count query returns zero. Check the policy definition in `pg_policies` and ensure `with_check` contains both same-session owner and same-task owner conditions.

## Task 3: Run repository gates and release safely

- [x] Run `npm test`, `npm run typecheck`, `npm run lint`, `npm run build`, and `git diff --check`. Expected: every command exits 0; at the audited base there were 187 unit tests before new tests. If the DB integration test is separate from `npm test`, run and report it separately.
- [ ] In the target project, record the preflight count and backup reference, apply migration `20260929010000` after `20260929000000`, and record the postflight count. Verify A/B direct Supabase updates under normal authenticated clients. Do not use the service-role client for the acceptance test; it bypasses the policy under test.
- [ ] If deployment must be rolled back, first disable or revert code relying on the new policy only if any exists (none is planned). Reverting the policy reopens the direct-update gap; prefer a forward fix. The historical invalid links cleared by migration are not recoverable as valid same-owner links and should not be restored without review.

## Completed local verification

- The migration repaired one synthetic cross-owner reference by setting `task_id` to null. The `learning_sessions` row and `task_title_snapshot` remained.
- As authenticated user A, linking to A's task and clearing the task link succeeded. Linking the same session to user B's task failed the UPDATE `WITH CHECK` policy. The owner-scoped aggregate returned no B rows to A.
- User B saw only B's own aggregate row. The `anon` database role could not execute `task_session_summaries()`.
- Repository tests, typecheck, lint, build, and whitespace checks are recorded in the tracker summary plan. Target-project preflight and a restorable backup remain required before production application.
