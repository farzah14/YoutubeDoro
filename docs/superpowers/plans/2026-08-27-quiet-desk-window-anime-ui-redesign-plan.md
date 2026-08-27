# Quiet Desk Window Anime UI Redesign Implementation Plan

> For agentic workers: REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox syntax for tracking.

**Goal:** Replace YoutubeDoro's partial photo-based anime dashboard with a distinctive local illustrated Cozy Anime / Lo-fi Study interface across desktop, tablet, and mobile while preserving existing timer, task, statistics, notes, persistence, and Notion behavior.

**Architecture:** Keep components/YouTubeRestTimer.tsx as the domain/UI orchestration boundary. Consolidate the three themes into semantic CSS tokens, render three local SVG environments through one lightweight ambient component, and recompose existing shell, focus, task, and statistics components with responsive CSS. Do not add an animation package, UI framework, test runner, or image-host dependency.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Tailwind CSS 4, existing CSS custom properties, inline/local SVG, existing useLocalStorage, and the current npm lint/build scripts.

---

## File map and ownership

### Create

- public/themes/night-study.svg — local ink-navy night study-room/window scene.
- public/themes/rainy-evening.svg — local blue-gray rainy window/city scene.
- public/themes/sunset-study.svg — local plum/peach golden-hour study scene.

### Modify

- types/theme.ts — three-theme union and theme config metadata.
- lib/themeConfig.ts — one ordered three-theme registry using local asset paths.
- app/layout.tsx — initial theme paint and global metadata/theme color.
- app/globals.css — semantic tokens, flat surfaces, ambient effects, layout helpers, focus states, and reduced-motion rules.
- components/YouTubeRestTimer.tsx — dataset theme application and responsive composition only.
- components/anime/AmbientBackground.tsx — local scene plus CSS/SVG ambience; no canvas.
- components/anime/ThemeSelector.tsx — exactly three keyboard-accessible theme options.
- components/layout/Header.tsx — quiet top bar while keeping existing utility handlers.
- components/layout/MobileNav.tsx — accessible mobile navigation.
- components/notion/NotionSyncButton.tsx — quiet non-blocking sync/error treatment.
- components/timer/LearningCard.tsx — focus-stage hierarchy using the existing useTimer contract.
- components/timer/TimerDisplay.tsx — readable mode/time hierarchy and responsive ring usage.
- components/timer/TimerControls.tsx — dominant primary action and subordinate secondary actions.
- components/timer/PomodoroCycleTracker.tsx — quiet session markers.
- components/tasks/TaskQueue.tsx — Current Task, Up Next, empty state, and keyboard-visible actions.
- components/stats/DailyStats.tsx — progressive focus/goal/stat hierarchy.
- components/stats/WeeklyHeatmap.tsx — theme-derived intensity and useful no-data copy.
- components/ui/Card.tsx, Button.tsx, Badge.tsx, Input.tsx, Segmented.tsx, ProgressRing.tsx — shared visual primitives.

### Leave untouched unless a targeted validation fix requires it

- hooks/useTimer.ts — timer state machine and callbacks.
- hooks/useTasks.ts — task persistence and mutation behavior.
- hooks/useDailyNotes.ts — daily note semantics.
- hooks/useNotionSync.ts — sync state, debounce, validation, pull, and API behavior.
- lib/storage.ts, lib/time.ts, lib/streak.ts, lib/constants.ts — domain semantics and storage keys.
- components/anime/AnimeParticles.tsx and components/anime/AnimeSceneryPicker.tsx — existing untracked/legacy files are not part of the new primary path; do not delete them.

## Task 1: Establish the baseline and protect the dirty working tree

**Files:** Read-only repository status and validation output.

- [ ] Step 1: Record current checkout state.

Run:

~~~
git status --short --branch
git diff --stat
~~~

Expected: main is reported with the user's existing modified and untracked files. Do not stage, reset, or overwrite those files.

- [ ] Step 2: Run the current lint and build before edits.

Run:

~~~
npm run lint
npm run build
~~~

Record each command as PASS or its exact failure. Keep pre-existing failures separate from redesign regressions.

- [ ] Step 3: Confirm current runtime ownership.

Run:

