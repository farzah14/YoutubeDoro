# Flocus Feature-Parity Anime Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

> **Scope revision (2026-08-28):** Ambient is no longer a workspace mode. Keep the anime scenery, visual effects, and soundscape terminology, but omit Ambient from workspace navigation, timer presentation, and theme slots. The original three-mode acceptance checks below are superseded by the Home/Focus matrix.

**Goal:** Rebuild YoutubeDoro as a close Flocus workflow and layout equivalent with original local anime scenery, Home and Focus dashboard modes, and local-first equivalents of the user-visible timer, task, soundscape, music, theme, statistics, and utility features.

**Architecture:** Keep `components/YouTubeRestTimer.tsx` as the domain orchestrator, but replace the card dashboard with a full-viewport scene and mode-specific compositions. Extend the existing local-storage domains through small pure models and hooks; use IndexedDB only for uploaded background images, Web Audio for layered local soundscapes, and native browser APIs for fullscreen, notifications, wake lock, and picture-in-picture. Do not copy Flocus branding, artwork, copy, private APIs, account system, or paywall; all implemented features remain unlocked and local to YoutubeDoro.

**Tech Stack:** Next.js 16, React 19, TypeScript, Tailwind/CSS, Web Audio API, IndexedDB, Notification API, Fullscreen API, Screen Wake Lock API, Document Picture-in-Picture where supported, existing `react-youtube`, Node 24 built-in test runner.

---

## Evidence baseline

The parity target is based on the public Flocus app, official product screenshots, and official help documentation available on 2026-08-27:

- Home: full-scene background, top-left brand, top-right quote, central greeting and clock.
- Focus: current task above a large timer, focus/short-break/long-break controls, session tally, start/pause/reset, and PiP.
- Ambient: visuals-first scene with a small corner timer.
- Persistent controls: Music and Sounds at bottom left; Home/Focus/Ambient, Settings, and Fullscreen at bottom right.
- Large transient panels: Focus Priorities, Sounds/Music, Settings, and Stats.
- Timer modes: Pomodoro, Countdown, Stopwatch, Animedoro, and 52/17.
- Tasks: drag reorder, completion, emoji, color, ETA, progress, break settings, reset, and final-task celebration.
- Soundscapes: up to five simultaneous layers, category filtering, per-layer volume, pause/restart, and coexistence with music.
- Settings: mode-specific themes, timer, stats, clock, quotes, music, extras, custom background upload and overlay.
- Utilities: notifications, alert sounds/volume, fullscreen, clear mode, wake lock, and PiP.

## Product boundary

- Match Flocus layout hierarchy, interaction placement, and user-visible workflows closely.
- Use the YoutubeDoro name, icons, text, local anime themes, and original generated/owned imagery.
- Unlock every implemented feature locally; do not reproduce Flocus accounts, billing, Plus labels, analytics, or private services.
- Support third-party music through provider URLs and embeds only. Do not request credentials or imitate private integrations.
- Keep Notes, Notion sync, and YouTube rest as YoutubeDoro extras, accessible from Settings/Extras instead of occupying the primary Flocus-style shell.

## Checkpoint order

1. Shell parity: Tasks 1-4.
2. Focus workflow parity: Tasks 5-7.
3. Audio parity: Tasks 8-9.
4. Settings, themes, and stats parity: Tasks 10-13.
5. Browser utilities and retained YoutubeDoro features: Tasks 14-15.
6. Responsive/visual verification: Tasks 16-17.

## Task 1: Freeze the current partial redesign boundary

**Files:**
- Inspect: `D:/YoutubeDoro`
- Inspect: `D:/YoutubeDoro/docs/superpowers/plans/2026-08-27-flocus-inspired-anime-ui-redesign-plan.md`
- Create: `D:/YoutubeDoro/docs/superpowers/plans/2026-08-27-flocus-feature-parity-anime-dashboard-plan.md`

- [ ] **Step 1: Capture the exact dirty worktree before parity edits**

Run:

```powershell
git status --short --branch
git diff --check
git diff --stat
```

Expected: the existing user and partial-redesign changes remain visible; no files are reset, stashed, cleaned, or broad-staged.

- [ ] **Step 2: Re-run the repository baseline**

Run:

