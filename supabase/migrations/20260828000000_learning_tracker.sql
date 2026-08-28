create extension if not exists pgcrypto;

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (length(btrim(title)) > 0),
  completed boolean not null default false,
  estimated_minutes integer not null default 25 check (estimated_minutes between 5 and 480),
  emoji text not null default '✦',
  color text not null default '#7c3aed' check (color ~ '^#[0-9a-fA-F]{6}$'),
  task_order integer not null default 0 check (task_order >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  source_key text,
  unique (user_id, source_key)
);

create table public.subtasks (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  text text not null check (length(btrim(text)) > 0),
  completed boolean not null default false,
  subtask_order integer not null default 0 check (subtask_order >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  source_key text,
  unique (task_id, source_key)
);

create table public.learning_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  task_id uuid references public.tasks(id) on delete cascade,
  task_title_snapshot text not null check (length(btrim(task_title_snapshot)) > 0),
  title text not null check (length(btrim(title)) > 0),
  timer_mode text not null check (timer_mode in ('pomodoro', 'countdown', 'stopwatch', 'animedoro', '52-17')),
  planned_seconds integer check (planned_seconds is null or planned_seconds >= 0),
  learning_seconds bigint not null default 0 check (learning_seconds >= 0),
  break_count integer default 0 check (break_count is null or break_count >= 0),
  break_seconds bigint not null default 0 check (break_seconds >= 0),
  status text not null check (status in ('active', 'completed', 'stopped', 'interrupted', 'legacy')),
  note text not null default '',
  started_at timestamptz not null,
  ended_at timestamptz,
  source_key text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, source_key)
);

create table public.migration_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  source text not null check (source = 'browser-local'),
  source_key text not null,
  summary jsonb not null default '{}'::jsonb,
  imported_at timestamptz not null default now(),
  unique (user_id, source, source_key)
);

create index tasks_user_order_idx on public.tasks (user_id, task_order);
create index subtasks_task_order_idx on public.subtasks (task_id, subtask_order);
create index sessions_user_created_idx on public.learning_sessions (user_id, created_at desc);
create index sessions_user_task_created_idx on public.learning_sessions (user_id, task_id, created_at desc);

alter table public.tasks enable row level security;
alter table public.subtasks enable row level security;
alter table public.learning_sessions enable row level security;
alter table public.migration_runs enable row level security;

create policy "tasks owner select" on public.tasks for select to authenticated using (user_id = auth.uid());
create policy "tasks owner insert" on public.tasks for insert to authenticated with check (user_id = auth.uid());
create policy "tasks owner update" on public.tasks for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "tasks owner delete" on public.tasks for delete to authenticated using (user_id = auth.uid());

create policy "subtasks owner select" on public.subtasks for select to authenticated using (
  exists (select 1 from public.tasks where tasks.id = subtasks.task_id and tasks.user_id = auth.uid())
);
create policy "subtasks owner insert" on public.subtasks for insert to authenticated with check (
  exists (select 1 from public.tasks where tasks.id = subtasks.task_id and tasks.user_id = auth.uid())
);
create policy "subtasks owner update" on public.subtasks for update to authenticated using (
  exists (select 1 from public.tasks where tasks.id = subtasks.task_id and tasks.user_id = auth.uid())
) with check (
  exists (select 1 from public.tasks where tasks.id = subtasks.task_id and tasks.user_id = auth.uid())
);
create policy "subtasks owner delete" on public.subtasks for delete to authenticated using (
  exists (select 1 from public.tasks where tasks.id = subtasks.task_id and tasks.user_id = auth.uid())
);

create policy "sessions owner select" on public.learning_sessions for select to authenticated using (user_id = auth.uid());
create policy "sessions owner insert" on public.learning_sessions for insert to authenticated with check (
  user_id = auth.uid()
  and (task_id is null or exists (select 1 from public.tasks where tasks.id = learning_sessions.task_id and tasks.user_id = auth.uid()))
);
create policy "sessions owner update" on public.learning_sessions for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "sessions owner delete" on public.learning_sessions for delete to authenticated using (user_id = auth.uid());

create policy "migration owner select" on public.migration_runs for select to authenticated using (user_id = auth.uid());
create policy "migration owner insert" on public.migration_runs for insert to authenticated with check (user_id = auth.uid());
create policy "migration owner delete" on public.migration_runs for delete to authenticated using (user_id = auth.uid());

revoke all on table public.tasks, public.subtasks, public.learning_sessions, public.migration_runs from anon;
grant select, insert, update, delete on table public.tasks, public.subtasks, public.learning_sessions, public.migration_runs to authenticated;