~~~
rg -n "unsplash|backgroundUrl|AnimeSceneryPicker|AnimeParticles|useTimer|useTasks|NotionSyncButton" app components hooks lib types
~~~

Expected: remote scene URLs and current canvas/scenery definitions are visible; timer/task/Notion ownership is confirmed before presentation edits.

## Task 2: Create local illustrated environments and a single theme registry

**Files:** Create public/themes/night-study.svg, public/themes/rainy-evening.svg, public/themes/sunset-study.svg. Modify types/theme.ts and lib/themeConfig.ts.

- [ ] Step 1: Add the Night Study vector scene.

Create a 1600x1000 SVG with an ink-navy sky, pale crescent moon, fewer than 20 small stars, dark window frame, angular rooftops, warm desk-lamp shape, and quiet desk silhouette. Include no people, faces, mascot, or character.

Use this contract:

~~~
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 1000" role="img" aria-labelledby="title desc">
  <title id="title">Night study window</title>
  <desc id="desc">An illustrated navy study room with moonlight, distant rooftops, and a warm desk lamp.</desc>
  <rect width="1600" height="1000" fill="#091424" />
  <circle cx="1240" cy="220" r="86" fill="#f5f0e7" />
  <path d="M0 700 230 560 420 670 650 500 920 690 1170 520 1600 710V1000H0Z" fill="#122238" />
  <rect x="120" y="90" width="1360" height="720" fill="none" stroke="#36506b" stroke-width="22" />
  <rect y="810" width="1600" height="190" fill="#0d1b2e" />
</svg>
~~~

Add the remaining stars, window details, lamp, and desk shapes to this valid base. Do not use an external image, remote URL, or full-screen blur filter.

- [ ] Step 2: Add the Rainy Evening vector scene.

Create this concrete static scene and then add the requested window details:

~~~
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 1000" role="img" aria-labelledby="title desc">
  <title id="title">Rainy evening window</title>
  <desc id="desc">An illustrated blue-gray room with a rain-marked window and muted city reflections.</desc>
  <rect width="1600" height="1000" fill="#0f2030" />
  <rect x="120" y="90" width="1360" height="720" fill="#17344a" stroke="#45647a" stroke-width="22" />
  <path d="M120 650 260 560 390 630 560 500 760 640 940 530 1120 620 1310 480 1480 600V810H120Z" fill="#11283b" />
  <rect y="810" width="1600" height="190" fill="#0c1a28" />
  <path d="M290 810h230v35H290zM1060 810h250v35h-250z" fill="#6fa7bc" opacity=".32" />
  <path d="M310 160 270 250M430 220 390 310M610 130 570 220M820 250 780 340M1110 140 1070 230M1330 230 1290 320" stroke="#bde1ee" stroke-width="6" opacity=".35" />
</svg>
~~~

Keep the scene static; CSS ambience will provide restrained motion.

- [ ] Step 3: Add the Sunset Study vector scene.

Create this concrete static scene and then add the requested desk details:

~~~
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 1000" role="img" aria-labelledby="title desc">
  <title id="title">Sunset study window</title>
  <desc id="desc">An illustrated plum study room with peach sunset light, soft clouds, and a quiet desk.</desc>
  <rect width="1600" height="1000" fill="#2d1e31" />
  <rect x="130" y="100" width="1340" height="700" fill="#d88978" />
  <circle cx="1110" cy="420" r="120" fill="#ffd28c" />
  <path d="M160 420c150-90 230 70 380-20 150-90 210 80 360-10 150-90 240 30 540-50v460H160Z" fill="#8a526f" opacity=".6" />
  <rect x="130" y="100" width="1340" height="700" fill="none" stroke="#70465b" stroke-width="22" />
  <rect y="800" width="1600" height="200" fill="#3c2638" />
  <path d="M460 820h360v28H460zM500 848h280v26H500z" fill="#f4b37a" opacity=".55" />
</svg>
~~~

Use no character or mascot imagery.

- [ ] Step 4: Define the exact theme config contract.

Use:

~~~
export type CozyAnimeTheme = "night-study" | "rainy-evening" | "sunset-study";