```powershell
npm run lint
npx tsc --noEmit
npm run build
```

Expected: all commands exit `0`, or any existing failure is recorded before new edits.

- [ ] **Step 3: Mark the earlier plan as superseded operationally**

Use this new plan for all remaining work. Do not delete the earlier plan or its implementation; reshape the existing code in place.

## Task 2: Define parity state and storage migrations

**Files:**
- Modify: `D:/YoutubeDoro/types/workspace.ts`
- Create: `D:/YoutubeDoro/types/focus.ts`
- Modify: `D:/YoutubeDoro/types/index.ts`
- Modify: `D:/YoutubeDoro/lib/constants.ts`
- Create: `D:/YoutubeDoro/lib/migrations.ts`
- Create: `D:/YoutubeDoro/tests/migrations.test.ts`

- [ ] **Step 1: Write migration tests first**

Test legacy tasks with only `estimatedPomos`, legacy single-theme keys, absent preferences, and malformed stored values.

Run:

```powershell
node --experimental-strip-types --test tests/migrations.test.ts
```

Expected: FAIL because the migration helpers do not exist.

- [ ] **Step 2: Define the minimum shared contracts**

```ts
export type WorkspaceMode = "home" | "focus" | "ambient";
export type WorkspacePanel = "tasks" | "sounds" | "music" | "settings";
export type TimerMode = "pomodoro" | "countdown" | "stopwatch" | "animedoro" | "52-17";
export type TimerPhase = "focus" | "short-break" | "long-break";

export interface FocusPreferences {
  mode: TimerMode;
  focusMinutes: number;
  shortBreakMinutes: number;
  longBreakMinutes: number;
  countdownMinutes: number;
  autoStartBreaks: boolean;
  notificationEnabled: boolean;
  alertSound: "soft" | "level-up" | "none";
  alertVolume: number;
  showTaskInPip: boolean;
}
```

Extend `TaskItem` with `emoji`, `color`, `estimatedMinutes`, `focusedSeconds`, and `order`, while migrating `estimatedPomos * focusMinutes` into `estimatedMinutes`.

- [ ] **Step 3: Add namespaced storage keys and one migration entry point**

Use `ytdoro:parity:v1:*` keys for new preferences. Keep legacy keys readable and write only the new shape after migration.

- [ ] **Step 4: Run the migration check**

Run:

```powershell
node --experimental-strip-types --test tests/migrations.test.ts
npx tsc --noEmit
```

Expected: both commands exit `0`.

## Task 3: Replace the permanent card dashboard with the Flocus scene shell

**Files:**
- Modify: `D:/YoutubeDoro/components/YouTubeRestTimer.tsx`
- Modify: `D:/YoutubeDoro/components/layout/Header.tsx`
- Modify: `D:/YoutubeDoro/components/layout/HomeHero.tsx`
- Modify: `D:/YoutubeDoro/components/layout/WorkspaceDock.tsx`
- Modify: `D:/YoutubeDoro/app/globals.css`

- [ ] **Step 1: Make the app a fixed full-viewport scene**

The root must use `100dvh`, no page-level vertical scrolling, one full-bleed active background, and readable text shadows/overlays. Scroll is allowed only inside open panels.

- [ ] **Step 2: Match the persistent control placement**

Place Music and Sounds buttons at bottom left. Place the three-mode segmented switch, Settings, and Fullscreen at bottom right. Remove Tasks, Notes, and Stats from the permanent dock.

- [ ] **Step 3: Reduce Header to brand and quote anchors**

Render `YoutubeDoro` at top left and the active local quote at top right. Move date, totals, theme picker, audio dropdown, notes, and Notion out of the permanent header.

- [ ] **Step 4: Match the visual vocabulary**

Use white foreground, black translucent panels, one purple accent, restrained 12-20px radii, minimal borders, and no dashboard-card grid behind the scene.

- [ ] **Step 5: Verify shell geometry**

At 1440x900 and 390x844, confirm that all persistent controls are visible without horizontal scrolling and do not cover the central mode content.

## Task 4: Implement the true Home composition

**Files:**
- Modify: `D:/YoutubeDoro/components/layout/HomeHero.tsx`
- Modify: `D:/YoutubeDoro/components/YouTubeRestTimer.tsx`
- Modify: `D:/YoutubeDoro/app/globals.css`

