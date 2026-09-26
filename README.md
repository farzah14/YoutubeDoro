# StudyRythms

The Synapse integration accepts plans with up to 200 starred courses and 400 combined priorities. Synapse may include one synthetic priority per starred course plus up to 200 selected tasks. Each priority can contain up to 100 sub-tasks; the whole plan is limited to 1,000 sub-tasks and 512 KiB.

StudyRythms is a focus timer and study dashboard that pairs anime artwork and ambient audio with task planning and session tracking. Built with Next.js 16, React 19, Tailwind CSS v4, and Supabase.

---

## Features

### Focus timers
- Five timer modes: Pomodoro, Animedoro (longer study intervals paired with video breaks), 52/17, target countdown, and open stopwatch.
- Document Picture-in-Picture window showing the live clock, current task, and active background.
- Pomodoro uses a customizable focus interval (25 minutes by default). Animedoro uses a fixed 50-minute focus interval, then Anime Break can play a supported YouTube, Vimeo, MP4, or WebM link inside StudyRythms and derive the break duration from the video.
- Web Audio completion chimes (Soft chime, Level-up, or Mute) and browser push notifications.
- Optional on-device attention monitoring uses the camera only during a running focus interval and sounds once after five continuous seconds looking away.

### Background themes
- 15 illustrated rooms, landscapes, and gradients in WebP format with optional canvas particles (stars, rain, dust).
- Independent theme and darkness overlay settings for home and focus modes.
- Support for custom background image uploads.

### Audio and soundscapes
- Built-in Web Audio noise synthesizer with five layerable channels: light rain, campfire, wind, white noise, pink noise, and brown noise.
- Lo-Fi radio stations streamed via YouTube.
- Embed player support for Spotify, Apple Music, YouTube, SoundCloud, and Amazon Music.

### Tasks and subtasks
- Priority task list with estimated durations (5 to 480 minutes), color tags, and finish-time estimates.
- Nested subtask checklists for the active priority task.
- Session time tracking tied directly to the active task.

### Study tracking and analytics
- Account-backed session history stored in Supabase with Row Level Security. Logs duration, break time, timer mode, task title snapshot, status, and session notes.
- Daily totals, weekly heatmap, and streak tracking.
- Local storage import tool to transfer existing browser data into Supabase without losing local backups.
- Google-only authentication through Supabase OAuth; there are no email/password or registration forms.

---

## Tech stack

| Layer | Technology |
| :--- | :--- |
| Framework | Next.js 16 (App Router) |
| UI and styling | React 19, Tailwind CSS v4, PostCSS |
| Database and auth | Supabase (`@supabase/supabase-js`, `@supabase/ssr`, PostgreSQL with RLS) |
| Language | TypeScript 5 |
| Media and audio | Web Audio API, `react-youtube`, Document Picture-in-Picture API |
| Validation | Zod |
| Testing | Node.js test runner (`node:test`, `node:assert/strict`) |

---

## Project structure

