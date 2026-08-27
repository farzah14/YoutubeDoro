# Flocus-Inspired Anime Focus UI Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox syntax for tracking.

**Goal:** Recompose YoutubeDoro into an original anime-scenery focus environment with Flocus-inspired Home, Focus, Ambient, floating panels, and utility-dock interactions while preserving existing timer, task, statistics, notes, persistence, YouTube, and Notion behavior.

**Architecture:** Keep components/YouTubeRestTimer.tsx as the domain/UI orchestration boundary and add a small presentation-state model for workspace modes and open panels. Reuse the existing timer, task, notes, statistics, audio, and Notion interfaces; change their composition through one shared overlay-panel primitive, one responsive dock, and the existing local semantic theme system. Do not add a second timer engine, task store, statistics calculator, UI framework, or animation library.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Tailwind CSS 4, CSS custom properties, local SVG scenes, existing useLocalStorage, existing YouTube player integration, and the repository's npm run lint / npm run build checks.

---

## Execution constraints

- Work directly in D:/YoutubeDoro, as explicitly requested by the user.
- Do not reset, clean, stash, or overwrite unrelated dirty worktree changes.
- Before modifying an already-dirty file, inspect and record its current diff. Stage only intentional redesign hunks; never use a broad git add ..
- Preserve the existing ytdoro: storage keys. New presentation preferences use additional namespaced keys and must retain the legacy theme fallback.
- No new dependency is required for the base redesign. Use existing CSS, SVG, native controls, and current components.
- The base redesign does not implement Flocus accounts, Plus/paywall behavior, Spotify authentication, custom uploads, video backgrounds, new timer algorithms, subtasks, drag ordering, or expanded analytics calculations.
- The user approved the design specification before this plan was written. Implementation remains gated until the user chooses Inline Execution or another execution path.

## Current code map

### Domain orchestration

- D:/YoutubeDoro/components/YouTubeRestTimer.tsx owns daily state, timer callbacks, task callbacks, notes, Notion synchronization, theme state, focus mode, and modal state.
- D:/YoutubeDoro/hooks/useTimer.ts owns timer lifecycle and notifications.
- D:/YoutubeDoro/hooks/useTasks.ts owns task persistence and task mutations.
- D:/YoutubeDoro/hooks/useDailyNotes.ts owns daily activity-note persistence.
- D:/YoutubeDoro/hooks/useNotionSync.ts owns Notion connection and synchronization state.

### Existing presentation surfaces

- D:/YoutubeDoro/components/layout/Header.tsx renders the current brand, date, totals, theme selector, radio, notes, and Notion/settings controls.
- D:/YoutubeDoro/components/layout/MobileNav.tsx renders the current mobile Focus/Tasks/Stats/Notes navigation.
- D:/YoutubeDoro/components/timer/LearningCard.tsx renders the focus timer and active task context.
- D:/YoutubeDoro/components/timer/RestCardContainer.tsx switches Standard and YouTube rest surfaces.
- D:/YoutubeDoro/components/tasks/TaskQueue.tsx renders current task, queue, add task, completion, deletion, and completed-task sections.
- D:/YoutubeDoro/components/audio/LoFiPlayer.tsx renders the current station selector and hidden YouTube player.
- D:/YoutubeDoro/components/notes/NotesPanel.tsx and D:/YoutubeDoro/components/notes/MarkdownScratchpad.tsx render daily notes and Markdown notes.
- D:/YoutubeDoro/components/stats/DailyStats.tsx and D:/YoutubeDoro/components/stats/WeeklyHeatmap.tsx render daily progress and 28-day activity.
- D:/YoutubeDoro/components/notion/NotionSettingsModal.tsx renders the existing Notion connection workflow.

### Existing anime foundation

- D:/YoutubeDoro/lib/themeConfig.ts defines Night Study, Rainy Evening, and Sunset Study.
- D:/YoutubeDoro/components/anime/AmbientBackground.tsx renders the local scene and CSS ambience layers.
- D:/YoutubeDoro/components/anime/ThemeSelector.tsx renders the quick theme picker.
- D:/YoutubeDoro/app/globals.css defines semantic theme tokens, workspace grid rules, overlays, ambience, and reduced-motion behavior.
- D:/YoutubeDoro/public/themes/night-study.svg, rainy-evening.svg, and sunset-study.svg are local replaceable scenes.

## Product boundary

The base implementation copies the visible interaction grammar of Flocus, not its identity.

### Included in this plan