- [ ] **Step 1: Render only greeting and clock at center**

Home contains a personalized time-of-day greeting, optional second line, and a very large local system clock. It must not display task, timer, rest, stats, or heatmap cards.

- [ ] **Step 2: Keep clock output hydration-safe**

Render a stable placeholder on the server, hydrate local time after mount, and support 12/24-hour settings plus optional seconds.

- [ ] **Step 3: Add generic/dynamic/hidden greeting states**

Dynamic greetings vary by time/day. Generic greetings use morning/afternoon/night. Hidden removes the greeting without shifting persistent controls.

- [ ] **Step 4: Browser-check the Home reference composition**

Expected: brand top left, quote top right, greeting/clock center, Music/Sounds bottom left, mode/settings/fullscreen bottom right.

## Task 5: Build a pure multi-mode timer engine

**Files:**
- Create: `D:/YoutubeDoro/lib/focusTimerEngine.ts`
- Create: `D:/YoutubeDoro/tests/focusTimerEngine.test.ts`
- Create: `D:/YoutubeDoro/hooks/useFocusTimer.ts`
- Modify: `D:/YoutubeDoro/hooks/useTimer.ts`

- [ ] **Step 1: Write state-transition tests**

Cover Pomodoro focus to short break, fourth session to long break, 52/17, Animedoro watch break, one-shot Countdown, upward Stopwatch, pause/resume drift, reset, and elapsed-time accounting.

Run:

```powershell
node --experimental-strip-types --test tests/focusTimerEngine.test.ts
```

Expected: FAIL because the engine does not exist.

- [ ] **Step 2: Implement pure transitions**

```ts
export interface FocusTimerState {
  mode: TimerMode;
  phase: TimerPhase;
  status: "idle" | "running" | "paused" | "done";
  targetSeconds: number;
  elapsedSeconds: number;
  completedFocusSessions: number;
}

export function advanceTimer(state: FocusTimerState, preferences: FocusPreferences): FocusTimerState;
export function getDisplaySeconds(state: FocusTimerState): number;
```

Use timestamps for running time so throttled tabs do not drift.

- [ ] **Step 3: Add the React hook as a thin adapter**

The hook owns intervals, visibility resync, persistence, callbacks, document title, and wake lock. It delegates phase decisions to the pure engine.

- [ ] **Step 4: Keep the old hook only as a compatibility adapter**

Do not maintain two countdown algorithms. Route existing callers through the new engine until old rest components are moved under Extras.

- [ ] **Step 5: Run focused checks**

Run:

```powershell
node --experimental-strip-types --test tests/focusTimerEngine.test.ts
npx tsc --noEmit
npm run lint
```

Expected: all commands exit `0`.

## Task 6: Rebuild Focus Mode around one task and one huge timer

**Files:**
- Modify: `D:/YoutubeDoro/components/timer/LearningCard.tsx`
- Modify: `D:/YoutubeDoro/components/timer/TimerDisplay.tsx`
- Modify: `D:/YoutubeDoro/components/timer/TimerControls.tsx`
- Modify: `D:/YoutubeDoro/components/timer/PomodoroCycleTracker.tsx`
- Modify: `D:/YoutubeDoro/components/YouTubeRestTimer.tsx`
- Modify: `D:/YoutubeDoro/app/globals.css`

- [ ] **Step 1: Remove the card container from Focus Mode**

Render the active task prompt above the timer, segmented Focus/Short Break/Long Break controls, session tally, oversized `MM:SS`, primary start/pause button, reset, and PiP beneath it.

- [ ] **Step 2: Open Focus Priorities from the current-task prompt**

The prompt must open the Tasks panel. The first incomplete task is active by default and remains centered one at a time.

- [ ] **Step 3: Connect all timer modes**

Pomodoro, Countdown, Stopwatch, Animedoro, and 52/17 must change the visible controls and phase behavior without remounting task/audio state.

- [ ] **Step 4: Preserve session logging**

Log exact focus and break seconds once per completed/stopped interval. Never double-count pause/resume or mode switches.

- [ ] **Step 5: Verify focus interactions**

Check start, pause, resume, reset, manual phase selection, automatic phase transition, active task visibility, and mode switching during a paused session.