```text
StudyRythms/
├── app/                        # Next.js App Router
│   ├── api/                    # API route handlers
│   │   └── tracker/            # Tasks, subtasks, sessions, migration endpoints
│   ├── auth/                   # Google OAuth entry and callback routes
│   ├── globals.css             # Base styles, Tailwind directives, theme variables
│   ├── layout.tsx              # Root HTML shell and font definitions
│   └── page.tsx                # Server component router (Auth or Main dashboard)
├── components/                 # React UI components
│   ├── anime/                  # Canvas particles and background picker
│   ├── audio/                  # Lo-Fi player and procedural sound mixer
│   ├── auth/                   # Google-only sign-in card
│   ├── history/                # Session logbook and note editing
│   ├── layout/                 # Navigation, header, and workspace dock
│   ├── migration/              # Local storage data import dialog
│   ├── settings/               # Settings drawer and preferences
│   ├── stats/                  # Heatmaps, daily totals, and charts
│   ├── tasks/                  # Task queue and subtask breakdown
│   ├── timer/                  # Core timer cards and break containers
│   └── ui/                     # Design primitives (Button, Modal, Card, Input)
├── hooks/                      # Custom React hooks
│   ├── useCloudTasks.ts        # Task and subtask state management
│   ├── useFocusTimer.ts        # Timer countdown and phase engine hook
│   ├── useLocalStorage.ts      # LocalStorage persistence hook
│   ├── useSessionHistory.ts    # Session query and mutation hook
│   ├── useSessionRecorder.ts   # Session recording lifecycle checkpoints
│   └── useSoundscape.ts        # Multi-channel Web Audio sound mixer
├── lib/                        # Helpers and business logic
│   ├── animeThemes.ts          # Theme metadata and assets
│   ├── audioStreams.ts         # Radio station feeds and volume presets
│   ├── browserFeatures.ts      # AudioContext alerts and Picture-in-Picture helpers
│   ├── browserMigration.ts     # LocalStorage data extraction and export formatters
│   ├── focusTimerEngine.ts     # Pure state transition engine for timers
│   ├── musicProviders.ts       # URL parsers for Spotify, Apple Music, YouTube, etc.
│   ├── soundscapes.ts          # Procedural noise generation and audio filters
│   ├── statsModel.ts           # Streak and period aggregation math
│   ├── supabase/               # Supabase browser, server, and auth clients
│   ├── taskModel.ts            # Task progress and completion estimation
│   ├── themeConfig.ts          # Master theme definitions and palettes
│   └── trackerApi.ts           # Client API layer for tracker endpoints
├── public/                     # Static assets, WebP anime sceneries, icons
├── supabase/                   # Database migrations and policies
│   └── migrations/             # PostgreSQL RLS migrations (20260828000000_learning_tracker.sql)
├── tests/                      # Unit and contract test suite
└── types/                      # TypeScript definitions (focus, theme, tracker, workspace)
```

---

## Getting started

### 1. Clone the repository and install dependencies

```bash
git clone https://github.com/farzah14/YoutubeDoro.git
cd YoutubeDoro
npm install
```

### 2. Configure Supabase