export interface ThemeConfig {
  id: CozyAnimeTheme;
  name: string;
  jpName: string;
  description: string;
  backgroundUrl: string;
  previewColor: string;
  accentColor: string;
  ambientType: "stars" | "rain" | "dust";
  sceneAlt: string;
}
~~~

In lib/themeConfig.ts define DEFAULT_THEME as night-study, define THEME_ORDER as the three union values in Night Study, Rainy Evening, Sunset Study order, and use exactly these local paths:

~~~
/themes/night-study.svg
/themes/rainy-evening.svg
/themes/sunset-study.svg
~~~

Keep COZY_THEMES as the registry consumed by the selector and ambient component. Remove all Unsplash URLs from this theme path.

- [ ] Step 5: Verify and commit the asset boundary.

Run:

~~~
rg -n "https?://|unsplash|<image" public/themes lib/themeConfig.ts
~~~

Expected: no output.

Commit only these asset/config files:

~~~
git add public/themes types/theme.ts lib/themeConfig.ts
git commit -m "feat: add local cozy study scenes"
~~~

## Task 3: Establish semantic theme paint and no-flash initialization

**Files:** Modify app/layout.tsx, app/globals.css, components/YouTubeRestTimer.tsx.

- [ ] Step 1: Add early theme initialization in app/layout.tsx.

Before the app body paints, read only ytdoro:theme, validate it against the three allowed IDs, and set document.documentElement.dataset.theme. Use a safe fallback to night-study:

~~~
const themeBootstrap = [
  "(function () {",
  "  try {",
  "    var saved = window.localStorage.getItem('ytdoro:theme');",
  "    var allowed = ['night-study', 'rainy-evening', 'sunset-study'];",
  "    var theme = saved ? JSON.parse(saved) : 'night-study';",
  "    document.documentElement.dataset.theme = allowed.indexOf(theme) >= 0 ? theme : 'night-study';",
  "  } catch (_) {",
  "    document.documentElement.dataset.theme = 'night-study';",
  "  }",
  "})();",
].join("\n");
~~~

Render it in head, set the html fallback dataset to night-study, and use suppressHydrationWarning only if the dataset mismatch requires it. Keep existing fonts, lang, manifest, and metadata.

- [ ] Step 2: Replace class theme selectors with semantic data selectors.

In app/globals.css use selectors shaped like this:

~~~
:root {
  color-scheme: dark;
  background: var(--bg);
}

[data-theme="night-study"] {
  --bg: #091424;
  --fg: #f5f0e7;
  --surface: #142238;
  --surface-secondary: #1c2d45;
  --surface-hover: #263b58;
  --border: #36506b;
  --border-subtle: #2a4058;
  --border-focus: #f6c76d;
  --text-muted: #9aaabd;
  --text-secondary: #c5d0db;
  --accent: #f6c76d;
  --accent-soft: rgba(246, 199, 109, 0.14);
  --accent-hover: #e8aa4e;
  --accent-fg: #151b25;
  --timer-focus: #f6c76d;
  --timer-break: #91d8ef;
  --shadow-card: 0 18px 45px rgba(2, 9, 18, 0.32);
}
~~~

Add concrete equivalent token blocks for Rainy Evening using deep desaturated blue and pale cyan, and Sunset Study using aubergine and peach-gold. Keep Tailwind @theme aliases mapped to semantic variables.

- [ ] Step 3: Apply the dataset from the client orchestrator.

Replace the current document class-removal effect with:

~~~
useEffect(() => {
  const validTheme =
    currentTheme === "rainy-evening" || currentTheme === "sunset-study"
      ? currentTheme
      : "night-study";
  document.documentElement.dataset.theme = validTheme;
}, [currentTheme]);
~~~

Do not read or write timer, task, notes, statistics, or Notion keys in this effect.

- [ ] Step 4: Define flat surface primitives.

Add quiet-panel, ink-rule, and focus-ring styles. Surfaces use solid/high-opacity theme colors, a 1px border, radius at most 14px, and directional shadow. Do not use backdrop-filter in the primary surfaces.

- [ ] Step 5: Validate and commit.

Run:

~~~
rg -n "theme-night-study|theme-rainy-evening|theme-sunset-study|data-theme|backdrop-blur|backgroundUrl" app components lib types
npm run lint
~~~

