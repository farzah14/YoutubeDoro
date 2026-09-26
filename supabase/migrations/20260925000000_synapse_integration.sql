create table public.integration_grants (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  client_id text not null,
  scope text not null check (scope = 'sessions:read'),
  created_at timestamptz not null default now(),
  revoked_at timestamptz
);

create index integration_grants_user_client_idx on public.integration_grants (user_id, client_id, created_at desc);

create table public.integration_auth_codes (
  id uuid primary key default gen_random_uuid(),
  code_hash text not null unique,
  grant_id uuid not null references public.integration_grants(id) on delete cascade,
  client_id text not null,
  redirect_uri text not null,
  code_challenge text not null,
  expires_at timestamptz not null,
  consumed_at timestamptz
);

create index integration_auth_codes_expiry_idx on public.integration_auth_codes (expires_at);

create table public.integration_tokens (
  id uuid primary key default gen_random_uuid(),
  token_hash text not null unique,
  grant_id uuid not null references public.integration_grants(id) on delete cascade,
  kind text not null check (kind in ('access', 'refresh')),
  expires_at timestamptz not null,
  consumed_at timestamptz,
  created_at timestamptz not null default now()
);

create index integration_tokens_grant_idx on public.integration_tokens (grant_id, kind);
create index integration_tokens_expiry_idx on public.integration_tokens (expires_at);

create table public.integration_session_changes (
  revision bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  session_id uuid not null,
  event_type text not null check (event_type in ('upsert', 'delete')),
  payload jsonb,
  occurred_at timestamptz not null default now(),
  check ((event_type = 'upsert' and payload is not null) or (event_type = 'delete' and payload is null))
);

create index integration_session_changes_user_revision_idx on public.integration_session_changes (user_id, revision);
create index integration_session_changes_expiry_idx on public.integration_session_changes (occurred_at);

create table public.integration_change_watermarks (
  user_id uuid primary key references auth.users(id) on delete cascade,
  pruned_through_revision bigint not null default 0 check (pruned_through_revision >= 0)
);

create table public.integration_rate_limits (
  grant_id uuid not null references public.integration_grants(id) on delete cascade,
  minute_bucket timestamptz not null,
  request_count integer not null default 0 check (request_count >= 0),
  primary key (grant_id, minute_bucket)
);

create table public.integration_housekeeping (
  id boolean primary key default true check (id),
  last_cleanup_at timestamptz not null default 'epoch'
);

insert into public.integration_housekeeping (id) values (true);