- Home, Focus, and Ambient presentation modes.
- Scenic full-screen background and large clock/greeting on Home.
- Focus-centered timer composition.
- Floating Tasks, Sounds, Notes, Stats, Themes, and Settings surfaces.
- Desktop utility dock and mobile bottom dock.
- Original local anime scenes and semantic tokens.
- Existing radio stations presented through a Flocus-inspired music panel.
- Existing Markdown scratchpad and daily notes presented through a Notepad panel.
- Existing daily stats and 28-day heatmap presented with progressive hierarchy.
- Keyboard, Escape, focus, reduced-motion, hydration, and responsive fixes.

### Deferred to a separate capability plan

- Countdown, Stopwatch, Animedoro, and 52/17 timer algorithms.
- Task ETA mode, subtasks, duplication, drag ordering, and richer task metadata.
- Spotify/custom playlist authentication and external media loading.
- Custom theme uploads and video backgrounds.
- Account, subscription, Plus/paywall, and profile behavior.
- Picture-in-picture, browser notifications, and prevent-sleep behavior.
- Long-range calendar/trend calculations beyond the current local data.

## Checkpoint order

1. Tasks 1–3: baseline, state boundary, and shared surfaces.
2. Tasks 4–6: anime theme foundation, scenic shell, and focus flow.
3. Tasks 7–10: tasks, sounds, notes, and statistics panels.
4. Tasks 11–13: settings, responsive hardening, and verification.

Each checkpoint ends with lint/build and a browser smoke pass before the next surface group is started.

## Task 1: Establish a safe baseline

**Files:**

- Read: D:/YoutubeDoro/package.json
- Read: D:/YoutubeDoro/app/page.tsx
- Read: D:/YoutubeDoro/components/YouTubeRestTimer.tsx
- Read: D:/YoutubeDoro/hooks/useTimer.ts
- Read: D:/YoutubeDoro/hooks/useTasks.ts
- Read: D:/YoutubeDoro/lib/constants.ts
- Read: D:/YoutubeDoro/types/index.ts
- Read: D:/YoutubeDoro/docs/superpowers/specs/2026-08-27-flocus-inspired-anime-ui-redesign-design.md

- [ ] Step 1: Capture the current worktree boundary.

Run:

~~~powershell
git status --short --branch
git diff --name-only
git ls-files --others --exclude-standard
~~~

Expected: existing modified and untracked files are listed without cleanup or reset. Mark every file later appearing in the redesign file map as an overlap requiring diff review.

- [ ] Step 2: Run baseline repository checks.

Run:

~~~powershell
npm run lint
npm run build
npx tsc --noEmit
~~~

Expected: record PASS/FAIL for each command before code changes. Preserve exact baseline failures and distinguish them from redesign regressions.

- [ ] Step 3: Verify the existing domain interfaces.

Confirm in source that the redesign continues to call these existing functions rather than replacing them:

~~~text
useTimer.start / pause / resume / stop / reset
useTasks.addTask / setActiveTaskId / toggleTask / deleteTask / incrementTaskPomodoro
useDailyNotes.upsertTitleNote / getNotes / clearNotesForDay / removeOneNote
useNotionSync.validate / disconnect / syncDebounced / syncNow / pullFromNotion
~~~

Expected: implementation tasks modify presentation composition and retain these interfaces.

## Task 2: Add a small workspace presentation-state model

**Files:**

- Create: D:/YoutubeDoro/types/workspace.ts
- Modify: D:/YoutubeDoro/components/YouTubeRestTimer.tsx
- Modify: D:/YoutubeDoro/components/layout/MobileNav.tsx
- Test: manual state-transition smoke in Task 13; no test runner exists in package.json.

- [ ] Step 1: Define the shared presentation types.

Create types/workspace.ts with:

~~~ts
export type WorkspaceMode = "home" | "focus" | "ambient";

export type WorkspacePanel = "tasks" | "sounds" | "notes" | "stats" | "settings";

export type ThemeSlot = "home" | "focus" | "ambient";
~~~

Expected: no domain type in types/index.ts changes for this presentation-only model.

- [ ] Step 2: Replace the boolean focus presentation flag.

In YouTubeRestTimer.tsx, replace focusMode: boolean with:

~~~ts
const [workspaceMode, setWorkspaceMode] = useState<WorkspaceMode>("home");
const [openPanel, setOpenPanel] = useState<WorkspacePanel | null>(null);
const isFocusMode = workspaceMode === "focus";
~~~

Keep existing timer, task, notes, statistics, and Notion state declarations unchanged.

- [ ] Step 3: Centralize panel and mode transitions.

Add callbacks with these behaviors:

