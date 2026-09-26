alter table public.integration_grants
  add column consent_version smallint not null default 1
  check (consent_version in (1, 2));

create function public.create_synapse_grant_v2(
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
    values (p_user_id, p_client_id, 'sessions:read', 2)
    returning id into created_grant_id;

  insert into public.integration_auth_codes
    (code_hash, grant_id, client_id, redirect_uri, code_challenge, expires_at)
    values (p_code_hash, created_grant_id, p_client_id, p_redirect_uri, p_code_challenge, p_expires_at);

  return created_grant_id;
end;
$$;

revoke execute on function public.create_synapse_grant_v2(uuid, text, text, text, text, timestamptz) from public, anon, authenticated;
grant execute on function public.create_synapse_grant_v2(uuid, text, text, text, text, timestamptz) to service_role;