Expected: runtime theme application uses data-theme, no primary surface relies on backdrop blur, and lint has no new errors.

Commit:

~~~
git add app/layout.tsx app/globals.css components/YouTubeRestTimer.tsx
git commit -m "feat: add semantic cozy theme tokens"
~~~

## Task 4: Build the lightweight ambient layer and accessible theme selector

**Files:** Modify components/anime/AmbientBackground.tsx, components/anime/ThemeSelector.tsx, app/globals.css.

- [ ] Step 1: Replace the canvas with local artwork layers.

AmbientBackground returns a pointer-transparent stack with this hierarchy:

~~~
<div className={"ambient-background ambient-" + theme} aria-hidden="true">
  <div className="ambient-scene" />
  <div className="ambient-clouds" />
  <div className="ambient-stars" />
  <div className="ambient-rain" />
  <div className="ambient-dust" />
  <div className="ambient-overlay" />
</div>
~~~

Set the scene background image from the local COZY_THEMES entry. Do not create a requestAnimationFrame loop or a second particle component. Keep all layers below the application shell with z-index 0 and pointer-events none.

- [ ] Step 2: Add restrained CSS ambience.

Use a finite CSS layer for rain and similarly sparse layers for stars, clouds, and dust:

~~~
.ambient-rain {
  position: absolute;
  inset: 0;
  opacity: 0;
  background-image: repeating-linear-gradient(
    108deg,
    transparent 0 34px,
    rgba(189, 225, 238, 0.16) 35px 36px,
    transparent 37px 72px
  );
  animation: rain-drift 1.8s linear infinite;
}

.ambient-rainy-evening .ambient-rain {
  opacity: 0.45;
}
~~~

Use transform/opacity animation only. Add reduced-motion rules that set animation to none and use static low opacity. Lower decorative opacity on narrow screens.

- [ ] Step 3: Make the selector exactly three options.

Iterate THEME_ORDER. Each option has role menuitemradio, aria-checked, local preview, name, and concise description. The trigger has aria-expanded, aria-haspopup=menu, and an accessible label. Preserve Escape close, outside-click close, and close-after-selection behavior without page reload.

- [ ] Step 4: Verify no duplicate primary ambience path.

Run:

~~~
rg -n "AnimeParticles|requestAnimationFrame|canvas|AnimeSceneryPicker|unsplash|backdrop-filter" components/anime app/globals.css
npm run lint
~~~

Expected: the primary ambient path has no canvas/animation loop, the primary selector has no scenery picker, and no remote artwork remains.

Commit:

~~~
git add components/anime/AmbientBackground.tsx components/anime/ThemeSelector.tsx app/globals.css
git commit -m "feat: add lightweight illustrated ambience"
~~~

## Task 5: Redesign the shell, utility bar, and mobile navigation

**Files:** Modify components/layout/Header.tsx, components/layout/MobileNav.tsx, components/notion/NotionSyncButton.tsx, components/YouTubeRestTimer.tsx.

- [ ] Step 1: Recompose the header around real actions.

Keep today, focus/rest totals, ThemeSelector, LoFiPlayer, Notion, notes, and settings handlers. Use a semantic header and nav labelled Workspace tools. Order: brand/date, compact totals, theme, Lo-fi, sync, notes, settings. Do not invent routes for Library or Analytics.

Use brand copy YoutubeDoro plus a small Quiet focus room label. Japanese copy stays secondary and readable. Replace emoji-only visual labels with text or existing SVG icons.

- [ ] Step 2: Localize Notion error emphasis.

Preserve onSync, onOpenSettings, syncState.status, syncState.error, and lastSync. The error branch becomes a compact button with a subtle danger border and accessible name Notion sync error. Open settings for details. The title still exposes the actual error string when present. Do not block timer/task controls.

- [ ] Step 3: Make mobile navigation accessible.

Keep MobileTab = focus | tasks | stats and onOpenNotes. Render below md, give every button min-height 44px, set aria-current on the active tab, and keep Notes separate from the three content tabs. Do not change panel visibility logic.

- [ ] Step 4: Add stable workspace landmarks.

