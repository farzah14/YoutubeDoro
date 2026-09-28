# Keep a session's linked task inside its owner account

**Date:** 2026-09-29
**Status:** implemented on the companion PR branch; the migrations were applied and exercised only in a disposable local PostgreSQL database.
**Repository:** YoutubeDoro (StudyRythms).
**Finding:** F5 in the [Synapse cross-repository audit](https://github.com/farzah14/Synapse/blob/codex/studyrythms-contract-fixes/docs/audits/2026-09-29-synapse-studyrythms-cross-repo-audit.md).

## Invariant and current gap

For every `public.learning_sessions` row, `task_id` is either null or points to a `public.tasks` row with the **same** `user_id`. This permits unlinked focus sessions and allows the user to relink their own session to another of their own tasks. A completed session's title and note remain editable according to current route rules; this spec changes only linked-task ownership.

The INSERT RLS policy already enforces the invariant. The UPDATE policy checks only the session `user_id`; the application PATCH handler checks ownership, but browser-authenticated clients can send direct Supabase table updates. PostgreSQL foreign-key validation [bypasses RLS](https://www.postgresql.org/docs/17/ddl-rowsecurity.html), so `references public.tasks(id)` is not an account-ownership check.

## Migration contract

Create `supabase/migrations/20260929010000_learning_session_task_owner_update.sql`, after the tracker summary migration. Preserve all existing session rows and their timing, title, note, and `task_title_snapshot`. A historically cross-owner `task_id` is invalid: set it to null, preserving the session and snapshot text. Run the repair and policy replacement in the migration transaction:

```sql
update public.learning_sessions as ls
set task_id = null,
    updated_at = now()
from public.tasks as t
where ls.task_id = t.id
  and ls.user_id <> t.user_id;

drop policy "sessions owner update" on public.learning_sessions;
create policy "sessions owner update" on public.learning_sessions
for update to authenticated
using (user_id = auth.uid())
with check (
  user_id = auth.uid()
  and (
    task_id is null
    or exists (
      select 1 from public.tasks as t
      where t.id = task_id and t.user_id = auth.uid()
    )
  )
);
```

The owner subquery runs under the caller's RLS and can see only the caller's task. Do not use a `SECURITY DEFINER` helper or grant broader task read access. The migration's elevated execution can repair historical rows, but ordinary authenticated updates cannot create new cross-owner links. `task_title_snapshot` remains unchanged when an old invalid link is cleared so the focus history remains understandable.

## Acceptance matrix

Test against a disposable PostgreSQL/Supabase database with two distinct authenticated JWT subjects A and B, each owning one task and one session. Execute the test through direct Supabase table access as `authenticated`, not only through the Next route:

| Operation | Expected result |
| --- | --- |
| A updates A's session to A's other task | Succeeds |
| A clears A's session `task_id` to null | Succeeds |
| A updates A's session to B's task UUID | RLS `WITH CHECK` rejects it; persisted row stays unchanged |
| A updates B's session | No B row is modified |
| B updates B's session to A's task UUID | Rejected symmetrically |
| A inserts a new session linked to B's task | Existing INSERT policy still rejects it |
| Migration sees a pre-existing cross-owner link | Session survives with `task_id=null` and unchanged title, timing, note, and snapshot text |

Before running in an existing project, count cross-owner links with an elevated **read-only** query and take a restorable backup. After migration, the count must be zero. If the target database has no cross-owner links, the repair updates zero rows. The route's existing task-owner lookup remains defense in depth. No browser response fields, Supabase secrets, or Synapse data model change.
