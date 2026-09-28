-- StudyRythms users may complete imported checklist rows. Keep their latest
-- completion choice separately so an older Synapse plan cannot undo it.
create table public.synapse_checklist_overrides (
  user_id uuid not null references auth.users(id) on delete cascade,
  source_key text not null,
  completed boolean not null,
  changed_at timestamptz not null,
  primary key (user_id, source_key)
);

alter table public.synapse_checklist_overrides enable row level security;
revoke all on table public.synapse_checklist_overrides from public, anon, authenticated;
grant select, insert, update, delete on table public.synapse_checklist_overrides to service_role;

create function public.set_synapse_subtask_completion(
  p_user_id uuid,
  p_subtask_id uuid,
  p_completed boolean
) returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  item public.subtasks%rowtype;
  source_hash text;
  changed_at timestamptz;
begin
  select s.* into item
    from public.subtasks s
    join public.tasks t on t.id = s.task_id
    where s.id = p_subtask_id and t.user_id = p_user_id and t.synapse_active
      and s.source_key like 'synapse:%:subtask:%'
      and t.source_key like 'synapse:%:task:%';
  if not found then return null; end if;
  source_hash := split_part(item.source_key, ':', 2);
  if source_hash !~ '^[0-9a-f]{64}$' then return null; end if;
  perform pg_advisory_xact_lock(hashtextextended(p_user_id::text || ':' || source_hash, 0));

  select s.* into item
    from public.subtasks s
    join public.tasks t on t.id = s.task_id
    where s.id = p_subtask_id and t.user_id = p_user_id and t.synapse_active
      and s.source_key like 'synapse:%:subtask:%'
      and t.source_key like 'synapse:' || source_hash || ':task:%'
    for update of s;
  if not found then return null; end if;

  changed_at := date_trunc('milliseconds', clock_timestamp());
  update public.subtasks s set completed = p_completed, updated_at = changed_at
    from public.tasks t
    where s.task_id = t.id and t.user_id = p_user_id and t.synapse_active
      and t.source_key like 'synapse:' || source_hash || ':task:%'
      and s.source_key = item.source_key;
  insert into public.synapse_checklist_overrides
    (user_id, source_key, completed, changed_at)
    values (p_user_id, item.source_key, p_completed, changed_at)
    on conflict (user_id, source_key) do update
      set completed = excluded.completed, changed_at = excluded.changed_at;

  return jsonb_build_object(
    'id', item.id, 'task_id', item.task_id, 'text', item.text,
    'completed', p_completed, 'subtask_order', item.subtask_order,
    'created_at', item.created_at, 'updated_at', changed_at,
    'source_key', item.source_key
  );
end;
$$;

revoke execute on function public.set_synapse_subtask_completion(uuid, uuid, boolean)
  from public, anon, authenticated;
grant execute on function public.set_synapse_subtask_completion(uuid, uuid, boolean)
  to service_role;

create or replace function public.apply_synapse_plan(
  p_user_id uuid,
  p_source_user_id text,
  p_snapshot_at timestamptz,
  p_courses jsonb,
  p_priorities jsonb
) returns boolean
language plpgsql
security definer
set search_path = pg_catalog, extensions, public
as $$
declare
  prefix text := 'synapse:' || encode(digest(p_source_user_id, 'sha256'), 'hex') || ':';
  item jsonb;
  child jsonb;
  imported_task_id uuid;
  course_key text;
  previous_snapshot timestamptz;
  child_source_key text;
  child_changed_at timestamptz;
  child_completed boolean;
  override_completed boolean;
  override_changed_at timestamptz;
  child_keys text[];
begin
  perform pg_advisory_xact_lock(hashtextextended(p_user_id::text || ':' || split_part(prefix, ':', 2), 0));
  select last_snapshot_at into previous_snapshot from public.synapse_plan_state
    where user_id = p_user_id and source_user_id = p_source_user_id;
  if previous_snapshot is not null and p_snapshot_at < previous_snapshot then
    return false;
  end if;

  update public.synapse_courses set active = false, updated_at = now()
    where user_id = p_user_id and source_key like prefix || 'course:%';
  for item in select value from jsonb_array_elements(p_courses) loop
    course_key := prefix || 'course:' || (item->>'id');
    insert into public.synapse_courses (user_id, source_key, title, course_order, active)
      values (p_user_id, course_key, item->>'title', (item->>'order')::integer, true)
      on conflict (user_id, source_key) do update
        set title = excluded.title, course_order = excluded.course_order,
            active = true, updated_at = now();
  end loop;

  update public.tasks set synapse_active = false, updated_at = now()
    where user_id = p_user_id and source_key like prefix || 'task:%';
  for item in select value from jsonb_array_elements(p_priorities) loop
    course_key := case when item->>'courseId' is null then null
      else prefix || 'course:' || (item->>'courseId') end;
    insert into public.tasks
      (user_id, title, completed, estimated_minutes, emoji, color,
       task_order, source_key, synapse_active, synapse_course_key)
      values
      (p_user_id, item->>'title', (item->>'completed')::boolean,
       (item->>'estimatedMinutes')::integer, '✦', '#7c3aed',
       (item->>'order')::integer, prefix || 'task:' || (item->>'id'), true, course_key)
      on conflict (user_id, source_key) do update
        set title = excluded.title, completed = excluded.completed,
            estimated_minutes = excluded.estimated_minutes, task_order = excluded.task_order,
            synapse_active = true, synapse_course_key = excluded.synapse_course_key,
            updated_at = now()
      returning id into imported_task_id;

    select array_agg(prefix || 'subtask:' || (value->>'id')) into child_keys
      from jsonb_array_elements(item->'subtasks');
    for child in select value from jsonb_array_elements(item->'subtasks') loop
      child_source_key := prefix || 'subtask:' || (child->>'id');
      child_changed_at := coalesce((child->>'completedChangedAt')::timestamptz, '1970-01-01T00:00:00Z'::timestamptz);
      select completed, changed_at into override_completed, override_changed_at
        from public.synapse_checklist_overrides
        where user_id = p_user_id and source_key = child_source_key;
      if override_changed_at is not null and override_changed_at > child_changed_at then
        child_completed := override_completed;
      else
        child_completed := (child->>'completed')::boolean;
        delete from public.synapse_checklist_overrides
          where user_id = p_user_id and source_key = child_source_key;
      end if;

      insert into public.subtasks
        (task_id, text, completed, subtask_order, source_key)
        values (imported_task_id, child->>'text', child_completed,
                (child->>'order')::integer, child_source_key)
        on conflict (task_id, source_key) do update
          set text = excluded.text, completed = excluded.completed,
              subtask_order = excluded.subtask_order, updated_at = now();
    end loop;
    delete from public.subtasks
      where task_id = imported_task_id and source_key like prefix || 'subtask:%'
        and not (source_key = any(coalesce(child_keys, array[]::text[])));
  end loop;

  delete from public.synapse_checklist_overrides o
    where o.user_id = p_user_id and o.source_key like prefix || 'subtask:%'
      and not exists (
        select 1 from public.subtasks s
        join public.tasks t on t.id = s.task_id
        where s.source_key = o.source_key and t.user_id = p_user_id
          and t.synapse_active and t.source_key like prefix || 'task:%'
      );

  insert into public.synapse_plan_state
    (user_id, source_user_id, last_snapshot_at, updated_at)
    values (p_user_id, p_source_user_id, p_snapshot_at, now())
    on conflict (user_id, source_user_id) do update
      set last_snapshot_at = excluded.last_snapshot_at, updated_at = now();
  return true;
end;
$$;