create or replace function public.create_synapse_grant(
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
    set revoked_at = now()
    where user_id = p_user_id and client_id = p_client_id and revoked_at is null;

  insert into public.integration_grants (user_id, client_id, scope)
    values (p_user_id, p_client_id, 'sessions:read')
    returning id into created_grant_id;

  insert into public.integration_auth_codes
    (code_hash, grant_id, client_id, redirect_uri, code_challenge, expires_at)
    values (p_code_hash, created_grant_id, p_client_id, p_redirect_uri, p_code_challenge, p_expires_at);

  return created_grant_id;
end;
$$;

create or replace function public.exchange_synapse_code(
  p_code_hash text,
  p_client_id text,
  p_redirect_uri text,
  p_access_hash text,
  p_refresh_hash text,
  p_access_expiry timestamptz,
  p_refresh_expiry timestamptz
) returns table (owner_id uuid, issued_grant_id uuid)
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  code_row public.integration_auth_codes%rowtype;
begin
  select code.* into code_row
    from public.integration_auth_codes as code
    join public.integration_grants as grant_row on grant_row.id = code.grant_id
    where code.code_hash = p_code_hash
      and code.client_id = p_client_id
      and code.redirect_uri = p_redirect_uri
      and code.consumed_at is null
      and code.expires_at > now()
      and grant_row.revoked_at is null
    for update of code;

  if not found then return; end if;

  update public.integration_auth_codes set consumed_at = now() where id = code_row.id;
  select grant_row.user_id into owner_id from public.integration_grants as grant_row where grant_row.id = code_row.grant_id;
  issued_grant_id := code_row.grant_id;

  insert into public.integration_tokens (token_hash, grant_id, kind, expires_at)
    values (p_access_hash, issued_grant_id, 'access', p_access_expiry),
           (p_refresh_hash, issued_grant_id, 'refresh', p_refresh_expiry);
  return next;
end;
$$;

create or replace function public.rotate_synapse_refresh(
  p_refresh_hash text,
  p_client_id text,
  p_access_hash text,
  p_next_refresh_hash text,
  p_access_expiry timestamptz,
  p_refresh_expiry timestamptz
) returns table (owner_id uuid, issued_grant_id uuid)
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  token_row public.integration_tokens%rowtype;
begin
  select token.* into token_row
    from public.integration_tokens as token
    join public.integration_grants as grant_row on grant_row.id = token.grant_id
    where token.token_hash = p_refresh_hash
      and token.kind = 'refresh'
      and token.consumed_at is null
      and token.expires_at > now()
      and grant_row.client_id = p_client_id
      and grant_row.revoked_at is null
    for update of token;

  if not found then return; end if;

  update public.integration_tokens set consumed_at = now() where id = token_row.id;
  select grant_row.user_id into owner_id from public.integration_grants as grant_row where grant_row.id = token_row.grant_id;
  issued_grant_id := token_row.grant_id;

  insert into public.integration_tokens (token_hash, grant_id, kind, expires_at)
    values (p_access_hash, issued_grant_id, 'access', p_access_expiry),
           (p_next_refresh_hash, issued_grant_id, 'refresh', p_refresh_expiry);
  return next;
end;
$$;

create or replace function public.revoke_synapse_grant(p_grant_id uuid, p_client_id text)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  changed integer;
begin
  update public.integration_grants
    set revoked_at = coalesce(revoked_at, now())
    where id = p_grant_id and client_id = p_client_id;
  get diagnostics changed = row_count;
  if changed = 0 then return false; end if;
  update public.integration_tokens set consumed_at = coalesce(consumed_at, now()) where grant_id = p_grant_id;
  return true;
end;
$$;

create or replace function public.consume_synapse_request(p_grant_id uuid, p_client_id text, p_minute_bucket timestamptz)
returns integer
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  next_count integer;
begin
  if not exists (
    select 1 from public.integration_grants
    where id = p_grant_id and client_id = p_client_id and revoked_at is null
  ) then
    return -1;
  end if;

  insert into public.integration_rate_limits (grant_id, minute_bucket, request_count)
    values (p_grant_id, p_minute_bucket, 1)
    on conflict (grant_id, minute_bucket)
    do update set request_count = public.integration_rate_limits.request_count + 1
    returning request_count into next_count;
  return next_count;
end;
$$;

create or replace function public.cleanup_synapse_integration()
returns boolean
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  claimed integer;
begin
  update public.integration_housekeeping
    set last_cleanup_at = now()
    where id = true and last_cleanup_at < now() - interval '1 day';
  get diagnostics claimed = row_count;
  if claimed = 0 then return false; end if;

  delete from public.integration_auth_codes where expires_at < now() - interval '1 day';
  delete from public.integration_tokens where expires_at < now() - interval '1 day' or consumed_at < now() - interval '1 day';
  delete from public.integration_rate_limits where minute_bucket < date_trunc('minute', now()) - interval '2 days';
  insert into public.integration_change_watermarks (user_id, pruned_through_revision)
    select user_id, max(revision)
      from public.integration_session_changes
      where occurred_at < now() - interval '90 days'
      group by user_id
    on conflict (user_id) do update
      set pruned_through_revision = greatest(
        public.integration_change_watermarks.pruned_through_revision,
        excluded.pruned_through_revision
      );
  delete from public.integration_session_changes where occurred_at < now() - interval '90 days';
  return true;
end;
$$;

create or replace function public.record_synapse_session_change()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  previous_eligible boolean := false;
  next_eligible boolean := false;
  changed_fields boolean := true;
begin
  if tg_op <> 'INSERT' then
    previous_eligible := old.status = 'completed' and old.learning_seconds > 0;
  end if;
  if tg_op <> 'DELETE' then
    next_eligible := new.status = 'completed' and new.learning_seconds > 0;
  end if;

  if tg_op = 'UPDATE' then
    changed_fields := old.status is distinct from new.status
      or old.user_id is distinct from new.user_id
      or old.title is distinct from new.title
      or old.started_at is distinct from new.started_at
      or old.ended_at is distinct from new.ended_at
      or old.learning_seconds is distinct from new.learning_seconds
      or old.updated_at is distinct from new.updated_at;
  end if;

  if tg_op = 'DELETE' then
    if previous_eligible then
      insert into public.integration_session_changes (user_id, session_id, event_type, payload)
        values (old.user_id, old.id, 'delete', null);
    end if;
    return old;
  end if;

  if next_eligible and changed_fields then
    insert into public.integration_session_changes (user_id, session_id, event_type, payload)
      values (
        new.user_id,
        new.id,
        'upsert',
        jsonb_build_object(
          'id', new.id,
          'title', new.title,
          'startedAt', new.started_at,
          'endedAt', new.ended_at,
          'learningSeconds', new.learning_seconds,
          'updatedAt', new.updated_at
        )
      );
  elsif previous_eligible and not next_eligible then
    insert into public.integration_session_changes (user_id, session_id, event_type, payload)
      values (old.user_id, old.id, 'delete', null);
  end if;

  return new;
end;
$$;

create trigger learning_sessions_integration_change
after insert or update or delete on public.learning_sessions
for each row execute function public.record_synapse_session_change();

alter table public.integration_grants enable row level security;
alter table public.integration_auth_codes enable row level security;
alter table public.integration_tokens enable row level security;
alter table public.integration_session_changes enable row level security;
alter table public.integration_change_watermarks enable row level security;
alter table public.integration_rate_limits enable row level security;
alter table public.integration_housekeeping enable row level security;

revoke all on public.integration_grants, public.integration_auth_codes, public.integration_tokens,
  public.integration_session_changes, public.integration_change_watermarks, public.integration_rate_limits, public.integration_housekeeping
  from anon, authenticated;
grant all on public.integration_grants, public.integration_auth_codes, public.integration_tokens,
  public.integration_session_changes, public.integration_change_watermarks, public.integration_rate_limits, public.integration_housekeeping
  to service_role;

revoke execute on function public.create_synapse_grant(uuid, text, text, text, text, timestamptz) from public, anon, authenticated;
revoke execute on function public.exchange_synapse_code(text, text, text, text, text, timestamptz, timestamptz) from public, anon, authenticated;
revoke execute on function public.rotate_synapse_refresh(text, text, text, text, timestamptz, timestamptz) from public, anon, authenticated;
revoke execute on function public.revoke_synapse_grant(uuid, text) from public, anon, authenticated;
revoke execute on function public.consume_synapse_request(uuid, text, timestamptz) from public, anon, authenticated;
revoke execute on function public.cleanup_synapse_integration() from public, anon, authenticated;
revoke execute on function public.record_synapse_session_change() from public, anon, authenticated;
grant execute on function public.create_synapse_grant(uuid, text, text, text, text, timestamptz) to service_role;
grant execute on function public.exchange_synapse_code(text, text, text, text, text, timestamptz, timestamptz) to service_role;
grant execute on function public.rotate_synapse_refresh(text, text, text, text, timestamptz, timestamptz) to service_role;
grant execute on function public.revoke_synapse_grant(uuid, text) to service_role;
grant execute on function public.consume_synapse_request(uuid, text, timestamptz) to service_role;
grant execute on function public.cleanup_synapse_integration() to service_role;
