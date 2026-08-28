# Supabase Learning Tracker Design

**Date:** 2026-08-28  
**Project:** YoutubeDoro  
**Status:** Approved conversational design; implementation pending written-spec review

## Goal

Replace the current browser-local and Notion-backed learning tracking with an authenticated, online-only tracker backed by Supabase. Users must sign in with Google or email/password before entering the workspace. The application will persist account-owned tasks, subtasks, per-session learning history, generic-break totals, and one Markdown note per session.

## Scope

### In scope

- Supabase Auth with Google OAuth and email/password sign-up/sign-in.
- Password reset without mandatory email verification.
- Authentication-gated access to the existing tracker workspace.
- Supabase PostgreSQL storage with Row Level Security (RLS).
- Persistent account-level tasks and task-owned subtasks.
- One database record per focus session.
- One generic, configurable Break type only.
- Per-session learning seconds, break count, break seconds, title, timer mode, planned duration, status, and Markdown note.
- Online-only load/save behavior with visible network errors.
- Account-wide History with date/task filters and human-readable duration formatting.
- Direct task deletion with confirmation and cascading deletion of subtasks and linked sessions.
- One-time browser-local migration with confirmation, merge-without-overwrite behavior, and an idempotency record.
- Clearly labeled legacy summaries for old aggregate browser data.
- Complete removal of Notion runtime code, package dependency, UI, routes, settings, and configuration references.

### Out of scope

- Notion data import.
- Offline queues or conflict resolution.
- Cloud synchronization of themes, music, dashboard appearance, or other presentation preferences.
- A separate task-note model; all new written notes belong to sessions.
- Separate database rows for individual breaks; the single generic Break is aggregated on its session.

## Product decisions

1. Supabase is the authentication and database provider.
2. Sign-in is required before the tracker dashboard renders.
3. Google sign-in and email/password sign-in/sign-up are supported.
4. Email verification is disabled; password reset is supported.
5. The app is online-only after sign-in.
6. Browser data is migrated once after a user confirms a migration prompt. Notion is never read.
7. Migration merges by deterministic source keys and never overwrites cloud records. The old browser copy remains as a backup.
8. Old aggregate data is preserved as legacy summaries; unknown historical break counts display as `unknown`.
9. Tasks persist across days and own their subtasks. Sessions link to their active task.
10. A focus run creates a session when it starts and is saved even when stopped early.
11. A session title is prefilled from the selected task, remains editable, and falls back to `Untitled learning session`.
12. Each session has one optional Markdown note editable while active and after it ends.
13. There is one configurable generic Break phase. Each session stores its break count and actual break seconds.
14. Paused time is not learning time. Time does not accrue while the browser is closed.
15. Account-wide History shows sessions newest first with date/task filters.
16. History permits editing title, task, and note, but not timing measurements. Session deletion requires confirmation.
17. Deleting a task permanently deletes its subtasks and all linked sessions after confirmation.
18. Normal durations display as hours/minutes; values under one minute display seconds.
19. Session display/grouping uses the user’s local timezone; PostgreSQL stores UTC timestamps.

## Architecture

The application will remain a Next.js App Router application, but the current local-storage hooks become account-backed data hooks. Supabase Auth owns identities and sessions. Authenticated Next.js route handlers provide a single validation boundary for tracker operations, while Supabase RLS remains the final ownership boundary in the database.

The browser uses the public Supabase client for sign-in and OAuth initiation. A server Supabase client reads the authenticated cookie session in `app/page.tsx`, auth callback routes, and API route handlers. The page renders an auth surface for unauthenticated visitors and the existing workspace only for an authenticated user. The server never receives a service-role key from the browser.

All tracker writes go through focused route handlers. Route handlers validate the authenticated user, parse and constrain input, and use the user-scoped Supabase client. Destructive task deletion relies on a PostgreSQL foreign key with `ON DELETE CASCADE`, so subtasks and sessions cannot be left behind by an application bug. RLS policies independently prevent cross-user reads, updates, inserts, or deletes.

The existing anime workspace remains the visual foundation. The implementation changes its persistence and adds an authentication surface, a session note surface, a History panel, migration prompt, save/error states, and deletion confirmation.