~~~ts
const openWorkspacePanel = (panel: WorkspacePanel) => setOpenPanel(panel);
const closeWorkspacePanel = () => setOpenPanel(null);
const toggleWorkspacePanel = (panel: WorkspacePanel) =>
  setOpenPanel((current) => (current === panel ? null : panel));
~~~

Mode changes call setWorkspaceMode only. They do not reset timers, tasks, notes, statistics, or Notion state.

- [ ] Step 4: Update keyboard behavior.

Keep the existing shortcuts and map them to presentation state:

~~~text
N: toggle the notes panel
F: toggle Home/Focus mode
Escape: close an open panel; if no panel is open, return Focus/Ambient to Home
~~~

Do not intercept keystrokes while an input or textarea is focused.

- [ ] Step 5: Run checks and inspect only the intended diff.

Run:

~~~powershell
npm run lint
npx tsc --noEmit
git diff -- components/YouTubeRestTimer.tsx components/layout/MobileNav.tsx types/workspace.ts
~~~

Expected: only presentation-mode/panel state changes. Stage only the new type file and intentional hunks in dirty files, then commit:

~~~powershell
git add -- types/workspace.ts
git add -p -- components/YouTubeRestTimer.tsx components/layout/MobileNav.tsx
git commit -m "refactor: model workspace presentation state"
~~~

## Task 3: Create the shared Flocus-inspired overlay surface

**Files:**

- Create: D:/YoutubeDoro/components/ui/OverlayPanel.tsx
- Modify: D:/YoutubeDoro/components/ui/Modal.tsx
- Modify: D:/YoutubeDoro/app/globals.css
- Test: keyboard and viewport smoke in Task 13.

- [ ] Step 1: Define the overlay component contract.

Create OverlayPanel.tsx with:

~~~ts
interface OverlayPanelProps {
  open: boolean;
  title: string;
  description?: string;
  onClose: () => void;
  children: React.ReactNode;
  className?: string;
}
~~~

The root uses role dialog, aria-modal true, a generated title id, and a named Close button. It returns null when open is false.

- [ ] Step 2: Implement shared close behavior.

The component must close on Escape, close when the backdrop itself is clicked, keep inside clicks from closing it, preserve visible focus rings, prevent body scrolling only while open, and restore the previous body overflow on close. Reuse existing Modal behavior rather than adding a focus-management package.

- [ ] Step 3: Add one surface vocabulary in CSS.

Add overlay-panel, overlay-panel__backdrop, overlay-panel__surface, and mobile media-query rules to app/globals.css. Use semantic theme variables, a solid/semi-solid surface, one border, restrained radius, and one soft shadow. Do not add backdrop blur or an animation dependency.

- [ ] Step 4: Verify the primitive.

Run:

~~~powershell
npm run lint
npx tsc --noEmit
~~~

Expected: PASS, with no product-surface behavior changed yet. Commit only intentional files/hunks:

~~~powershell
git add -- components/ui/OverlayPanel.tsx
git add -p -- components/ui/Modal.tsx app/globals.css
git commit -m "feat: add shared workspace overlay panel"
~~~

## Task 4: Extend the local anime theme foundation for mode slots

**Files:**

- Modify: D:/YoutubeDoro/types/theme.ts
- Modify: D:/YoutubeDoro/lib/themeConfig.ts
- Modify: D:/YoutubeDoro/lib/constants.ts
- Modify: D:/YoutubeDoro/components/anime/AmbientBackground.tsx
- Modify: D:/YoutubeDoro/components/anime/ThemeSelector.tsx
- Modify: D:/YoutubeDoro/app/layout.tsx
- Modify: D:/YoutubeDoro/app/globals.css
- Preserve: D:/YoutubeDoro/public/themes/night-study.svg
- Preserve: D:/YoutubeDoro/public/themes/rainy-evening.svg
- Preserve: D:/YoutubeDoro/public/themes/sunset-study.svg

- [ ] Step 1: Add mode-scoped theme storage without breaking the legacy key.

Add to lib/constants.ts:

~~~ts
themeBySlot: (slot: "home" | "focus" | "ambient") =>
  "ytdoro:theme:" + slot,
~~~

Keep KEYS.theme unchanged. Read each slot in this order:

1. ytdoro:theme:<slot> when valid.
2. legacy ytdoro:theme for the Home slot.
3. DEFAULT_THEME.

- [ ] Step 2: Keep the registry as the single visual source.

Retain exactly the three existing theme ids. Every theme picker consumes THEME_ORDER and COZY_THEMES. Do not add a second hard-coded theme list. Preserve local background URLs, descriptions, preview colors, accent colors, ambience types, and alt text.

