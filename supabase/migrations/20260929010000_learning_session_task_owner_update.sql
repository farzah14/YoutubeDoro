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