## Database model

The migration will create the following public tables. Supabase’s existing `auth.users` table is the account owner; no duplicate application password table is created.

### `public.tasks`

| Column | Type | Rules and purpose |
| --- | --- | --- |
| `id` | `uuid` | Primary key generated by PostgreSQL |
| `user_id` | `uuid` | Required FK to `auth.users(id)` with `ON DELETE CASCADE` |
| `title` | `text` | Required, trimmed, non-blank |
| `completed` | `boolean` | Defaults to `false` |
| `estimated_minutes` | `integer` | Default `25`, constrained to the existing 5–480 minute range |
| `emoji` | `text` | Default `✦` |
| `color` | `text` | Valid six-digit hex color |
| `task_order` | `integer` | Nonnegative ordering value |
| `created_at` | `timestamptz` | Required creation timestamp |
| `updated_at` | `timestamptz` | Required last-write timestamp |
| `source_key` | `text` | Nullable deterministic browser-migration key |

Task focus totals are derived from sessions rather than stored as independent counters. This avoids divergence between History and the task progress UI.

### `public.subtasks`

| Column | Type | Rules and purpose |
| --- | --- | --- |
| `id` | `uuid` | Primary key |
| `task_id` | `uuid` | Required FK to `tasks(id)` with `ON DELETE CASCADE` |
| `text` | `text` | Required, trimmed, non-blank |
| `completed` | `boolean` | Defaults to `false` |
| `subtask_order` | `integer` | Nonnegative ordering value |
| `created_at` | `timestamptz` | Required creation timestamp |
| `updated_at` | `timestamptz` | Required last-write timestamp |

Subtask ownership is enforced through its parent task in RLS policies. A user cannot insert a subtask under another user’s task.

### `public.learning_sessions`

| Column | Type | Rules and purpose |
| --- | --- | --- |
| `id` | `uuid` | Primary key |
| `user_id` | `uuid` | Required FK to `auth.users(id)` with `ON DELETE CASCADE` |
| `task_id` | `uuid` | Nullable FK to `tasks(id)` with `ON DELETE CASCADE`; null supports untitled-task sessions |
| `task_title_snapshot` | `text` | Required title snapshot for History display |
| `title` | `text` | Required, trimmed, non-blank |
| `timer_mode` | `text` | One of the existing focus modes: `pomodoro`, `countdown`, `stopwatch`, `animedoro`, `52-17` |
| `planned_seconds` | `integer` | Nullable for modes without a target; otherwise nonnegative |
| `learning_seconds` | `bigint` | Nonnegative active focus time only |
| `break_count` | `integer` | Nonnegative for live sessions; nullable for legacy data where the count is unknown |
| `break_seconds` | `bigint` | Nonnegative actual generic-break time |
| `status` | `text` | `active`, `completed`, `stopped`, `interrupted`, or `legacy` |
| `note` | `text` | Raw optional Markdown text, default empty string |
| `started_at` | `timestamptz` | Required UTC timestamp |
| `ended_at` | `timestamptz` | Nullable until finalized |
| `source_key` | `text` | Nullable deterministic migration key |
| `created_at` | `timestamptz` | Required creation timestamp |
| `updated_at` | `timestamptz` | Required last-write timestamp |

An active session is the server checkpoint, not a background timer. The client periodically writes the current active seconds. If the next page load finds an active row from a prior browser lifetime, the recovery operation changes it to `interrupted` at its last saved values; no closed-browser time is added.

### `public.migration_runs`

| Column | Type | Rules and purpose |
| --- | --- | --- |
| `id` | `uuid` | Primary key |
| `user_id` | `uuid` | Required FK to `auth.users(id)` with `ON DELETE CASCADE` |
| `source` | `text` | Fixed value `browser-local` |
| `source_key` | `text` | Required browser-generated migration identifier |
| `summary` | `jsonb` | Counts of imported tasks, subtasks, sessions, and notes |
| `imported_at` | `timestamptz` | Required completion timestamp |

There is a unique constraint on `(user_id, source, source_key)`. A repeated request returns the existing result and does not duplicate rows.