- [ ] Step 3: Apply the selected slot theme to the root.

In YouTubeRestTimer.tsx, derive the active theme from workspaceMode:

~~~ts
const activeTheme =
  workspaceMode === "focus"
    ? themePreferences.focus
    : workspaceMode === "ambient"
      ? themePreferences.ambient
      : themePreferences.home;
~~~

AmbientBackground receives activeTheme. Changing one slot writes only that slot's key and does not touch domain storage.

- [ ] Step 4: Keep bootstrap flash-free.

Update app/layout.tsx so its inline bootstrap validates the Home slot first, then falls back to ytdoro:theme. It must set data-theme to one of the three allowed ids and fall back to night-study when parsing or storage access fails.

- [ ] Step 5: Verify all three local scenes.

Run:

~~~powershell
npm run lint
npm run build
~~~

Expected: PASS. Select all three themes from the quick selector and reload after each selection. Expected: the scene persists, no white flash appears, and timer/task values remain unchanged. Commit:

~~~powershell
git add -p -- types/theme.ts lib/themeConfig.ts lib/constants.ts components/anime/AmbientBackground.tsx components/anime/ThemeSelector.tsx app/layout.tsx app/globals.css components/YouTubeRestTimer.tsx
git commit -m "feat: support mode-scoped local anime themes"
~~~

## Task 5: Recompose Home, Focus, and Ambient shell navigation

**Files:**

- Create: D:/YoutubeDoro/components/layout/HomeHero.tsx
- Create: D:/YoutubeDoro/components/layout/WorkspaceDock.tsx
- Create: D:/YoutubeDoro/lib/quotes.ts
- Modify: D:/YoutubeDoro/components/layout/Header.tsx
- Modify: D:/YoutubeDoro/components/layout/MobileNav.tsx
- Modify: D:/YoutubeDoro/components/YouTubeRestTimer.tsx
- Modify: D:/YoutubeDoro/app/globals.css

- [ ] Step 1: Add a hydration-safe scenic Home hero.

HomeHero.tsx accepts:

~~~ts
interface HomeHeroProps {
  today: string;
  quote: string;
  hidden?: boolean;
}
~~~

It renders stable --:-- time during server/client matching and updates the local clock in useEffect. Quote selection is deterministic from the date, not Math.random during render. Do not copy Flocus wording or account names.

- [ ] Step 2: Add the shared dock.

WorkspaceDock.tsx accepts:

~~~ts
interface WorkspaceDockProps {
  mode: WorkspaceMode;
  openPanel: WorkspacePanel | null;
  onModeChange: (mode: WorkspaceMode) => void;
  onPanelToggle: (panel: WorkspacePanel) => void;
}
~~~

Render named controls for Focus, Tasks, Sounds, Notes, Stats, Themes/Settings, Home, and Ambient. Active mode and open panel use semantic accent state.

- [ ] Step 3: Replace the dense header composition.

Keep the current date, focus/rest totals, Notion status, and quick theme access available, but move secondary actions into the dock or settings surface. Do not duplicate the same control in desktop and mobile trees.

- [ ] Step 4: Wire the three shell compositions.

In YouTubeRestTimer.tsx:

- Home renders HomeHero, the existing dashboard composition, and the dock.
- Focus renders the timer stage first, hides nonessential dashboard chrome, and keeps the dock reachable.
- Ambient renders the scene with a small timer/context presentation and keeps the dock reachable.
- Tasks, Sounds, Notes, Stats, and Settings render through OverlayPanel instead of permanently occupying every dashboard region.

Do not create three separate domain component trees.

- [ ] Step 5: Verify shell transitions.

Run:

~~~powershell
npm run lint
npx tsc --noEmit
~~~

Expected: PASS. Browser smoke confirms Home → Focus → Ambient → Home without losing the selected task or timer value. Commit:

~~~powershell
git add -- components/layout/HomeHero.tsx components/layout/WorkspaceDock.tsx lib/quotes.ts
git add -p -- components/layout/Header.tsx components/layout/MobileNav.tsx components/YouTubeRestTimer.tsx app/globals.css
git commit -m "feat: add scenic workspace modes and utility dock"
~~~

## Task 6: Make the focus timer the primary visual stage

**Files:**

