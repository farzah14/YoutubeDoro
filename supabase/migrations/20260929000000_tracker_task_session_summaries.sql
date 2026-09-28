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