### Indexes and policies

The migration adds indexes for `(user_id, task_order)`, `(task_id, subtask_order)`, `(user_id, created_at DESC)`, and `(user_id, task_id, created_at DESC)`. It enables RLS on every public tracker table. Task and session policies compare `user_id` to `auth.uid()`. Subtask policies use an ownership `EXISTS` check against the parent task. Migration-run policies compare `user_id` to `auth.uid()`.

All durations use integer seconds, never floating-point values. PostgreSQL uses `timestamptz`, not timestamp without timezone, and check constraints reject negative measurements and invalid statuses.

## Authentication flow

1. An unauthenticated request to `/` renders the auth screen instead of the tracker.
2. Google sign-in starts Supabase OAuth and returns through `/auth/callback`, which exchanges the authorization code for the cookie session.
3. Email sign-up creates an account and immediately permits access because email confirmation is disabled in the Supabase project configuration.
4. Email sign-in restores the session and renders the workspace.
5. Password reset requests an email and returns to a reset-password form that updates the password through Supabase Auth.
6. Sign-out clears the Supabase session and returns to the auth screen.
7. Authenticated route handlers reject missing or invalid users with `401`; ownership failures do not disclose another user’s records.

The UI distinguishes invalid credentials, unavailable network, expired session, and password-reset errors. Supabase project setup requires the local environment URL/anonymous key and a Google OAuth client configured to use the app callback URL; these values are never committed.

## Session lifecycle and data flow

### Starting focus

The active task and title are resolved before the timer starts. The client calls the session-create endpoint with the selected task, title, timer mode, planned seconds, and local start timestamp. The server stores the UTC equivalent and returns the session ID. The timer starts only after the create operation succeeds, so an online-only failure cannot create an untracked focus run.

### Running and pausing

The client owns the visible countdown/stopwatch behavior. A session recorder maintains the server checkpoint and sends learning seconds at a bounded interval, then immediately on pause. Paused time is excluded because the recorder writes active elapsed seconds, not wall-clock duration. A failed checkpoint remains visible in the workspace and is retried when the next online operation occurs; the UI never reports a successful save that the server rejected.

### Stopping and completion

Stopping finalizes the session with the current active learning seconds and `stopped` status. Timer completion finalizes it with the target or measured active seconds and `completed` status. The finalization request writes `ended_at` and the latest note, break totals, and timing values. The same session ID is used for every update, preventing duplicate rows when a user clicks a control twice.

### Generic Break

The existing rest flow is normalized to one Break phase. Its configured duration remains a local preference. Starting an explicit Break increments the current session’s `break_count`; stopping or completing it adds only the actual elapsed break seconds to `break_seconds`. YouTube rest uses the same generic-break accounting path. Pausing or stopping focus does not increment the break count.

### Browser close or refresh

No unload request is treated as reliable. On the next authenticated load, the client asks for active sessions owned by the user. Any prior active session is finalized as `interrupted` using its last server checkpoint and current note. The app does not estimate time since the last checkpoint.

## Tasks and subtasks

Tasks are loaded account-wide rather than by day. Existing task operations map to authenticated task endpoints. Subtask operations remain nested under a task and preserve the current checklist behavior. Task progress is computed from the user’s learning sessions and the task’s estimated minutes, so deleting or editing a session cannot leave a stale task counter.

Task deletion displays a confirmation containing the task title and linked-session count. After confirmation, the server deletes the task; PostgreSQL cascades to its subtasks and linked sessions. The UI removes the task from its local view only after the delete succeeds.

## Session notes and History

The active session surface contains one Markdown textarea. It auto-saves through the session update endpoint while the session is active and remains editable after finalization. The stored value is raw Markdown; preview rendering continues to escape unsafe HTML before displaying formatted content.

History is a dedicated workspace panel. It requests account-owned sessions newest first and supports local-date and task filters. Each row shows the session title, task snapshot, local date/time, status, timer mode, learning duration, break count/duration, and note availability. Legacy rows show `unknown` for a null break count.