- Modify: D:/YoutubeDoro/components/timer/LearningCard.tsx
- Modify: D:/YoutubeDoro/components/timer/TimerDisplay.tsx
- Modify: D:/YoutubeDoro/components/timer/TimerControls.tsx
- Modify: D:/YoutubeDoro/components/timer/RestCardContainer.tsx
- Modify: D:/YoutubeDoro/components/timer/PlainRestCard.tsx
- Modify: D:/YoutubeDoro/components/timer/YouTubeRestCard.tsx
- Modify: D:/YoutubeDoro/components/timer/PomodoroCycleTracker.tsx
- Read-only: D:/YoutubeDoro/hooks/useTimer.ts

- [ ] Step 1: Preserve the timer contract.

Do not modify useTimer.ts. The Focus surface continues to call:

~~~ts
timer.start();
timer.pause();
timer.resume();
timer.stop();
timer.reset();
~~~

Existing completion and stop callbacks remain the only persistence/update path.

- [ ] Step 2: Restructure the focus stage.

Change LearningCard.tsx so the visual order is:

1. session label and status;
2. current task/focus prompt;
3. large timer display;
4. Start/Pause/Resume primary action;
5. quiet Stop/Reset actions;
6. session tally and duration controls;
7. today's focus context.

Keep existing input and task-selection callbacks unchanged.

- [ ] Step 3: Keep the timer accessible and readable.

Preserve role timer and its accessible remaining-time label. Keep the progress ring restrained and theme-driven. At 390px, the timer must fit without horizontal scrolling and the primary button must remain reachable above the bottom dock.

- [ ] Step 4: Present rest as a focused continuation.

Keep Standard and YouTube rest modes but make the rest surface secondary within the same visual language. Do not add break algorithms or change duration semantics.

- [ ] Step 5: Verify timer regressions.

Run:

~~~powershell
npm run lint
npm run build
~~~

Expected: PASS. Manually verify Idle → Running → Paused → Running → Idle and Done states, including daily totals and session-round updates. Commit:

~~~powershell
git add -p -- components/timer/LearningCard.tsx components/timer/TimerDisplay.tsx components/timer/TimerControls.tsx components/timer/RestCardContainer.tsx components/timer/PlainRestCard.tsx components/timer/YouTubeRestCard.tsx components/timer/PomodoroCycleTracker.tsx
git commit -m "refactor: center the focus timer experience"
~~~

## Task 7: Convert the task queue into the Flocus-inspired Tasks panel

**Files:**

- Modify: D:/YoutubeDoro/components/tasks/TaskQueue.tsx
- Read-only unless type changes are proven necessary: D:/YoutubeDoro/hooks/useTasks.ts
- Read-only unless the existing model blocks the base UI: D:/YoutubeDoro/types/index.ts
- Modify: D:/YoutubeDoro/components/YouTubeRestTimer.tsx

- [ ] Step 1: Keep existing task semantics.

The base panel uses only the current TaskItem fields:

~~~ts
id;
text;
completed;
estimatedPomos;
completedPomos;
createdAt;
~~~

Keep existing callbacks for add, select, toggle, delete, and Pomodoro increment. Do not introduce a second task state or persistence key.

- [ ] Step 2: Reorder the task panel hierarchy.

Render:

1. Current Task with title, active state, session progress, complete action, and delete action.
2. Up Next queue with one clear selection action per row.
3. Add Task form with estimated session selector.
4. Collapsible completed tasks.
5. Empty-state action for the first task.

Use OverlayPanel for desktop and a full-width sheet on mobile.

- [ ] Step 3: Preserve safe text and keyboard behavior.

Keep the controlled input, trim text before onAddTask, disable Add when the trimmed value is empty, and keep labelled buttons for completion and deletion. Preserve existing useId values for labels and aria-controls.

- [ ] Step 4: Verify task flow.

Manually verify adding, selecting, completing, reopening, deleting, and reloading tasks. Confirm selecting a task updates the existing current topic and does not reset the timer unless the existing callback already does so. Commit:

~~~powershell
git add -p -- components/tasks/TaskQueue.tsx components/YouTubeRestTimer.tsx
git commit -m "refactor: focus the task panel on current work"
~~~

## Task 8: Redesign the Sounds and Music panel around existing audio

**Files:**

- Modify: D:/YoutubeDoro/components/audio/LoFiPlayer.tsx
- Read-only or small label-only changes: D:/YoutubeDoro/lib/audioStreams.ts
- Modify: D:/YoutubeDoro/components/icons/index.tsx
- Modify: D:/YoutubeDoro/components/YouTubeRestTimer.tsx

- [ ] Step 1: Preserve the current audio engine.

Keep the hidden react-youtube player, existing station IDs, local-storage keys, volume state, mute state, and ytdoro:pauseLoFi / ytdoro:resumeLoFi events. No external provider or authentication flow is added.