1. Create a project at [Supabase](https://supabase.com/).
2. Copy `.env.example` to `.env.local`:
   ```bash
   cp .env.example .env.local
   ```
3. Set your Supabase credentials in `.env.local`:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_your_key_here
   NEXT_PUBLIC_SITE_URL=http://127.0.0.1:3000
   ```
   Never put a Supabase secret key in client environment variables.

4. Apply the database schema:
   - In your Supabase dashboard, open the **SQL Editor**.
   - Paste and run the contents of `supabase/migrations/20260828000000_learning_tracker.sql`.
   - This creates `tasks`, `subtasks`, `learning_sessions`, and `migration_runs` tables with Row Level Security enabled.

5. Configure Google-only authentication:
   - In **Authentication** -> **Providers** -> **Google**, enable Google and add the OAuth client ID and secret from Google Cloud.
   - In **Authentication** -> **Providers** -> **Email**, disable the Email provider.
   - In **Authentication** -> **URL Configuration**, set **Site URL** to `https://study-rythms.vercel.app` for the production project. Do not leave the production Site URL set to `http://localhost:3000`, because Supabase falls back to it when a redirect is not on the allow list.
   - In the same **URL Configuration** page, add these redirect URLs:
     - `http://localhost:3000/**`
     - `http://127.0.0.1:3000/**`
     - `http://127.0.0.1:3001/**` (if using the alternate local port)
     - `https://study-rythms.vercel.app/**`
   - Use the same hostname that is visible in the browser (`localhost` and `127.0.0.1` are different origins).
   - Add a `/**` entry for every additional deployed domain. The wildcard is required because the app enables Supabase's flow-aware PKCE callback and Supabase appends the reserved `sb_flow_id` query parameter.

StudyRythms uses Google-only authentication. A user's first Google login creates the Supabase user automatically; the application does not provide a separate registration page.

### Synapse connection

Synapse reads saved StudyRythms focus sessions through a separate, user-approved server integration. It does not use the StudyRythms browser cookie or match accounts by email. Apply `supabase/migrations/20260925000000_synapse_integration.sql` and the preparatory `supabase/migrations/20260925120000_synapse_saved_snapshots.sql` migration to the project, then deploy the updated provider consent and API code. The preparatory migration adds consent versioning without broadening the legacy change feed. Only after the updated code is live, apply `supabase/migrations/20260925130000_synapse_saved_snapshots_revoke_legacy.sql`; it disables legacy grant creation, revokes old grants, and enables the expanded change feed. Configure the server-only variables in `.env.local` and the deployment environment:

- `SUPABASE_SECRET_KEY`: Supabase secret key used only by server API routes. It bypasses Row Level Security and must never use a `NEXT_PUBLIC_` prefix or reach browser code. Integration queries still filter every row by the approved token's `user_id`.
- `SYNAPSE_CLIENT_ID`: registered Synapse client identifier.
- `SYNAPSE_CLIENT_SECRET_HASH`: base64url SHA-256 digest of a high-entropy client secret held by the Synapse server. Configure the raw secret only in Synapse; do not put it in this repository.
- `SYNAPSE_REDIRECT_URI`: the exact callback registered in Synapse. Local development uses `http://localhost:5173/api/studyrythms/callback`; production uses the matching HTTPS Synapse origin.
- `INTEGRATION_CURSOR_KEY`: at least 32 random bytes for signing initial-import cursors.

The consent screen grants `sessions:read plan:write`. Synapse reads saved focus sessions, including database snapshots of active sessions, and writes a full snapshot of only its courses marked as current priorities, explicitly selected focus tasks, and their sub-tasks to `PUT /api/integrations/v1/plan`. The provider stores these by source key, hides courses and tasks removed from the Synapse plan, and preserves linked focus sessions and native StudyRythms tasks. The most recently starred Synapse course becomes the main Current priority when its plan arrives; users can still switch to another task manually. Imported priorities and sub-tasks are managed in Synapse. Apply `supabase/migrations/20260926110000_synapse_plan_sync.sql` and `supabase/migrations/20260926120000_synapse_plan_pgcrypto_path.sql` after the previous provider migrations and before deploying the new API. The expanded permission requires each user with an older grant to reconnect and approve it again. Users can review and revoke Synapse access from StudyRythms Settings.

Use a distinct client ID, client secret, secret hash, and exact callback registration for local, staging, and production deployments. Register a separate exact HTTPS callback for each deployed environment. The integration uses fixed API paths under `STUDYRYTHMS_ORIGIN`, HTTPS outside localhost, opaque short-lived tokens, and server-to-server requests. Follow the staged migration order above before enabling Synapse Connect. Deploy StudyRythms before Synapse, then configure Synapse's matching client credentials and callback. Session-read responses contain no notes, tasks, break information, or camera data; the separate plan-write endpoint accepts only course titles, priority tasks, and sub-tasks.

### 3. Run the development server

```bash
npm run dev
```

Open `http://localhost:3000` (or `http://127.0.0.1:3000`) in your browser and keep the hostname consistent with the redirect URL you allow-listed.

---

## Testing and validation

```bash
# Run unit and contract tests
npm test

# Run TypeScript type check
npm run typecheck

# Run linter
npm run lint

# Build for production
npm run build
```

---

## Security and privacy

- **Google-only authentication**: The UI, OAuth callback, server pages, and tracker APIs accept Google identities only. Disable Supabase's Email provider so the hosted auth configuration matches the application policy.
- **Row Level Security (RLS)**: Authenticated users can only read, insert, update, and delete their own rows (`user_id = auth.uid()`). Public and anonymous access to tracker tables is revoked.
- **Local preferences**: UI themes, audio volume, and clock options are saved to browser storage and never sent to the server.
- **Data portability**: Local data can be imported into your account while keeping a local browser backup intact.
- **Attention camera**: Attention monitoring is off by default. When enabled, camera frames and head-pose results stay in the browser and are never recorded, uploaded, or stored.
- **Local model assets**: The MediaPipe runtime and Face Landmarker model are served from this application; no remote inference service receives camera data.
- **Anime Break links**: StudyRythms accepts only validated HTTPS links from supported providers. It does not proxy videos, bypass DRM, or embed arbitrary page HTML.

---

## License

This project is licensed under the MIT License.