History metadata edits are limited to title, task, and note. Learning seconds, planned seconds, break count, break seconds, status, and timestamps are immutable after finalization. Session deletion requires confirmation and permanently removes the selected record.

The shared duration formatter stores and accepts seconds but renders:

- `0` as `0 minutes` when displayed as a normal completed duration.
- `60` as `1 hour`.
- `5,400` as `1 hour 30 minutes`.
- Values under `60` as seconds, such as `45 seconds`.

The formatter omits zero units and uses correct singular/plural forms.

## Browser migration

The migration exporter reads only existing browser tracker keys. It excludes theme, music, and appearance preferences. A migration prompt displays counts and requires an explicit Import action. Cancel leaves all local data unchanged.

The exporter creates a stable browser migration key and deterministic source keys for imported records. Since the old task model was day-scoped, each legacy task uses its original day and local task ID as its source identity. Similar titles are not guessed to be the same task. Imported subtasks keep their parent task source key.

The old daily/topic learning and rest counters become `legacy` session summaries. Their title identifies the original day/topic, their known learning and rest seconds are preserved, and `break_count` is null so History displays `unknown`. Existing activity and task-oriented notes are attached to the matching legacy summary when a day/topic match exists; unmatched text becomes a dated legacy entry. No exact session boundary is fabricated.

The server inserts only records whose `(user_id, source, source_key)` identity has not been imported. Existing cloud tasks and sessions are never overwritten. A migration run is recorded only after its inserts succeed. The local copy remains available as a browser backup, while the signed-in tracker reads and writes Supabase only.

## Notion removal

The implementation deletes the Notion settings modal and sync controls, removes `useNotionSync`, `lib/notion.ts`, all `app/api/notion/*` routes, Notion-specific types/constants, Notion-related tests and docs, and the `@notionhq/client` dependency. It removes Notion environment-variable references and no longer builds or sends sync payloads. The repository must contain no runtime Notion integration path after the change.

## Error handling

- Auth failures remain on the auth surface with actionable messages.
- Expired sessions return the user to authentication without exposing tracker data.
- Failed session creates prevent the timer from starting.
- Failed checkpoints and finalizations show a persistent save error and preserve the last known client state for retry.
- Migration errors leave the local backup intact and do not record a completed migration run.
- Duplicate migration requests are safe and return the existing import summary.
- Task and session deletion require confirmation and refresh the affected list only after success.
- Empty History, no-task states, loading states, and network failures have dedicated UI states.

## Verification strategy

### Unit and model tests

- Duration formatting for hours/minutes, seconds-only values, zero, and singular/plural output.
- Session state transitions for start, pause, resume, stop, completion, interruption, and legacy status.
- Pause exclusion and generic-break count/seconds aggregation.
- Migration normalization, deterministic source keys, legacy unknown break counts, note attachment, and duplicate-safe merge behavior.
- Task/subtask mapping and session-derived task progress.

### API and database tests

- Unauthenticated requests return `401`.
- A user cannot read or modify another user’s tasks, subtasks, sessions, or migration runs.
- Task deletion cascades exactly to its subtasks and linked sessions.
- Session metadata edits cannot change immutable timing fields.
- Migration can be retried without duplicate records or cloud overwrites.
- Schema constraints reject negative durations and invalid statuses.

### Browser verification

- Auth screen renders before sign-in.
- Email/password sign-up and sign-in paths are wired; password reset form is reachable.
- Google OAuth callback route is present and configured through environment values.
- Migration prompt previews and imports browser data only.
- Starting, pausing, stopping, completing, and breaking a session persist correct values.
- History shows the saved session and formats `90` minutes as `1 hour 30 minutes`.
- Session title/note edits work; timing fields remain read-only.
- Task deletion confirmation removes the task, subtasks, and linked sessions.
- Notion UI/runtime/package references are absent.

The existing lint and build gates must pass. Live auth/database checks require configured Supabase values; an unconfigured environment is reported as an environment limitation rather than a false pass.

## Implementation boundaries

The change will preserve unrelated pre-existing working-tree changes, including screenshots, generated browser artifacts, theme assets, and the existing deleted scratch file. Only files required by this feature and its tests will be added or modified.