- [ ] Step 2: Define the panel tabs locally.

Use this presentation-only union in LoFiPlayer.tsx:

~~~ts
type AudioPanelTab = "sounds" | "my-music" | "playlist-library";
~~~

Sounds shows existing RADIO_STATIONS as selectable tiles with volume controls. My Music explains the existing YoutubeDoro stations without claiming Spotify connectivity. Playlist Library groups the same stations by existing genre labels and does not fabricate remote playlists.

- [ ] Step 3: Add the dock/panel interaction.

The dock opens the panel. The panel exposes enable/disable, station selection, mute, volume, current station, and playback status. Closing the panel does not stop playback.

- [ ] Step 4: Verify audio regression behavior.

Manually verify enable, disable, station change, mute, volume change, panel close, and rest-player pause/resume signals. Commit:

~~~powershell
git add -p -- components/audio/LoFiPlayer.tsx components/icons/index.tsx components/YouTubeRestTimer.tsx
git commit -m "refactor: turn radio controls into a focus sound panel"
~~~

## Task 9: Redesign Notepad and daily notes as one notes surface

**Files:**

- Modify: D:/YoutubeDoro/components/notes/NotesPanel.tsx
- Modify: D:/YoutubeDoro/components/notes/MarkdownScratchpad.tsx
- Modify: D:/YoutubeDoro/components/notes/NoteEntry.tsx
- Read-only unless a panel prop bridge is needed: D:/YoutubeDoro/hooks/useDailyNotes.ts
- Modify: D:/YoutubeDoro/components/YouTubeRestTimer.tsx

- [ ] Step 1: Preserve both note stores.

Keep daily activity notes under KEYS.notesByDay(day) and Markdown scratchpad content under ytdoro:scratchpad. Keep date selection, deletion confirmations, local autosave, and Notion pull/sync behavior intact.

- [ ] Step 2: Compose the Notepad panel.

Use OverlayPanel with a compact header containing Notepad, selected date, and word/character count; Markdown Write/Preview control; daily Focus and Rest totals; activity entries; and a clear empty state.

Do not add a rich-text editor package. Keep existing safe HTML escaping and Markdown behavior.

- [ ] Step 3: Keep destructive actions explicit.

Retain confirmation before clearing all notes or deleting an individual entry. Closing the panel never clears content.

- [ ] Step 4: Verify notes and persistence.

Write Markdown, reload, switch Preview, change the date, create timer activity, reopen the panel, and verify existing entries. Commit:

~~~powershell
git add -p -- components/notes/NotesPanel.tsx components/notes/MarkdownScratchpad.tsx components/notes/NoteEntry.tsx components/YouTubeRestTimer.tsx
git commit -m "refactor: make notes a focused notepad panel"
~~~

## Task 10: Recompose statistics without changing formulas

**Files:**

- Modify: D:/YoutubeDoro/components/stats/DailyStats.tsx
- Modify: D:/YoutubeDoro/components/stats/WeeklyHeatmap.tsx
- Read-only: D:/YoutubeDoro/lib/streak.ts
- Modify: D:/YoutubeDoro/components/YouTubeRestTimer.tsx

- [ ] Step 1: Preserve current calculations.

Keep formatMMSS, calculateStreak, daily goal storage, 28-day local-storage reads, and existing progress values. Do not change focus seconds, rest seconds, Pomodoro rounds, or streak meanings.

- [ ] Step 2: Establish progressive hierarchy.

Render:

1. Today's focus time and daily goal completion.
2. Sessions and streak.
3. Rest context.
4. 28-day activity heatmap.

The empty state explains that the first focus session creates activity instead of showing an empty chart without context.

- [ ] Step 3: Add only supported range labels.

Use Today and 28 days presentation tabs because those data sources already exist. Do not add Week, Month, or Year controls that display fabricated or unchanged values. Expanded range calculations remain deferred.

- [ ] Step 4: Verify analytics isolation.

Run a focus session, confirm the timer remains usable while Stats is open, confirm the daily card and heatmap update through existing storage events, and verify an empty-state render on fresh storage. Commit:

~~~powershell
git add -p -- components/stats/DailyStats.tsx components/stats/WeeklyHeatmap.tsx components/YouTubeRestTimer.tsx
git commit -m "refactor: give focus statistics a clear hierarchy"
~~~

## Task 11: Add a Flocus-inspired settings surface

**Files:**

