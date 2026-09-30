-- 20261001000000_remove_synapse_integration.sql
-- Decouple external Synapse integration while preserving 100% of user data,
-- study sessions, tasks, and subtasks.

-- 1. Unlock all Synapse-originated tasks and subtasks so they become standard
--    native tasks owned directly by the user.
update public.tasks
set source_key = null,
    synapse_active = true,
    synapse_course_key = null,
    updated_at = now()
where source_key like 'synapse:%';

update public.subtasks
set source_key = null,
    updated_at = now()
where source_key like 'synapse:%';

-- 2. Drop triggers and stored procedures related to Synapse synchronization
drop trigger if exists on_learning_session_synapse_change on public.learning_sessions;

drop function if exists public.apply_synapse_plan(uuid, text, timestamptz, jsonb, jsonb);
drop function if exists public.set_synapse_subtask_completion(uuid, uuid, boolean);
drop function if exists public.create_synapse_grant_v3(uuid, text, text, text, text, timestamptz);
drop function if exists public.create_synapse_grant_v2(uuid, text, text, text, text, timestamptz);
drop function if exists public.create_synapse_grant(uuid, text, text, text, text, timestamptz);
drop function if exists public.record_synapse_session_change();

-- 3. Safely drop integration-only synchronization tables
drop table if exists public.synapse_checklist_overrides cascade;
drop table if exists public.synapse_plan_state cascade;
drop table if exists public.synapse_courses cascade;
drop table if exists public.synapse_session_snapshots cascade;
drop table if exists public.synapse_session_events cascade;
drop table if exists public.integration_auth_codes cascade;
drop table if exists public.integration_session_changes cascade;
drop table if exists public.integration_change_watermarks cascade;
drop table if exists public.integration_grants cascade;