## Task 7: Reach Focus Priorities task parity

**Files:**
- Modify: `D:/YoutubeDoro/hooks/useTasks.ts`
- Modify: `D:/YoutubeDoro/components/tasks/TaskQueue.tsx`
- Create: `D:/YoutubeDoro/lib/taskModel.ts`
- Create: `D:/YoutubeDoro/tests/taskModel.test.ts`
- Modify: `D:/YoutubeDoro/app/globals.css`

- [ ] **Step 1: Write pure task-model tests**

Cover add, reorder, complete, reset, ETA total, finish-time forecast, focused-progress percentage, active-task selection, and final-task completion.

- [ ] **Step 2: Implement the minimum task model**

Use array order as priority. Reorder by dragged id/target id. Clamp ETA to 5-480 minutes. Clamp progress to 0-100%.

- [ ] **Step 3: Match the large priorities panel**

Show total planned time, projected finish time, overall progress, task rows with checkbox/emoji/title/ETA/color/drag handle, Add Task, Reset, break duration, auto-start breaks, and progress-bar toggle.

- [ ] **Step 4: Make reordering accessible**

Support desktop drag/drop and explicit Move up/Move down actions for keyboard and touch users. Preserve focus after reordering.

- [ ] **Step 5: Add final-task celebration**

Use a short CSS confetti layer only when the last incomplete task becomes complete. Respect reduced motion.

- [ ] **Step 6: Run checks**

Run:

```powershell
node --experimental-strip-types --test tests/taskModel.test.ts
npx tsc --noEmit
npm run lint
```

Expected: all commands exit `0`.

## Task 8: Implement layered local soundscapes

**Files:**
- Create: `D:/YoutubeDoro/lib/soundscapes.ts`
- Create: `D:/YoutubeDoro/hooks/useSoundscape.ts`
- Create: `D:/YoutubeDoro/components/audio/SoundscapePanel.tsx`
- Modify: `D:/YoutubeDoro/components/YouTubeRestTimer.tsx`
- Modify: `D:/YoutubeDoro/app/globals.css`

- [ ] **Step 1: Define a local procedural catalog**

Provide at least Light Rain, Campfire, Wind, White Noise, Pink Noise, and Brown Noise through Web Audio nodes. Each item has id, label, emoji, category, default volume, and a start/stop factory.

- [ ] **Step 2: Implement one shared audio context**

Allow up to five active layers, per-layer volume, master pause/resume, restart, and category filtering. Create/resume AudioContext only after a user gesture.

- [ ] **Step 3: Match the bottom-left panel behavior**

Open from Sounds, anchor above the control, use tabs `Sounds`, `My Music`, `Playlist Library`, and keep playing layers alive when the panel closes or dashboard mode changes.

- [ ] **Step 4: Persist the mix**

Store active ids and volumes; recreate the mix only after the next user audio gesture, not during hydration.

- [ ] **Step 5: Verify audio isolation**

Check five-layer limit, volume independence, close/reopen continuity, mode-switch continuity, and coexistence with the music player.

## Task 9: Implement one persistent music engine and provider URLs

**Files:**
- Modify: `D:/YoutubeDoro/components/audio/LoFiPlayer.tsx`
- Modify: `D:/YoutubeDoro/lib/audioStreams.ts`
- Create: `D:/YoutubeDoro/lib/musicProviders.ts`
- Create: `D:/YoutubeDoro/tests/musicProviders.test.ts`
- Modify: `D:/YoutubeDoro/components/layout/Header.tsx`
- Modify: `D:/YoutubeDoro/components/YouTubeRestTimer.tsx`

- [ ] **Step 1: Write provider parsing tests**

Cover valid and invalid Spotify, Apple Music, YouTube, SoundCloud, and Amazon Music URLs. Reject scripts, non-HTTPS URLs, unknown hosts, and malformed ids.

- [ ] **Step 2: Keep exactly one mounted playback engine**

Move the player engine to the root so Home/Focus/Ambient switches and panel open/close never create a second iframe or stop playback.

- [ ] **Step 3: Separate engine state from panel presentation**

Music button toggles playback. Music panel selects built-in stations, volume, mute, saved provider URLs, and playlist library. All controls update the one shared engine.