- Create: D:/YoutubeDoro/components/settings/SettingsPanel.tsx
- Modify: D:/YoutubeDoro/components/anime/ThemeSelector.tsx
- Modify: D:/YoutubeDoro/components/notion/NotionSettingsModal.tsx
- Modify: D:/YoutubeDoro/components/YouTubeRestTimer.tsx
- Modify: D:/YoutubeDoro/components/ui/Modal.tsx

- [ ] Step 1: Define settings sections that exist in YoutubeDoro.

Use this presentation-only union in SettingsPanel.tsx:

~~~ts
type SettingsSection =
  | "themes"
  | "focus-timer"
  | "clock"
  | "quotes"
  | "stats"
  | "extras"
  | "notion";
~~~

The left navigation shows only these sections. Account, Plus, Support, and What's New are not rendered as fake functional destinations.

- [ ] Step 2: Implement the settings navigation shell.

SettingsPanel receives:

~~~ts
interface SettingsPanelProps {
  open: boolean;
  onClose: () => void;
  activeThemeSlot: ThemeSlot;
  onThemeSlotChange: (slot: ThemeSlot) => void;
  onOpenNotion: () => void;
}
~~~

Use OverlayPanel with a desktop left navigation rail and a mobile stacked section selector. Keep the active section visible and keyboard navigable.

- [ ] Step 3: Implement real settings content only.

Sections expose:

- Themes: three local themes for Home, Focus, and Ambient slots.
- Focus Timer: current focus/rest duration controls already supported by PRESETS; no new algorithms.
- Clock: the Home clock presentation controls introduced by HomeHero.
- Quotes: deterministic local quote visibility control.
- Stats: existing daily goal control and current 28-day view.
- Extras: keyboard shortcut reference and reduced-motion explanation.
- Notion: a button that opens the existing NotionSettingsModal workflow.

No section claims an integration or capability that is not implemented.

- [ ] Step 4: Verify settings isolation.

Open and close Settings, change theme slots, open Notion settings, press Escape, and confirm timer/task state remains unchanged. Commit:

~~~powershell
git add -- components/settings/SettingsPanel.tsx
git add -p -- components/anime/ThemeSelector.tsx components/notion/NotionSettingsModal.tsx components/YouTubeRestTimer.tsx components/ui/Modal.tsx
git commit -m "feat: add a focused settings workspace"
~~~

## Task 12: Finish responsive, accessibility, motion, and performance rules

**Files:**

- Modify: D:/YoutubeDoro/app/globals.css
- Modify: D:/YoutubeDoro/components/layout/WorkspaceDock.tsx
- Modify: D:/YoutubeDoro/components/ui/OverlayPanel.tsx
- Modify: D:/YoutubeDoro/components/timer/LearningCard.tsx
- Modify: D:/YoutubeDoro/components/tasks/TaskQueue.tsx
- Modify: D:/YoutubeDoro/components/audio/LoFiPlayer.tsx
- Modify: D:/YoutubeDoro/components/notes/MarkdownScratchpad.tsx
- Modify: D:/YoutubeDoro/components/stats/WeeklyHeatmap.tsx

- [ ] Step 1: Lock the three responsive compositions.

Implement and verify:

~~~text
Desktop 1440px: scenic shell + focus stage + dock + bounded floating panels
Tablet 1024px: focus and task surfaces share available width; analytics moves below
Mobile 390px: focus first, task context next, fixed bottom dock, full-width panels
~~~

Use CSS media queries and shared components. Do not create separate component trees per breakpoint.

- [ ] Step 2: Check panel geometry and overflow.

Every overlay must fit inside the viewport, avoid clipping at the right or bottom edge, keep long content internally scrollable, remain above scenery, and leave the main timer action reachable on mobile.

- [ ] Step 3: Check accessibility contracts.

Verify icon-only controls have accessible names; form controls have labels; focus rings remain visible against all scenes; the timer has a meaningful accessible label; task controls identify their task; overlays have title, close control, Escape handling, and aria-modal; touch targets are practical on mobile.

- [ ] Step 4: Check motion and hidden-document behavior.

Keep hover, panel, theme, and task transitions restrained. Under prefers-reduced-motion: reduce, disable cloud/rain/dust animation and reduce transitions. Do not add a continuous JavaScript particle loop. If document visibility handling is added, pause only decorative work and never pause the timer engine.

- [ ] Step 5: Run hardening checks.

Run:

~~~powershell
npm run lint
npx tsc --noEmit
npm run build
~~~

Expected: all PASS. Commit only reviewed redesign hunks:

~~~powershell
git add -p -- app/globals.css components/layout/WorkspaceDock.tsx components/ui/OverlayPanel.tsx components/timer/LearningCard.tsx components/tasks/TaskQueue.tsx components/audio/LoFiPlayer.tsx components/notes/MarkdownScratchpad.tsx components/stats/WeeklyHeatmap.tsx
git commit -m "fix: harden responsive and accessible workspace states"
~~~

