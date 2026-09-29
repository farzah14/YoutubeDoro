# Cross-repository fixes: implementation plan

**Status:** implementation is complete on the `codex/tracker-integrity-fixes` PR branch. Target-project migration and deployment remain a separate release gate.
**Audited base:** YoutubeDoro `db6002b9361f6707deacbdf62ca946eb97400f5b`.
**Related repository:** [Synapse cross-repository audit](https://github.com/farzah14/Synapse/blob/codex/studyrythms-contract-fixes/docs/audits/2026-09-29-synapse-studyrythms-cross-repo-audit.md).

This file is the execution summary. The linked design specs and implementation plans retain the detailed contracts, query ordering, rejection cases, SQL, and release sequence for future maintainers and lower-capability coding models.

## Work package A — complete task lists and focus summaries

**Spec:** [tracker task-summary design](docs/superpowers/specs/2026-09-29-tracker-task-summary-design.md).
**Step-by-step plan:** [tracker implementation plan](docs/superpowers/plans/2026-09-29-tracker-task-summary-implementation.md).

- [x] Add `task_session_summaries()` as an owner-scoped `SECURITY INVOKER` RPC with execute permission limited to `authenticated`.
- [x] Page active tasks, active courses, subtasks, and summary rows with exact counts and unique ordering. Use pages of 500 and subtask task-ID groups of 50. Advance by actual returned row count and reject failures, inconsistent counts, duplicate IDs, and unsafe metric values.
- [x] Keep the tracker endpoint on the signed-in Supabase client. Avoid reading raw session rows; return one complete `{ synapseCourses, tasks }` response or an error.
- [x] Add regressions for exact pagination boundaries, 100-row API caps, failed/changed pages, 1,001 tasks, 1,001 subtasks, 51-task batching, invisible-task summaries, malformed metrics even on invisible summaries, and empty tasks.

## Work package B — enforce the advertised plan request size

- [x] Measure the actual `Request` body as UTF-8 bytes and enforce the inclusive 524,288-byte limit before JSON and schema parsing.
- [x] Keep `Content-Length` as an early optimization only. Return 413 `payload_too_large` for oversized bytes; return 400 `invalid_request` for malformed JSON or invalid UTF-8.
- [x] Test exact size boundaries, multibyte JSON, missing or understated `Content-Length`, malformed JSON, and invalid UTF-8.

## Work package C — preserve session ownership in direct Supabase updates

**Spec:** [session-task ownership](docs/superpowers/specs/2026-09-29-session-task-ownership-design.md).
**Step-by-step plan:** [ownership migration plan](docs/superpowers/plans/2026-09-29-session-task-ownership-implementation.md).

- [x] Add the additive migration that clears historical cross-owner task links without deleting session history, then replaces the UPDATE policy with a same-owner task check.
- [x] Apply both migrations to a throwaway local PostgreSQL database. Verify two-user summary isolation, the repaired historical link and preserved snapshot, own-task relink and null unlink, anonymous RPC denial, and cross-owner UPDATE rejection.

## Verification record

- `npm test`: **199 tests passed**.
- `npm run typecheck`: passed.
- `npm run lint`: passed.
- `npm run build`: passed; Next.js emitted the expected app route manifest, including `/api/tracker/tasks` and `/api/integrations/v1/plan`.
- `git diff --check`: passed.
- Disposable PostgreSQL 17 checks: both migrations applied. User A and user B saw only their own aggregate metrics. The pre-existing cross-owner link was nulled while its session and title snapshot remained. User A could relink to their own task and clear the link; a foreign-task relink failed RLS. The `anon` role could not execute the summary RPC.

The PostgreSQL checks used synthetic local rows and prove the migration behavior in that disposable database. They do not prove the state of a hosted Supabase project.

## Release gate

Apply `20260929000000_tracker_task_session_summaries.sql` and then `20260929010000_learning_session_task_owner_update.sql` to the intended Supabase project using its approved migration process. Before applying the owner-repair migration to an existing project, take a restorable backup and record the cross-owner-link count. After both migrations, verify the count is zero and run the direct two-account checks with normal authenticated clients. Then deploy the provider code and compare an account's task summary for a history over 1,000 sessions against an owner-scoped SQL aggregate. Production migrations and deployment were not performed as part of this PR.

For the paired Synapse consumer and its rollout sequence, see the [Synapse implementation plan](https://github.com/farzah14/Synapse/blob/codex/studyrythms-contract-fixes/implementations_plan.md).
