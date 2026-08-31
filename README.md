# YoutubeDoro 🌸

An immersive anime-themed focus workspace and learning tracker built with **Next.js 16**, **React 19**, **Tailwind CSS v4**, and **Supabase**.

YoutubeDoro combines aesthetic anime visual environments, procedural ambient soundscapes, curated Lo-Fi audio, multi-mode productivity timers (Pomodoro, Animedoro, 52/17, Countdown, Stopwatch), structured task and subtask planning, and cloud-synced learning session history with analytics.

---

## ✨ Features

### ⏱️ Multi-Mode Focus Engine
- **Multiple Timer Methods**:
  - **Pomodoro**: Classic customizable focus and break intervals.
  - **Animedoro**: Extended deep focus sessions tailored for intentional anime or video rest periods.
  - **52 / 17**: Evidence-based 52-minute focus and 17-minute recharge cycles.
  - **Countdown**: Target duration countdown for dedicated study blocks.
  - **Stopwatch**: Count-up open-ended deep work tracking.
- **Document Picture-in-Picture (PiP)**: Pop out a floating mini-timer window featuring live clock countdowns, active task snapshots, and atmospheric scene backgrounds.
- **Customizable Break Modes**:
  - **Standard Break**: Distraction-free clean countdown timer.
  - **YouTube Break**: Integrated YouTube player with built-in wellness presets (Desk & Neck Stretch, Eye Strain Relief 20-20-20, Box Breathing, Nature Walks, Cozy Cafe) or custom video links.
- **Audio & Visual Alerts**: Web Audio chime options (*Soft*, *Level-up*, or *Mute*) and optional browser push notifications.

### 🎨 Atmospheric Theme System
- **15 Curated Anime Sceneries**: High-resolution WebP artwork featuring rich color palettes and ambient particle effects (stars, rainfall, floating dust):
  - *Anime Rooms*: Night Study (Default), Rainy Evening, Sunset Study, Lantern Library, Open Sky, Cozy Café.
  - *Ambient Worlds*: Rooftop Blue Hour, Last Train Window, Forest Cabin, Forest Green, Ocean Horizon, Misty Mountains.
  - *Gradients & Colors*: Violet Sky, Anime Sky, Sakura Street.
- **Dual Workspace Theming**: Assign independent themes and overlay darkness to **Home** and **Focus** workspace slots.
- **Custom Themes**: Upload custom background imagery with adjustable overlay dimming.

### 🎧 Audio & Soundscape Engine
- **Procedural Soundscape Generator**: Real-time Web Audio noise synthesis supporting up to 5 simultaneous layered channels with independent volume sliders:
  - *Light Rain* (Highpass filtered white noise)
  - *Campfire* (Lowpass filtered brown noise)
  - *Wind* (Bandpass filtered pink noise)
  - *White Noise*, *Pink Noise*, and *Brown Noise*
- **Curated Lo-Fi Radio Stations**: Built-in YouTube audio stream player (Lofi Study Beats, Synthwave Coding, Cozy Coffee & Jazz, Binaural Alpha Waves, Gentle Rain & Thunder, Forest Stream).
- **External Music Provider Embeds**: Embed music widgets from **Spotify**, **Apple Music**, **YouTube / YouTube Music**, **SoundCloud**, and **Amazon Music**.

### 📋 Task & Subtask Planning
- **Focus Priorities**: Cloud-synced task queue with drag-and-drop reordering, estimated completion times (5–480 mins), custom emoji markers, color badges, and projected finish time calculations.
- **Subtask Breakdown**: Nested checklist system for decomposing active priorities into actionable steps with completion progress indicators.
- **Active Task Progress**: Dynamically attributes active focus timer seconds to specific tasks.

### 📊 Learning Tracker & Analytics
- **Cloud-Synced History**: Secure session logging powered by Supabase with Row Level Security (RLS). Captures start/end timestamps, net learning time, break duration, timer mode, task title snapshots, status, and session notes.
- **Daily & Weekly Analytics**: Daily totals, interactive weekly heatmaps, streak tracking (current and best streaks), and period-over-period comparisons.
- **Local-to-Cloud Migration**: Seamless one-click migration tool to transfer existing browser storage data to your authenticated Supabase account without data loss.

---

## 🛠️ Tech Stack

| Layer | Technology |
| :--- | :--- |
| **Framework** | Next.js 16 (App Router) |
| **UI & Styling** | React 19, Tailwind CSS v4, PostCSS |
| **Database & Auth** | Supabase (`@supabase/supabase-js`, `@supabase/ssr`, PostgreSQL with RLS) |
| **Language** | TypeScript 5 |
| **Media & Audio** | Web Audio API (Procedural Synthesizers), `react-youtube`, Document Picture-in-Picture API |
| **Validation** | Zod |
| **Testing** | Node.js native test runner (`node:test`, `node:assert/strict`) |

---

## 📁 Project Structure