## Task 13: Run functional, visual, and scope verification

**Files:**

- Read: all files changed by Tasks 1–12.
- Do not add a test runner or new dependency.

- [ ] Step 1: Run final repository checks.

Run:

~~~powershell
npm run lint
npx tsc --noEmit
npm run build
~~~

Expected: all three commands pass. Record exact unresolved failures instead of claiming completion.

- [ ] Step 2: Start the local production server.

Run in a dedicated terminal:

~~~powershell
npm run start -- --hostname 127.0.0.1 --port 3000
~~~

Expected: http://127.0.0.1:3000 returns the redesigned app. Stop only this production process after QA; leave unrelated development processes untouched.

- [ ] Step 3: Verify focus behavior.

In the browser, verify:

~~~text
[ ] Home → Focus → Ambient → Home preserves domain state
[ ] Start focus timer
[ ] Pause running timer
[ ] Resume paused timer
[ ] Stop/reset timer
[ ] Focus completion updates totals and session count
[ ] Rest mode still switches Standard/YouTube
~~~

Expected: each state is visible and existing persistence callbacks still update current data.

- [ ] Step 4: Verify task, notes, audio, and Notion surfaces.

Verify:

~~~text
[ ] Add a task
[ ] Select a current task
[ ] Complete and reopen a task
[ ] Delete a task
[ ] Empty task state is actionable
[ ] Write and preview Markdown
[ ] Daily notes remain date-selectable
[ ] Audio can enable, disable, mute, change station, and change volume
[ ] Notion disconnected/error state remains localized and does not block the timer
~~~

- [ ] Step 5: Verify theme and settings persistence.

For each of Night Study, Rainy Evening, and Sunset Study:

~~~text
[ ] Select the theme from quick access
[ ] Reload the page
[ ] Confirm the scene persists
[ ] Confirm timer/task/statistics state is unchanged
[ ] Confirm no white flash or layout shift appears
~~~

Also verify Home, Focus, and Ambient theme slots through Settings.

- [ ] Step 6: Complete the nine-condition visual matrix.

Review at 1440×900, 1024×900, and 390×844:

~~~text
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

For every condition verify timer priority, readable contrast, task hierarchy, dock usability, scene crop, no horizontal overflow, no clipped panels, restrained ambience, and visible keyboard focus.

- [ ] Step 7: Verify reduced motion and hydration.

Enable the browser's reduced-motion preference and reload. Expected: ambience is static or minimized, while timer and panels continue working. Inspect the browser console for hydration mismatch errors. A missing Notion configuration error may remain localized when no Notion token is configured.

- [ ] Step 8: Review final scope before reporting.

Run:

~~~powershell
git status --short --branch
git diff --check
git log --oneline --decorate -n 20
~~~

Expected: review the redesign commits shown in the log and confirm they contain only reviewed intentional changes, unrelated existing dirty files remain uncommitted, and the final report lists preserved domain interfaces, checks run, nine visual conditions, and unresolved limitations.

## Plan self-review

- Spec coverage: scene layer and mode-scoped themes are Task 4; scenic shell and dock are Task 5; focus behavior is Task 6; tasks, sounds, notes, statistics, and settings are Tasks 7–11; responsive/accessibility/motion/performance requirements are Task 12; functional and nine-condition visual verification is Task 13.
- State safety: Tasks 2, 4, 6, 7, 8, 9, 10, and 11 retain existing domain interfaces and storage semantics.
- Scope safety: deferred Flocus capabilities are listed before implementation and are not represented as fake controls in the base UI.
- Placeholder scan: the plan contains no unresolved placeholders, vague implementation instructions, or unnamed files.
- Type consistency: WorkspaceMode, WorkspacePanel, ThemeSlot, OverlayPanelProps, WorkspaceDockProps, HomeHeroProps, AudioPanelTab, and SettingsSection are defined at their first use and reused consistently.
- Repository reality: package.json has lint/build scripts but no test runner, so the plan uses type-checking, lint/build, and browser smoke/visual verification without adding a speculative testing framework.

## Execution handoff

Plan complete and saved to docs/superpowers/plans/2026-08-27-flocus-inspired-anime-ui-redesign-plan.md. The user's previously stated preference is Inline Execution in the current checkout. Before implementation starts, invoke the executing-plans workflow, work task-by-task, stop at each checkpoint, and preserve unrelated dirty files.