Keep one React component tree. Add IDs/landmarks for focus, tasks, and stats and use workspace-grid classes for the desktop three-zone layout. Do not duplicate LearningCard, TaskQueue, or statistics components for mobile.

- [ ] Step 5: Validate and commit.

Run:

~~~
npm run lint
npm run build
~~~

Expected: no new lint/type/build failures.

Commit:

~~~
git add components/layout/Header.tsx components/layout/MobileNav.tsx components/notion/NotionSyncButton.tsx components/YouTubeRestTimer.tsx
git commit -m "feat: redesign workspace shell and navigation"
~~~

## Task 6: Make the focus stage the visual center

**Files:** Modify components/timer/LearningCard.tsx, TimerDisplay.tsx, TimerControls.tsx, PomodoroCycleTracker.tsx, components/ui/ProgressRing.tsx, Card.tsx, Button.tsx, Badge.tsx, Input.tsx, Segmented.tsx.

- [ ] Step 1: Preserve the exact timer interface.

Keep the existing useTimer call and these callbacks: onDone, onStop, onStartWithTitle, onLearnDone, onLearnStop, timer.pause, timer.resume, timer.stop, and timer.reset. Do not add an interval, elapsed-time calculation, or timer store to presentation components.

- [ ] Step 2: Reshape LearningCard hierarchy.

Use a semantic section with this order: focus heading/status, TimerDisplay, current topic or selected-task row, TimerControls, PomodoroCycleTracker, then topic input and duration selector while idle. Keep the existing props and handlers; the structure adds no domain fields.

- [ ] Step 3: Make ProgressRing responsive without changing its math.

Keep radius, circumference, clamped progress, and stroke-dashoffset formulas. Change only the wrapper to a responsive square:

~~~
<div className="relative inline-flex aspect-square w-full max-w-[320px]">
  <svg className="h-full w-full -rotate-90" viewBox={"0 0 " + size + " " + size}>
    <!-- existing circles and stroke math -->
  </svg>
</div>
~~~

Pass a 260–320px maximum from TimerDisplay and reduce it below 420px viewport width. Keep the time display in JetBrains Mono and prevent 250ms updates from being announced by assistive technology.

- [ ] Step 4: Make controls intentional.

Start/Pause/Resume is the only high-contrast primary action. Stop and reset remain visible but subdued. Icon-only controls retain a title and accessible name. Focus rings use the theme border-focus token.

- [ ] Step 5: Restyle support elements.

Show four quiet session markers, a text count, and reset/long-break controls. Keep PRESETS, initialBreakMin, and completion callbacks unchanged.

- [ ] Step 6: Validate timer ownership and commit.

Run:

~~~
rg -n "setInterval|Date\\.now|targetSec|elapsedSec|remainingSec|useTimer" components/timer components/YouTubeRestTimer.tsx hooks/useTimer.ts
npm run lint
npm run build
~~~

Expected: the only timer engine remains hooks/useTimer.ts.

Commit:

~~~
git add components/timer/LearningCard.tsx components/timer/TimerDisplay.tsx components/timer/TimerControls.tsx components/timer/PomodoroCycleTracker.tsx components/ui/ProgressRing.tsx components/ui/Card.tsx components/ui/Button.tsx components/ui/Badge.tsx components/ui/Input.tsx components/ui/Segmented.tsx
git commit -m "feat: make focus stage the visual anchor"
~~~

## Task 7: Redesign Current Task and Up Next without changing task semantics

**Files:** Modify components/tasks/TaskQueue.tsx and components/YouTubeRestTimer.tsx.

- [ ] Step 1: Preserve the task callback contract.

Keep tasks, activeTaskId, currentTopic, onSelectTask, onAddTask, onToggleTask, and onDeleteTask unchanged. Do not add a second task array, alternate storage key, or new status.

- [ ] Step 2: Split visible hierarchy.

Render Task Queue, Current Task, the existing add-task form, Up Next, and an expandable Completed section in that order. If no task is active, show Nothing selected yet and keep the first add action prominent. Use only existing task text and estimated/completed pomodoro fields.

- [ ] Step 3: Fix empty state and keyboard visibility.

Use copy A clear desk starts with one small task. Add a visible Add your first task action that focuses or uses the existing input. Make Focus/Delete controls visible on focus-within and discoverable without hover. Keep complete/delete labels.

