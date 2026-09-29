# Complete task focus summaries under Supabase row limits

**Date:** 2026-09-29
**Status:** implemented on the companion PR branch; see the implementation plan for verification results and release gates.
**Repository:** YoutubeDoro (StudyRythms).
**Related finding:** F3 in the [Synapse cross-repository audit](https://github.com/farzah14/Synapse/blob/codex/studyrythms-contract-fixes/docs/audits/2026-09-29-synapse-studyrythms-cross-repo-audit.md).

## Goal

`GET /api/tracker/tasks` must return every visible task, its visible subtasks, every active Synapse course, and exact per-task focus totals even when the user's data exceeds Supabase's configured maximum response rows. The route currently sums raw `learning_sessions` in JavaScript. Supabase's [default project row limit is 1,000](https://supabase.com/docs/reference/javascript/v1/select); a browser migration can import 5,000 sessions. A successful response with silently partial totals is unacceptable.

## Response and ownership contract

The JSON shape stays `{ synapseCourses, tasks }`. Existing `mapTaskRow` and `mapSubtaskRow` determine field names and formatting. For each task in the response:

- `focusedSeconds` is the sum of `learning_seconds` across **all** that user's sessions with this task ID, regardless of session status. `learning_seconds` is nonnegative in the table.
- `completedSessions` counts sessions with `status = 'completed'` and this task ID.
- `linkedSessionCount` counts all sessions with this task ID.
- A task with no sessions has zero for all three counts.
- Sessions with `task_id IS NULL` do not contribute to any task. A session linked to an inactive imported task must not cause that task to reappear in the list; its history remains available through the sessions API.
- Only tasks with `user_id = authenticated user` and `synapse_active = true` are returned. Only active `synapse_courses` for that user are returned. Subtasks are attached only to returned tasks and remain governed by their existing owner RLS policy.

The route must use the signed-in user's normal Supabase client, not a secret/service-role client. An anonymous request still returns 401; missing Supabase configuration still returns 500. A failed page, RPC, malformed result, or count outside JavaScript's safe integer range returns a server error. It must never send a superficially successful partial result.

## Storage design

Add one additive SQL migration after `20260928000000_synapse_checklist_completion.sql`, named `supabase/migrations/20260929000000_tracker_task_session_summaries.sql`:

```sql
create function public.task_session_summaries()
returns table (
  task_id uuid,
  focused_seconds bigint,
  completed_sessions bigint,
  linked_session_count bigint
)
language sql
stable
security invoker
set search_path = pg_catalog, public
as $$
  select ls.task_id,
         coalesce(sum(ls.learning_seconds), 0)::bigint,
         count(*) filter (where ls.status = 'completed')::bigint,
         count(*)::bigint
  from public.learning_sessions as ls
  where ls.user_id = (select auth.uid())
    and ls.task_id is not null
  group by ls.task_id
$$;

revoke all on function public.task_session_summaries() from public, anon;
grant execute on function public.task_session_summaries() to authenticated;
```

`SECURITY INVOKER` and `auth.uid()` preserve the caller's RLS boundary. Explicit `user_id` filtering also scopes aggregation and uses the existing `(user_id, task_id, created_at)` index prefix. The function returns one row per task, so the API no longer transfers all sessions every five seconds. The RPC can itself return more than the API row cap when a user has many tasks, so its result must also be paged.

## Read algorithm

Request pages of at most **500** rows, below the default 1,000-row cap. Request `{ count: 'exact' }` on the first page of each filtered table query and `{ count: 'exact' }` in the RPC options for its first page. Supabase supports [exact select counts](https://supabase.com/docs/reference/javascript/v1/select) and [RPC counts](https://supabase.com/docs/reference/javascript/v1/rpc). Every paged query must have a total deterministic order before `.range(from, to)`. Supabase `.range` has inclusive, zero-based bounds and depends on query order ([reference](https://supabase.com/docs/reference/javascript/using-modifiers-range)).

The first returned `count` is the expected total. Advance the next range start by the **number of rows actually returned**, not by 500: a project configured with a lower API cap may return a shorter page even though more rows remain. Continue until the accumulated row count equals the exact count. Reject a missing/invalid count, an empty page before reaching the count, any page error, duplicate unique IDs, or a final count mismatch. If the count changes on later requests, retry the read once or fail rather than returning a partial list. Do not use an arbitrary maximum number of pages. A count verifies completeness; it does not substitute for reading the rows.

1. Page active tasks filtered by `user_id` and `synapse_active`, ordered by `task_order`, `created_at`, then unique `id`. Preserve that order for the response.
2. Page active `synapse_courses` filtered by `user_id` and `active`, ordered by `course_order`, then unique `source_key`. Preserve that order for the response.
3. If no tasks were returned, skip subtasks and session summaries and return the empty task array with the course array.
4. Split task IDs into batches of **50** to keep `.in('task_id', ids)` URLs bounded. For each batch, page `subtasks` ordered by `task_id`, `subtask_order`, then unique `id`. Map rows with `mapSubtaskRow` and append to their parent task. A batch's pages may include more than 1,000 rows in total; consume every page. Child ordering for each task is by `subtask_order`, then `id`.
5. Page `supabase.rpc('task_session_summaries')` ordered by unique `task_id`. For every row, validate the task ID, reject duplicate IDs, convert all three bigint values with `Number(...)`, and verify each is a nonnegative safe integer **before** filtering by the returned task ID set. Store only summaries for returned tasks. A malformed row for an inactive or otherwise unreturned task is still an error; do not let the visibility filter hide corrupt metrics.
6. Map each task with the same mapper and default-zero metrics. Preserve the response shape; no client hook or UI polling interval changes are needed for this correctness fix.

The page walker should be a small testable helper (for example `lib/trackerTaskRead.ts`), not copy-pasted four times. It needs to receive a query factory or callback that constructs a new ordered query for each range; do not reuse an already executed mutable Supabase query builder. Return all rows only after every page has succeeded. Sequential pages are acceptable. Avoid using `count: 'exact'` as a substitute for reading all pages: the route needs every actual task/subtask row.

## Acceptance matrix

| Dataset | Expected behavior |
| --- | --- |
| 0 tasks, 0 courses | 200; two empty arrays; no subtask/RPC query |
| 1 task, 0 sessions | All three metrics are 0 |
| 1 task, 1,001 linked sessions | Full sum and both exact counts, independent of which rows fall after the first page |
| 1 task, 5,000 migrated sessions | Full sum; no raw `learning_sessions` row transfer in task route |
| 501, 1,000, and 1,001 tasks | Every task appears once in stable order; RPC pages are fully read |
| 1,001 subtasks under returned tasks | Every child appears once under the correct task |
| 51+ tasks with children | Multiple 50-ID batches; no long unbounded `.in` query |
| Two signed-in accounts | Each sees only its own task/session totals, including when the other account has a matching task title |
| Configured 100-row API cap and a 1,001-row table | All 1,001 rows appear; range starts advance 0, 100, 200, … by actual returned length |
| Empty or failing second page while exact count says more rows | Route errors; no 200 partial response |
| Malformed or unsafe summary metric for an inactive task ID | Route errors before filtering that invisible row |
| 401 and no Supabase configuration | Same status and body contract as current route |

Tests should include a deterministic fake query/page source with 1,001 and 5,000 rows so the boundary is exercised without a live database. A local Supabase/Postgres integration test, when available, must execute the migration and verify `authenticated` versus `anon` grants and two-account RLS. Source-text tests alone cannot prove the aggregation math or pagination.

## Deployment and rollback

Apply the additive SQL migration first, then deploy the route. Verify a signed-in task list whose session history exceeds 1,000 rows and compare returned totals with an owner-scoped SQL aggregate. Roll back the route first if necessary; the unused function can remain until a planned cleanup migration. No historical rows are rewritten, no data is deleted, and the browser response schema stays stable.

## Related bounded provider guard

The integration plan route claims a 512 KiB request cap but checks `raw.length`, which counts UTF-16 code units. In the same provider implementation batch, add a regression proving a multibyte JSON payload can have `raw.length <= 524288` while `new TextEncoder().encode(raw).byteLength > 524288`, then enforce UTF-8 byte length before JSON parsing. Keep the 413 status and `payload_too_large` body. This is independent of the tracker SQL migration; it is included as a small separate task in the provider implementation plan.
