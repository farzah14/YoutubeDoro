alter table public.integration_grants
  drop constraint if exists integration_grants_scope_check;
alter table public.integration_grants
  add constraint integration_grants_scope_check
  check (scope in ('sessions:read', 'sessions:read plan:write'));

alter table public.integration_grants
  drop constraint if exists integration_grants_consent_version_check;
alter table public.integration_grants
  add constraint integration_grants_consent_version_check
  check (consent_version in (1, 2, 3));

update public.integration_grants
  set revoked_at = coalesce(revoked_at, now())
  where consent_version < 3;

create function public.create_synapse_grant_v3(
  p_user_id uuid,
  p_client_id text,
  p_code_hash text,
  p_redirect_uri text,
  p_code_challenge text,
  p_expires_at timestamptz
) returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  created_grant_id uuid;
begin
  update public.integration_grants
    set revoked_at = coalesce(revoked_at, now())
    where user_id = p_user_id and client_id = p_client_id and revoked_at is null;

  insert into public.integration_grants (user_id, client_id, scope, consent_version)
    values (p_user_id, p_client_id, 'sessions:read plan:write', 3)
    returning id into created_grant_id;

  insert into public.integration_auth_codes
    (code_hash, grant_id, client_id, redirect_uri, code_challenge, expires_at)
    values (p_code_hash, created_grant_id, p_client_id, p_redirect_uri, p_code_challenge, p_expires_at);

  return created_grant_id;
end;
$$;

revoke execute on function public.create_synapse_grant_v3(uuid, text, text, text, text, timestamptz)
  from public, anon, authenticated;
grant execute on function public.create_synapse_grant_v3(uuid, text, text, text, text, timestamptz)
  to service_role;
revoke execute on function public.create_synapse_grant_v2(uuid, text, text, text, text, timestamptz)
  from service_role;

alter table public.tasks
  add column synapse_active boolean not null default true,
  add column synapse_course_key text;

drop policy "tasks owner insert" on public.tasks;
create policy "tasks owner insert" on public.tasks for insert to authenticated
  with check (user_id = auth.uid() and (source_key is null or source_key not like 'synapse:%'));

drop policy "tasks owner delete" on public.tasks;
create policy "tasks owner delete" on public.tasks for delete to authenticated
  using (user_id = auth.uid() and (source_key is null or source_key not like 'synapse:%'));

drop policy "subtasks owner update" on public.subtasks;
drop policy "subtasks owner insert" on public.subtasks;
create policy "subtasks owner insert" on public.subtasks for insert to authenticated with check (
  (source_key is null or source_key not like 'synapse:%')
  and exists (select 1 from public.tasks where tasks.id = subtasks.task_id and tasks.user_id = auth.uid())
);
create policy "subtasks owner update" on public.subtasks for update to authenticated using (
  (source_key is null or source_key not like 'synapse:%')
  and exists (select 1 from public.tasks where tasks.id = subtasks.task_id and tasks.user_id = auth.uid())
) with check (
  (source_key is null or source_key not like 'synapse:%')
  and exists (select 1 from public.tasks where tasks.id = subtasks.task_id and tasks.user_id = auth.uid())
);
drop policy "subtasks owner delete" on public.subtasks;
create policy "subtasks owner delete" on public.subtasks for delete to authenticated using (
  (source_key is null or source_key not like 'synapse:%')
  and exists (select 1 from public.tasks where tasks.id = subtasks.task_id and tasks.user_id = auth.uid())
);

create table public.synapse_courses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  source_key text not null,
  title text not null check (length(btrim(title)) > 0),
  course_order integer not null default 0,
  active boolean not null default true,
  updated_at timestamptz not null default now(),
  unique (user_id, source_key)
);

create index synapse_courses_user_active_order_idx
  on public.synapse_courses (user_id, active, course_order);

alter table public.synapse_courses enable row level security;
create policy "synapse courses owner select" on public.synapse_courses
  for select to authenticated using (user_id = auth.uid());
revoke all on table public.synapse_courses from anon;
grant select on table public.synapse_courses to authenticated;

create table public.synapse_plan_state (
  user_id uuid not null references auth.users(id) on delete cascade,
  source_user_id text not null,
  last_snapshot_at timestamptz not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, source_user_id)
);

alter table public.synapse_plan_state enable row level security;
revoke all on table public.synapse_plan_state from anon, authenticated;

create function public.apply_synapse_plan(
  p_user_id uuid,
  p_source_user_id text,
  p_snapshot_at timestamptz,
  p_courses jsonb,
  p_priorities jsonb
) returns boolean
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  prefix text := 'synapse:' || encode(digest(p_source_user_id, 'sha256'), 'hex') || ':';
  item jsonb;
  child jsonb;
  imported_task_id uuid;
  course_key text;
  previous_snapshot timestamptz;
begin
  perform pg_advisory_xact_lock(hashtextextended(p_user_id::text || ':' || p_source_user_id::text, 0));
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

    delete from public.subtasks
      where task_id = imported_task_id and source_key like prefix || 'subtask:%';
    for child in select value from jsonb_array_elements(item->'subtasks') loop
      insert into public.subtasks
        (task_id, text, completed, subtask_order, source_key)
        values (imported_task_id, child->>'text', (child->>'completed')::boolean,
                (child->>'order')::integer, prefix || 'subtask:' || (child->>'id'));
    end loop;
  end loop;

  insert into public.synapse_plan_state
    (user_id, source_user_id, last_snapshot_at, updated_at)
    values (p_user_id, p_source_user_id, p_snapshot_at, now())
    on conflict (user_id, source_user_id) do update
      set last_snapshot_at = excluded.last_snapshot_at, updated_at = now();
  return true;
end;
$$;

revoke execute on function public.apply_synapse_plan(uuid, text, timestamptz, jsonb, jsonb)
  from public, anon, authenticated;
grant execute on function public.apply_synapse_plan(uuid, text, timestamptz, jsonb, jsonb)
  to service_role;