- [ ] Step 4: Add presentation-only completed state.

Use local showCompleted state to move completed items below an expandable Completed summary. Do not change TaskItem values, persistence, or received order. Do not introduce drag-and-drop in this pass.

- [ ] Step 5: Validate and commit.

Run:

~~~
rg -n "onSelectTask|onAddTask|onToggleTask|onDeleteTask|tasksByDay|TaskItem" components/tasks components/YouTubeRestTimer.tsx hooks/useTasks.ts
npm run lint
~~~

Expected: task mutations still originate in useTasks/existing callbacks.

Commit:

~~~
git add components/tasks/TaskQueue.tsx components/YouTubeRestTimer.tsx
git commit -m "feat: clarify current task and queue"
~~~

## Task 8: Give statistics a progressive hierarchy and useful no-data state

**Files:** Modify components/stats/DailyStats.tsx and components/stats/WeeklyHeatmap.tsx.

- [ ] Step 1: Keep calculations unchanged.

Do not change goalSec, totalLearnSec, totalRestSec, pomodoroRounds, calculateStreak(today), PRESETS.defaultGoalHours, storage keys, or heatmap day construction. Change only markup/classes and presentation-only empty-state copy.

- [ ] Step 2: Recompose DailyStats.

Use this hierarchy: Focused today as the largest value; goal progress and editable goal select; a compact divider row for Sessions, Rest, and Streak; goal-reached status as a quiet accent state rather than a constantly pulsing badge. Keep the native select and add aria-label Change daily focus goal.

- [ ] Step 3: Make WeeklyHeatmap theme-aware.

Replace hard-coded emerald classes with the existing intensity value exposed through a CSS variable:

~~~
<div
  className="heatmap-cell"
  style={{ "--heat": intensity } as React.CSSProperties}
  title={day.date + ": " + formatMMSS(day.learnSec)}
/>
~~~

Use the theme accent with a solid fallback. If all 28 values are zero, show No focus logged yet — your first session will light up this row. Keep the 28-day structure.

- [ ] Step 4: Validate and commit.

Run:

~~~
rg -n "calculateStreak|goalSec|totalLearnSec|totalRestSec|pomodoroRounds|learnByDay" components/stats hooks lib
npm run lint
npm run build
~~~

Expected: formulas/storage reads remain in existing locations.

Commit:

~~~
git add components/stats/DailyStats.tsx components/stats/WeeklyHeatmap.tsx
git commit -m "feat: clarify daily progress and activity"
~~~

## Task 9: Finish responsive layout, accessibility, and motion rules

**Files:** Modify app/globals.css, components/YouTubeRestTimer.tsx, Header.tsx, MobileNav.tsx, LearningCard.tsx, TaskQueue.tsx, DailyStats.tsx.

- [ ] Step 1: Add the approved layout breakpoints.

Use this grid behavior:

~~~
.workspace-grid {
  display: grid;
  gap: 1rem;
  grid-template-columns: 1fr;
}

@media (min-width: 768px) {
  .workspace-grid {
    grid-template-columns: minmax(0, 1fr) minmax(18rem, 0.8fr);
  }
}

@media (min-width: 1180px) {
  .workspace-grid {
    grid-template-columns: minmax(13rem, 0.72fr) minmax(30rem, 1.55fr) minmax(18rem, 0.95fr);
  }
}
~~~

At desktop the statistics row spans all columns. At tablet focus is first and task rail second. At mobile stack focus, task rail, daily summary, and heatmap and reserve bottom-nav padding.

- [ ] Step 2: Remove remaining visual slop.

Run rg for rounded-full, backdrop-blur, animate-pulse, animate-ping, and shadow-2xl in the primary path. Replace decorative uses with restrained radius, animation, and shadow classes. Keep rounded-full only for the progress ring, status dots, and genuinely circular icon buttons. Add min-width: 0 where text can truncate.

- [ ] Step 3: Add reduced-motion and focus coverage.

Keep a global reduced-motion block that disables cloud/rain/dust/star animation and reduces theme transitions. Add a two-pixel focus-visible outline with one-pixel offset. Verify each icon-only button has an accessible name and each field has a label, placeholder, or aria-label.

