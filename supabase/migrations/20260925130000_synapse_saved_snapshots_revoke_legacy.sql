revoke execute on function public.create_synapse_grant(uuid, text, text, text, text, timestamptz) from service_role;

update public.integration_grants
  set revoked_at = coalesce(revoked_at, now())
  where consent_version = 1;

update public.integration_tokens as token
  set consumed_at = coalesce(token.consumed_at, now())
  from public.integration_grants as grant_row
  where token.grant_id = grant_row.id
    and grant_row.consent_version = 1
    and token.consumed_at is null;

create or replace function public.record_synapse_session_change()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  previous_snapshot_eligible boolean := false;
  previous_feed_eligible boolean := false;
  next_feed_eligible boolean := false;
  changed_fields boolean := true;
begin
  if tg_op = 'DELETE' then
    previous_snapshot_eligible := old.learning_seconds > 0;
    if previous_snapshot_eligible then
      insert into public.integration_session_changes (user_id, session_id, event_type, payload)
        values (old.user_id, old.id, 'delete', null);
    end if;
    return old;
  end if;

  if tg_op = 'INSERT' then
    next_feed_eligible := new.status <> 'active' and new.learning_seconds > 0;
    if next_feed_eligible then
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
    end if;
    return new;
  end if;

  previous_snapshot_eligible := old.learning_seconds > 0;
  previous_feed_eligible := old.status <> 'active' and previous_snapshot_eligible;
  next_feed_eligible := new.status <> 'active' and new.learning_seconds > 0;
  changed_fields := old.status is distinct from new.status
    or old.user_id is distinct from new.user_id
    or old.title is distinct from new.title
    or old.started_at is distinct from new.started_at
    or old.ended_at is distinct from new.ended_at
    or old.learning_seconds is distinct from new.learning_seconds
    or old.updated_at is distinct from new.updated_at;

  if old.user_id is distinct from new.user_id then
    if previous_snapshot_eligible then
      insert into public.integration_session_changes (user_id, session_id, event_type, payload)
        values (old.user_id, old.id, 'delete', null);
    end if;
    if next_feed_eligible then
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
    end if;
    return new;
  end if;

  if next_feed_eligible and changed_fields then
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
  elsif previous_feed_eligible and not next_feed_eligible then
    insert into public.integration_session_changes (user_id, session_id, event_type, payload)
      values (old.user_id, old.id, 'delete', null);
  elsif old.status = 'active' and previous_snapshot_eligible and new.learning_seconds <= 0 then
    insert into public.integration_session_changes (user_id, session_id, event_type, payload)
      values (old.user_id, old.id, 'delete', null);
  end if;

  return new;
end;
$$;
