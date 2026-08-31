# StudyRythms

StudyRythms is a focus timer and study dashboard that pairs anime artwork and ambient audio with task planning and session tracking. Built with Next.js 16, React 19, Tailwind CSS v4, and Supabase.

---

## Features

### Focus timers
- Five timer modes: Pomodoro, Animedoro (longer study intervals paired with video breaks), 52/17, target countdown, and open stopwatch.
- Document Picture-in-Picture window showing the live clock, current task, and active background.
- Two break styles: a plain timer or an embedded YouTube player with built-in stretch and breathing presets.
- Web Audio completion chimes (Soft chime, Level-up, or Mute) and browser push notifications.

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
│   ├── auth/                   # Authentication and password reset pages
│   ├── globals.css             # Base styles, Tailwind directives, theme variables
│   ├── layout.tsx              # Root HTML shell and font definitions
│   └── page.tsx                # Server component router (Auth or Main dashboard)
├── components/                 # React UI components
│   ├── anime/                  # Canvas particles and background picker
│   ├── audio/                  # Lo-Fi player and procedural sound mixer
│   ├── auth/                   # Sign in, sign up, and password reset forms
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
   Never put a service-role key in client environment variables.

4. Apply the database schema:
   - In your Supabase dashboard, open the **SQL Editor**.
   - Paste and run the contents of `supabase/migrations/20260828000000_learning_tracker.sql`.
   - This creates `tasks`, `subtasks`, `learning_sessions`, and `migration_runs` tables with Row Level Security enabled.

5. Configure authentication settings:
   - In **Authentication** -> **Providers** -> **Email**, disable **Confirm email** since this app does not require email confirmation.
   - If using Google login, enable **Google** under providers and add `http://127.0.0.1:3000/auth/callback` (or your site domain) to the redirect URL allowlist.

### 3. Run the development server

```bash
npm run dev
```

Open `http://127.0.0.1:3000` in your browser.

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

- **Row Level Security (RLS)**: Authenticated users can only read, insert, update, and delete their own rows (`user_id = auth.uid()`). Public and anonymous access to tracker tables is revoked.
- **Local preferences**: UI themes, audio volume, and clock options are saved to browser storage and never sent to the server.
- **Data portability**: Local data can be imported into your account while keeping a local browser backup intact.

---

## License

This project is licensed under the MIT License.