- [ ] Step 4: Keep app state independent from responsive state.

Do not add layout-specific domain state. mobileTab, notesOpen, focusMode, and theme remain UI state; timer/task/statistics values remain in existing hooks and storage callbacks.

- [ ] Step 5: Validate and commit.

Run:

~~~
rg -n "aria-label|aria-expanded|aria-current|focus-visible|prefers-reduced-motion|backdrop-blur|animate-pulse|animate-ping" app components
npm run lint
npm run build
~~~

Expected: required accessibility selectors exist, prohibited heavy effects are absent from the primary path, and lint/build are clean.

Commit:

~~~
git add app/globals.css components/YouTubeRestTimer.tsx components/layout/Header.tsx components/layout/MobileNav.tsx components/timer/LearningCard.tsx components/tasks/TaskQueue.tsx components/stats/DailyStats.tsx
git commit -m "feat: polish responsive cozy workspace"
~~~

## Task 10: Run smoke checks and the nine-condition visual QA matrix

**Files:** Read-only validation of the completed redesign.

- [ ] Step 1: Run repository gates.

Run:

~~~
npm run lint
npm run build
~~~

Expected: both pass. If either fails, record the exact command, error, and whether the baseline run showed the same failure.

- [ ] Step 2: Start the local production server.

Run in a separate terminal:

~~~
npm run start -- --hostname 127.0.0.1 --port 3000
~~~

Expected: the app serves at http://127.0.0.1:3000.

- [ ] Step 3: Verify functional regressions.

Record each applicable result:

~~~
[ ] Start focus timer
[ ] Pause running timer
[ ] Resume paused timer
[ ] Stop/reset timer
[ ] Focus-to-break transition
[ ] Create a task
[ ] Select a task as current topic
[ ] Complete and delete a task
[ ] Task/session progress persists after reload
[ ] Statistics/session count update
[ ] Select all three themes
[ ] Selected theme persists after reload
[ ] Theme change leaves domain state untouched
[ ] Escape closes theme menu and dialogs
[ ] Keyboard focus is visible
[ ] Reduced-motion preference disables ambience movement
~~~

- [ ] Step 4: Review the nine visual conditions.

Check representative widths desktop 1440x900, tablet 1024x900, and mobile 390x844:

~~~
[ ] Night Study — desktop
[ ] Night Study — tablet
[ ] Night Study — mobile
[ ] Rainy Evening — desktop
[ ] Rainy Evening — tablet
[ ] Rainy Evening — mobile
[ ] Sunset Study — desktop
[ ] Sunset Study — tablet
[ ] Sunset Study — mobile
~~~

For every condition record timer priority, text contrast, Current Task/Up Next hierarchy, navigation, intentional artwork crop, no overflow, ambience behind content, and restrained motion.

- [ ] Step 5: Inspect final scope and report honestly.

Run:

~~~
git status --short --branch
git log -10 --oneline --decorate
git diff origin/main...HEAD --stat
~~~

Expected: redesign commits are visible; unrelated existing working-tree changes are not included in redesign commits. Report all changed files, preserved domain interfaces, validation results, and unresolved baseline or visual limitations.

## Plan self-review

- Spec coverage: local scenes/no hotlinks are covered by Task 2; semantic tokens/no-flash theme persistence by Task 3; CSS/SVG ambience/reduced motion by Tasks 4 and 9; desktop/tablet/mobile composition by Tasks 5 and 9; focus/task/statistics hierarchy by Tasks 6–8; accessibility/performance by Tasks 4, 6, 7, and 9; functional and nine-condition visual QA by Task 10; non-goals are preserved because no backend, timer engine, formula, framework, or dependency migration is planned.
- Completeness scan: no task markers or unresolved decisions appear in the plan. SVG steps define exact scene content and all implementation files have explicit owners, commands, and expected results.
- Type consistency: CozyAnimeTheme, ThemeConfig, THEME_ORDER, COZY_THEMES, the ytdoro:theme key, currentTheme, and existing timer/task callback names are consistent across tasks.
- Scope check: all work belongs to one presentation redesign around the same application shell and domain boundaries; no independent backend or product subsystem is introduced.
