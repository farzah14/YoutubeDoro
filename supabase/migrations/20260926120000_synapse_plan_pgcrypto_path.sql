-- Supabase installs pgcrypto in extensions; keep that trusted schema ahead of public
-- so the security-definer plan function can resolve digest() on both Supabase and local Postgres.
alter function public.apply_synapse_plan(uuid, text, timestamptz, jsonb, jsonb)
  set search_path = pg_catalog, extensions, public;