- [ ] **Step 4: Add safe embeds**

Transform only allowlisted provider URLs. Use `sandbox`, restrictive `allow`, and provider-specific embed URLs. Show an explicit unsupported message when a provider blocks embedding.

- [ ] **Step 5: Run checks**

Run:

```powershell
node --experimental-strip-types --test tests/musicProviders.test.ts
npx tsc --noEmit
npm run lint
```

Expected: all commands exit `0`.

## Task 10: Implement true Ambient Mode

**Files:**
- Create: `D:/YoutubeDoro/components/timer/AmbientTimer.tsx`
- Modify: `D:/YoutubeDoro/components/YouTubeRestTimer.tsx`
- Modify: `D:/YoutubeDoro/app/globals.css`

- [ ] **Step 1: Make Ambient visuals-first**

Remove the centered Focus stage. Render only the active background and a small translucent corner timer showing phase, time, and start/pause.

- [ ] **Step 2: Reuse the same timer instance**

AmbientTimer is a view of `useFocusTimer`, not a second timer. Switching from Focus to Ambient preserves elapsed time and active task.

- [ ] **Step 3: Keep global controls visible**

Music, Sounds, mode switcher, Settings, and Fullscreen remain accessible in Ambient.

- [ ] **Step 4: Verify mode transitions**

Start in Focus, switch to Ambient, wait, switch Home, and return Focus. Confirm one continuous timer and no duplicate logging.

## Task 11: Match the full-screen Settings architecture

**Files:**
- Modify: `D:/YoutubeDoro/components/settings/SettingsPanel.tsx`
- Modify: `D:/YoutubeDoro/components/ui/OverlayPanel.tsx`
- Modify: `D:/YoutubeDoro/app/globals.css`

- [ ] **Step 1: Use a split full-screen settings surface**

Desktop uses a scenic preview on the left and dark settings content on the right. The middle rail contains Themes, Home Theme, Focus Theme, Ambient Theme, Focus Timer, Stats, Clock, Quotes, Music, Extras, Notion, and About.

- [ ] **Step 2: Keep one overlay primitive**

Settings, Focus Priorities, and Stats share focus trap, Escape close, backdrop behavior, scroll locking, labelled titles, and focus restoration.

- [ ] **Step 3: Adapt structurally on mobile**

Hide the scenic preview, replace the rail with a labelled section selector, and keep a sticky close/header area.

- [ ] **Step 4: Verify keyboard navigation**

Tab order remains inside the open settings surface, Escape closes it, and focus returns to the gear button.

## Task 12: Reach theme and custom-background parity with original anime art

**Files:**
- Modify: `D:/YoutubeDoro/types/theme.ts`
- Modify: `D:/YoutubeDoro/lib/themeConfig.ts`
- Create: `D:/YoutubeDoro/lib/customThemeStore.ts`
- Create: `D:/YoutubeDoro/tests/customThemeStore.test.ts`
- Modify: `D:/YoutubeDoro/components/settings/SettingsPanel.tsx`
- Modify: `D:/YoutubeDoro/components/anime/AmbientBackground.tsx`
- Add original assets under: `D:/YoutubeDoro/public/themes/`

- [ ] **Step 1: Keep three independent theme slots**

Home, Focus, and Ambient each store a theme id, overlay percentage, and optional custom image reference.

- [ ] **Step 2: Expand the original anime theme library**

Provide at least nine owned/generated scenes grouped as `Anime Rooms`, `Ambient Worlds`, and `Gradients & Colors`. Do not use Flocus screenshots, logos, names, or theme files.

- [ ] **Step 3: Add searchable/filterable theme cards**

Filter by type, environment, brightness, and dominant color. Selection applies immediately to the active slot.

- [ ] **Step 4: Add custom image upload**

Accept JPG/PNG/WEBP up to 5MB and minimum 800px width. Store the Blob in IndexedDB, store metadata in localStorage, expose Save/Remove, and provide a 0-90% overlay slider.

- [ ] **Step 5: Add randomize theme**

Randomize on demand and optionally on load, independently per mode. Exclude custom uploads unless the user includes them.

- [ ] **Step 6: Verify asset and upload behavior**