```text
YoutubeDoro/
├── app/                        # Next.js App Router
│   ├── api/                    # Backend API Route Handlers
│   │   └── tracker/            # Tasks, subtasks, sessions, migration APIs
│   ├── auth/                   # Authentication & password reset pages
│   ├── globals.css             # Global styles, Tailwind directives & animations
│   ├── layout.tsx              # Root HTML & body shell layout
│   └── page.tsx                # Dynamic server entry point (Auth / Dashboard)
├── components/                 # UI Component Hierarchy
│   ├── anime/                  # Canvas particles, theme selector, scene pickers
│   ├── audio/                  # Lo-Fi player & procedural soundscape mixer
│   ├── auth/                   # Authentication screen & provider forms
│   ├── history/                # Session logbook, filters, and note editors
│   ├── layout/                 # Header, Hero banner, Workspace Dock, Mobile Nav
│   ├── migration/              # Browser-to-cloud data migration modal
│   ├── settings/               # Comprehensive preferences & custom theme panel
│   ├── stats/                  # Daily stats, weekly heatmaps, charts
│   ├── tasks/                  # Task queue and subtask breakdown panels
│   ├── timer/                  # Core timer cards, YouTube/Plain break containers
│   └── ui/                     # Design system primitives (Button, Modal, Card, etc.)
├── hooks/                      # Custom React Hooks
│   ├── useCloudTasks.ts        # Account-level task and subtask state management
│   ├── useFocusTimer.ts        # Focus timer execution, states, and phase transitions
│   ├── useLocalStorage.ts      # Resilient browser storage sync hook
│   ├── useSessionHistory.ts    # Session query and mutation hook
│   ├── useSessionRecorder.ts   # Session recording lifecycle checkpoints
│   └── useSoundscape.ts        # Multi-layer Web Audio soundscape controller
├── lib/                        # Utilities & Business Logic
│   ├── animeThemes.ts          # Theme metadata and assets
│   ├── audioStreams.ts         # Radio station feeds and volume presets
│   ├── browserFeatures.ts      # AudioContext alerts and Picture-in-Picture helpers
│   ├── browserMigration.ts     # LocalStorage data extraction and export formatters
│   ├── focusTimerEngine.ts     # Pure state transition engine for timers
│   ├── musicProviders.ts       # URL parsers for Spotify, Apple Music, YouTube, etc.
│   ├── soundscapes.ts          # Web Audio buffer noise generators and filters
│   ├── statsModel.ts           # Streak and period aggregation math
│   ├── supabase/               # Supabase browser, server, and auth clients
│   ├── taskModel.ts            # Task progress and completion estimation
│   ├── themeConfig.ts          # Master theme definitions and palettes
│   └── trackerApi.ts           # Client API layer for tracker endpoints
├── public/                     # Static assets, WebP anime sceneries, icons
├── supabase/                   # Database schema & migrations
│   └── migrations/             # PostgreSQL RLS migrations (20260828000000_learning_tracker.sql)
├── tests/                      # Comprehensive test suite
└── types/                      # TypeScript definitions (focus, theme, tracker, workspace)
```

---

## 🚀 Getting Started

### 1. Clone & Install Dependencies

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
3. Fill in your Supabase project credentials in `.env.local`:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_your_key_here
   NEXT_PUBLIC_SITE_URL=http://127.0.0.1:3000
   ```
   > **Note**: Never expose your Supabase service-role secret key in client-side environment variables.

4. Apply the database migration:
   - Open your Supabase project dashboard -> **SQL Editor**.
   - Copy and run the contents of `supabase/migrations/20260828000000_learning_tracker.sql`.
   - This sets up the `tasks`, `subtasks`, `learning_sessions`, and `migration_runs` tables with full Row Level Security (RLS).

5. Configure Supabase Authentication:
   - Go to **Authentication** -> **Providers** -> **Email**: Disable *Confirm email* (mandatory confirmation is not required).
   - *(Optional)* Enable **Google** provider: Add `http://127.0.0.1:3000/auth/callback` (or your production URL) to the **Redirect URLs** allowlist.

### 3. Run Development Server

```bash
npm run dev
```

Visit `http://127.0.0.1:3000` in your browser.

---

## 🧪 Testing & Validation

Run quality and build checks using the following commands:

```bash
# Execute unit and contract test suite
npm test

# Verify TypeScript type safety
npm run typecheck

# Run ESLint checks
npm run lint

# Create production build
npm run build
```

---

## 🔒 Security & Privacy

- **Row Level Security (RLS)**: Authenticated users have exclusive access to their own tasks, subtasks, and learning sessions (`user_id = auth.uid()`). Anonymous queries are revoked.
- **Client-Side Privacy**: Presentation preferences (custom themes, active music stations, timer display settings) are stored locally in browser storage.
- **Data Portability**: Legacy browser data can be safely migrated to the database while retaining an isolated local backup in the browser.

---

## 📄 License

This project is licensed under the MIT License.