Check all built-in scenes, invalid file types, oversize images, too-small images, refresh persistence, remove, and fallback when IndexedDB data is unavailable.

## Task 13: Reach Focus Stats parity

**Files:**
- Create: `D:/YoutubeDoro/lib/statsModel.ts`
- Create: `D:/YoutubeDoro/tests/statsModel.test.ts`
- Modify: `D:/YoutubeDoro/components/stats/DailyStats.tsx`
- Modify: `D:/YoutubeDoro/components/stats/WeeklyHeatmap.tsx`
- Create: `D:/YoutubeDoro/components/stats/StatsChart.tsx`
- Modify: `D:/YoutubeDoro/components/settings/SettingsPanel.tsx`

- [ ] **Step 1: Write aggregation tests**

Cover Today, 7 Days, and 28 Days for focus seconds, break seconds, tasks completed, sessions, current streak, longest streak, and percent change without divide-by-zero errors.

- [ ] **Step 2: Implement pure local-history aggregation**

Read existing daily keys through an injected record map. Do not access localStorage inside the pure model.

- [ ] **Step 3: Match the Stats panel hierarchy**

Use Today/1 Week/4 Weeks tabs, five metric cards, and a recent-productivity SVG line/area chart. Keep the scenic settings preview and dark content area.

- [ ] **Step 4: Add task and session history writes**

Increment completed-task counts only on incomplete-to-complete transitions. Log focus sessions only once when completed.

- [ ] **Step 5: Run checks**

Run:

```powershell
node --experimental-strip-types --test tests/statsModel.test.ts
npx tsc --noEmit
npm run lint
```

Expected: all commands exit `0`.

## Task 14: Add clock, quote, timer-alert, and browser utility parity

**Files:**
- Modify: `D:/YoutubeDoro/components/settings/SettingsPanel.tsx`
- Modify: `D:/YoutubeDoro/components/layout/HomeHero.tsx`
- Modify: `D:/YoutubeDoro/lib/quotes.ts`
- Create: `D:/YoutubeDoro/lib/browserFeatures.ts`
- Modify: `D:/YoutubeDoro/components/YouTubeRestTimer.tsx`

- [ ] **Step 1: Add Home preferences**

Support dashboard name, 12/24-hour clock, seconds, dynamic/generic/hidden greeting, quote category, and hide quote per Home/Focus.

- [ ] **Step 2: Add timer alert preferences**

Provide Soft, Level Up, and No Alert choices with 0-100 volume and a Preview button. Prime audio from a user gesture.

- [ ] **Step 3: Add notifications**

Request permission only after the user enables the setting. Notify at timer completion. Show denied/unsupported states clearly.

- [ ] **Step 4: Add Fullscreen and Clear Mode**

Use the Fullscreen API. Clear Mode hides nonessential anchors until pointer movement, focus, or Escape; never hide the active timer controls.

- [ ] **Step 5: Add Wake Lock and PiP**

Acquire wake lock only while a timer runs and release on pause/stop. Use Document Picture-in-Picture when supported to render time, phase, and optional current task; otherwise disable PiP with an explanation.

- [ ] **Step 6: Verify unsupported-browser fallbacks**

No native API failure may crash the timer or block ordinary use.

## Task 15: Move YoutubeDoro-only features under Extras

**Files:**
- Modify: `D:/YoutubeDoro/components/settings/SettingsPanel.tsx`
- Modify: `D:/YoutubeDoro/components/notes/NotesPanel.tsx`
- Modify: `D:/YoutubeDoro/components/notes/MarkdownScratchpad.tsx`
- Modify: `D:/YoutubeDoro/components/notion/NotionSettingsModal.tsx`
- Modify: `D:/YoutubeDoro/components/timer/RestCardContainer.tsx`
- Modify: `D:/YoutubeDoro/components/YouTubeRestTimer.tsx`

- [ ] **Step 1: Remove extras from the primary Flocus-style shell**

Notes, Markdown scratchpad, Notion sync, and YouTube rest do not appear as permanent cards or dock buttons.

- [ ] **Step 2: Expose them through Settings → Extras/Notion**

Keep all existing stores and APIs. Open each feature in the shared overlay without changing timer or audio state.

- [ ] **Step 3: Preserve keyboard access**

Keep `N` for Notes, `F` for Focus/Home, and Escape for the topmost panel. Document shortcuts under Extras.

- [ ] **Step 4: Run targeted regression checks**

Verify note persistence, safe Markdown preview, Notion disconnected/error states, and saved YouTube rest presets.

## Task 16: Harden responsive behavior, accessibility, and performance

**Files:**
- Modify: `D:/YoutubeDoro/app/globals.css`
- Modify: all active components from Tasks 3-15 as findings require

- [ ] **Step 1: Lock three responsive compositions**

Verify 1440x900 desktop, 1024x768 tablet, and 390x844 mobile for Home, Focus, and Ambient.

- [ ] **Step 2: Verify every panel**

Tasks, Sounds, Music, Settings, Stats, Notes, and Notion must remain within the viewport, scroll internally, and expose their close control.

- [ ] **Step 3: Verify accessibility basics**

Every icon button has an accessible name; focus is visible; dialogs are labelled; segmented controls report selection; ranges have labels/outputs; drag reorder has keyboard alternatives; contrast remains readable over every theme.

- [ ] **Step 4: Respect reduced motion**

Disable ambient particles, confetti, parallax, and nonessential transitions under `prefers-reduced-motion: reduce`.

- [ ] **Step 5: Keep the scene fast**

Use local optimized images, lazy-decode settings thumbnails, mount one timer and one music engine, and suspend procedural sound nodes when inactive.

## Task 17: Run the parity acceptance matrix

**Files:**
- Verify: `D:/YoutubeDoro`
- Record: `D:/YoutubeDoro/docs/superpowers/plans/2026-08-27-flocus-feature-parity-anime-dashboard-plan.md`

- [ ] **Step 1: Run all automated checks fresh**

Run:

```powershell
node --experimental-strip-types --test tests/*.test.ts
npm run lint
npx tsc --noEmit
npm run build
git diff --check
```

Expected: all commands exit `0`.

- [ ] **Step 2: Run the functional matrix**

Verify all five timer modes; pause/resume/reset; phase transitions; task add/edit/reorder/complete/reset; exact task progress; five sound layers; music continuity; theme slots; custom upload; stats ranges; notifications; PiP; fullscreen; clear mode; wake lock; Notes; Notion; and YouTube rest.

- [ ] **Step 3: Run the 3x3 visual matrix**

Capture Home, Focus, and Ambient at desktop, tablet, and mobile. Compare placement against the official Flocus reference screenshots while confirming all imagery and branding are original YoutubeDoro assets.

- [ ] **Step 4: Check browser diagnostics**

Confirm no hydration mismatch, no duplicate YouTube iframe, no uncaught promise rejection, no horizontal overflow, and no new console error. Record optional Notion API errors separately when Notion is not configured.

- [ ] **Step 5: Review final scope**

Run:

```powershell
git status --short --branch
git diff --stat
git diff --check
git log --oneline --decorate -n 20
```

Stage or commit only files confirmed to belong to this parity implementation. Preserve all unrelated pre-existing changes.

## Plan self-review

- Spec coverage: shell, three modes, five timer modes, tasks, layered sounds, music URLs, settings, mode themes, uploads, stats, quotes, clock, notifications, PiP, fullscreen, clear mode, wake lock, and existing YoutubeDoro extras are mapped to tasks.
- Product boundary: visual structure and workflows target close parity; Flocus branding, proprietary artwork, private code/APIs, accounts, billing, and paywall are intentionally excluded.
- Type consistency: `WorkspaceMode`, `WorkspacePanel`, `TimerMode`, `TimerPhase`, `FocusPreferences`, and extended `TaskItem` have one definition and one migration path.
- Test strategy: pure non-UI logic uses Node 24 built-in tests; UI behavior uses browser smoke and visual matrices; no general test framework is added.
- Dependency strategy: no new runtime dependency is required. Native browser APIs and existing `react-youtube` cover the planned implementation.

## Execution handoff

This plan supersedes `2026-08-27-flocus-inspired-anime-ui-redesign-plan.md` for all future implementation. Execute inline in the current `D:/YoutubeDoro` checkout only because the user explicitly selected direct current-checkout execution. Use checkpoint reviews after Tasks 4, 7, 9, 13, and 17.
