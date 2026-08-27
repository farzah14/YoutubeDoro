# Flocus-Inspired Anime Focus UI Redesign

Date: 2026-08-27
Status: Draft for user review

## Scope and authority

The latest direct user request is to refactor and redesign the YoutubeDoro interface around the visible experience of Flocus, using the user's Chrome session for feature and interaction exploration.

The two Downloads documents are reference material, not higher-priority instructions. They establish compatible constraints: original local anime scenery, no characters or mascots, readable flat surfaces, restrained motion, responsive layouts, and preservation of existing business logic. Their audio-player non-goal is superseded for this redesign only where the latest Flocus-alignment request explicitly calls for a music/sounds surface.

This specification describes a presentation-layer redesign and a small amount of UI-state refactoring. It does not authorize a backend rewrite, framework migration, or a blind pixel copy of Flocus.

## Goal

Make YoutubeDoro feel like a calm, scenery-first focus environment with the interaction rhythm of Flocus: a minimal Home mode, a timer-centered Focus mode, a low-distraction Ambient mode, a utility dock, and floating panels for tasks, sounds, notes, themes, statistics, and settings.

The result must remain recognizably YoutubeDoro through original anime scenery, original copy, existing learning/rest flows, Japanese/English study context, and the current Notion integration.

## Reference observations

The visible Flocus page was explored through the connected Chrome session on 2026-08-27 at `https://app.flocus.com/`.

Observed UI patterns:

- Home uses a full-screen scenic background, a large clock, a short greeting/quote, and a compact bottom utility dock.
- Focus mode centers a large timer, focus prompt, break choices, a primary Start control, and secondary timer utilities.
- Ambient mode gives the environment priority and keeps a floating timer available at the edge of the scene.
- Tasks open as a floating panel with three priority rows, completion checkboxes, editable titles, an Add Task action, and a per-task actions menu.
- The task actions menu visibly includes Add subtask, Duplicate, and Delete task.
- The audio panel uses Sounds, My Music, and Playlist Library tabs, with sound tiles, individual volume sliders, category filtering, and visible Plus-gated items.
- My Music presents custom playlist loading for Spotify, YouTube, Apple Music, SoundCloud, and Amazon Music; the visible account state was signed out.
- Notepad opens as a floating editor with formatting controls and word/character counts; the visible editor also showed a Plus gate.
- Settings use a large dark panel with a left navigation rail and separate Home Theme, Focus Theme, Ambient Theme, Clock, Focus Timer, Stats, Quotes, Extras, Account, Support, and What's New destinations.
- Theme settings expose local/custom background concepts, a video-background field, type/environment/color filters, and scenic theme libraries. These were observed as UI, not approved as YoutubeDoro features.
- Stats visibly include time-range controls, metric cards, a focus calendar, and a focus trend section. Signed-out values were not treated as factual product data.
- Focus Timer settings visibly include multiple timer modes, timer lengths, timer styles, alert sounds, session tallies, and task-ETA settings.
- At a 390px viewport, the main focus area and task panel stack vertically while the icon dock remains fixed at the bottom.

Because the visible Flocus account was signed out, this specification treats subscription behavior, account persistence, custom media loading, and authenticated integrations as reference-only capability signals rather than tested requirements.

## Product thesis

YoutubeDoro has one primary job: help the user start and sustain one focused learning interval. The scenery should create a place to return to, while the timer and current task should answer the next action immediately.

The interface therefore uses one clear visual grammar:

1. Local anime environment behind the application.
2. A readable contrast layer over the environment.
3. Solid or lightly translucent utility surfaces with consistent borders.
4. One primary action per active workflow.
5. Small, reversible transitions instead of decorative motion everywhere.

## Non-negotiable design contract

- Use original local/project-managed anime scenery.
- Do not copy Flocus branding, assets, proprietary illustrations, or exact wording.
- Keep the environment character-free: no anime people, mascots, or companion characters.
- Keep the UI flat and readable; avoid heavy glassmorphism, neon HUD styling, and random AI-generated decoration.
- Preserve the current timer, task, statistics, notes, local-storage, YouTube, and Notion behavior unless a separate capability expansion is approved.
- Use existing dependencies, CSS, SVG, and native browser APIs before adding packages.
- Keep Home, Focus, and Ambient as presentation modes, not separate application implementations.
- Keep the existing three local scenes as the initial anime identity rather than replacing them with remote media.

## Experience model

### Home mode

Purpose: provide a calm landing surface and a quick route to the next focus session.

Content:

- YoutubeDoro identity and small contextual greeting.
- Large clock or compact daily context.
- Scene-aware quote or study intention.
- Bottom/edge dock for Focus, Tasks, Sounds, Notes, Themes, and Settings.

Home should not display every metric or control at once. Daily progress remains available through the Stats surface.

### Focus mode

Purpose: make starting and sustaining a session effortless.

Content:

- Current session label: Focus, Short Break, or Long Break where supported.
- Large remaining-time display.
- Current task or focus prompt.
- Primary Start, Pause, or Resume action.
- Quiet secondary actions for Stop, Reset, and existing break flows.
- Session progress and today's focus context.

Focus mode consumes the existing `useTimer` interface. It must not create a second timer engine.

### Ambient mode

Purpose: reduce interface density while the user remains in the environment.

Content:

- Larger scenery crop with restrained ambience.
- Small floating timer card when a timer is active or ready.
- Dock access to essential utilities.
- Optional task context without forcing the full dashboard onto the scene.

Ambient mode must remain usable on mobile and must not hide the timer state.

## State boundaries

Presentation state will be explicit and separate from domain state.

Presentation state:

- `workspaceMode`: `home | focus | ambient`
- `openPanel`: `none | tasks | sounds | notes | settings | stats`
- active settings section
- mobile navigation selection
- theme selection

Existing domain state:

- timer status, elapsed time, remaining time, and session callbacks
- tasks and task progress
- daily focus/rest totals
- Pomodoro round count and streak calculation
- daily notes and Markdown scratchpad
- LoFi station, volume, and playback signals
- Notion connection and synchronization state

Rules:

- Switching mode never resets domain state.
- Switching theme never resets domain state.
- Opening or closing a panel never resets domain state.
- Escape closes temporary panels and settings without changing timer state.
- Storage keys under the existing `ytdoro:` namespace remain compatible.

## Component and file boundaries

The current root orchestration remains `D:/YoutubeDoro/components/YouTubeRestTimer.tsx`, but its presentation branches should become easier to reason about.

Expected files:

- Modify `D:/YoutubeDoro/components/YouTubeRestTimer.tsx` to coordinate modes and panels while preserving existing callbacks.
- Create `D:/YoutubeDoro/types/workspace.ts` for shared presentation-mode and panel types.
- Create `D:/YoutubeDoro/components/layout/WorkspaceDock.tsx` for mode and utility navigation.
- Modify `D:/YoutubeDoro/components/layout/Header.tsx` and `D:/YoutubeDoro/components/layout/MobileNav.tsx` to use the new shell grammar.
- Create `D:/YoutubeDoro/components/ui/OverlayPanel.tsx` for reusable floating desktop panels and mobile sheets.
- Modify `D:/YoutubeDoro/components/ui/Modal.tsx` so dialogs and panels share focus, Escape, and layering behavior.
- Modify `D:/YoutubeDoro/components/anime/AmbientBackground.tsx`, `D:/YoutubeDoro/components/anime/ThemeSelector.tsx`, `D:/YoutubeDoro/lib/themeConfig.ts`, `D:/YoutubeDoro/types/theme.ts`, and `D:/YoutubeDoro/app/globals.css` for theme and scenery behavior.
- Modify `D:/YoutubeDoro/components/timer/LearningCard.tsx`, `D:/YoutubeDoro/components/timer/TimerDisplay.tsx`, `D:/YoutubeDoro/components/timer/TimerControls.tsx`, and rest-card components for the Focus surface.
- Modify `D:/YoutubeDoro/components/tasks/TaskQueue.tsx` and reuse `D:/YoutubeDoro/hooks/useTasks.ts` for the Tasks panel.
- Modify `D:/YoutubeDoro/components/audio/LoFiPlayer.tsx` and `D:/YoutubeDoro/lib/audioStreams.ts` for the Sounds/My Music surface while keeping the current YouTube backend.
- Modify `D:/YoutubeDoro/components/notes/NotesPanel.tsx`, `D:/YoutubeDoro/components/notes/MarkdownScratchpad.tsx`, and `D:/YoutubeDoro/components/notes/NoteEntry.tsx` for the Notepad surface.
- Modify `D:/YoutubeDoro/components/stats/DailyStats.tsx` and `D:/YoutubeDoro/components/stats/WeeklyHeatmap.tsx` for progressive analytics hierarchy.
- Create `D:/YoutubeDoro/components/settings/SettingsPanel.tsx` for the Flocus-inspired settings navigation and connect the existing `D:/YoutubeDoro/components/notion/NotionSettingsModal.tsx` as an integration section.
- Keep `D:/YoutubeDoro/public/themes/night-study.svg`, `D:/YoutubeDoro/public/themes/rainy-evening.svg`, and `D:/YoutubeDoro/public/themes/sunset-study.svg` local and replaceable.

No parallel desktop/mobile component trees should be created. Shared components should reflow through layout and presentation props.

## Visual system

### Scenery

The current three local SVG scenes remain the baseline:

- Night Study: deep navy, warm desk light, moonlit window, distant lights.
- Rainy Evening: cool blue-gray scene with restrained rain cues.
- Sunset Study: peach, rose, muted purple, and warm golden light.

The environment layer remains behind all interactive UI. Effects should use CSS/SVG where practical and should remain subtle on mobile.

### Surfaces

All floating panels use one shared vocabulary:

- dark/semi-solid theme surface
- one border treatment
- restrained radius
- soft shadow
- consistent inner spacing
- no full-screen blur dependency

Panel size and placement may change by viewport, but visual treatment must remain consistent.

### Typography and controls

- Keep the existing Inter and JetBrains Mono fonts unless a specific readability issue is found.
- Use mono or compact labels for metadata, not for every piece of prose.
- Use a single accent family per scene.
- Use semantic buttons and labelled icon controls.
- Make the primary focus action visually dominant without making every control bright.

## Core interaction flows

### Start a focus session

1. User opens Home or Focus mode.
2. User chooses or enters a current task.
3. User presses Start Focus.
4. Existing `useTimer.start()` runs.
5. Timer state changes to Running and the interface shows Pause and Stop.
6. Completion updates existing totals, rounds, task progress, notes, and Notion sync behavior.

### Work with tasks

1. User opens Tasks from the dock.
2. Current Task appears above Up Next.
3. User selects a task to make it current.
4. User can add, complete, reopen, or delete tasks through existing callbacks.
5. Completed tasks remain secondary and collapsible.

Subtasks, duplication, ETA tracking, and drag ordering are not part of the base UI-only pass because the current `TaskItem` model does not expose those semantics.

### Use sounds

1. User opens Sounds.
2. Sounds tab shows existing YoutubeDoro stations as selectable tiles.
3. User can enable/disable playback, choose a station, mute, and adjust volume.
4. Existing cross-component pause/resume signals remain intact.

External Spotify/custom playlist loading is deferred.

### Use notes

1. User opens Notepad.
2. User sees Markdown scratchpad and daily activity notes in a compact panel.
3. Local autosave, date selection, deletion confirmations, and Notion sync remain unchanged.

### Change appearance

1. User opens Themes from the dock or settings.
2. User chooses Night Study, Rainy Evening, or Sunset Study.
3. Scene and semantic tokens crossfade without reloading.
4. Preference persists through the existing theme storage key.

## Responsive behavior

### Desktop

- Scenic Home composition with compact top identity and a utility dock.
- Focus timer is visually dominant when in Focus mode.
- Tasks, Sounds, and Notes open as floating panels without obscuring the primary action unnecessarily.
- Settings uses a side-navigation panel.

### Tablet

- Focus and task surfaces use a two-column or stacked hybrid layout.
- Lower-priority analytics move below the focus workspace.
- Floating panels remain within the viewport and do not clip at the edges.

### Mobile

- Focus content appears before task content.
- Bottom navigation remains fixed with comfortable touch targets.
- Panels become full-width sheets or near-full-width cards.
- Secondary analytics and settings remain reachable without shrinking the timer into a tiny card.
- No horizontal scrolling for primary workflows.

## States to design explicitly

Every redesigned surface must include the states it can reach:

- loading or hydration-safe first render
- empty task queue
- active task
- completed task
- timer idle
- timer running
- timer paused
- timer done
- disabled action
- settings open
- panel open
- panel closed
- Notion disconnected
- Notion syncing
- Notion success
- Notion error
- reduced-motion preference

Errors remain localized. A missing Notion configuration must not disable the timer or tasks.

## Accessibility and performance

- All icon-only controls receive accessible names.
- Keyboard focus remains visible against every scene.
- Escape closes panels and dialogs.
- Dialogs retain appropriate focus behavior.
- Touch targets remain practical on mobile.
- `prefers-reduced-motion` disables or minimizes ambient movement.
- Decorative animation uses opacity/transform where possible.
- No new animation library is planned.
- Full-screen JavaScript particle loops should not be added where CSS/SVG is sufficient.
- The document-hidden state may reduce decorative work if existing browser APIs make that simple.

## Deferred capability expansions

The following are intentionally separate from the base redesign and require explicit product approval because they change behavior or data contracts:

- Countdown, Stopwatch, Animedoro, and 52/17 timer engines.
- Task ETA mode.
- Subtasks, task duplication, drag ordering, and richer task metadata.
- Spotify/custom playlist authentication.
- Local sound library beyond the existing YouTube stations.
- Custom background uploads and video backgrounds.
- Account, authentication, subscription, and Plus/paywall behavior.
- Picture-in-picture timer.
- Browser notifications and prevent-sleep behavior.
- Expanded long-range statistics and calendar calculations.

## Acceptance criteria

The redesign is acceptable when:

1. YoutubeDoro uses an original anime scenery identity rather than copied Flocus branding.
2. Home, Focus, and Ambient modes are visually and behaviorally distinct.
3. Tasks, Sounds, Notes, Themes, Stats, and Settings use a consistent floating-panel grammar.
4. Focus mode makes the next timer action obvious.
5. Existing timer, task, notes, statistics, persistence, YouTube, and Notion behavior remains intact.
6. Theme switching is manual, persistent, smooth, and domain-state-safe.
7. Desktop, tablet, and mobile layouts are intentionally composed.
8. Empty, loading, disabled, success, and error states are readable and localized.
9. Keyboard focus, Escape behavior, contrast, touch targets, and reduced motion are handled.
10. No unnecessary dependency or framework migration is introduced.
11. Lint and build checks pass, or failures are documented as pre-existing/unresolved.
12. Visual QA covers three themes across desktop, tablet, and mobile: nine conditions total.

## Implementation gate

This document must be reviewed before an implementation plan is written or UI code is changed. After user approval, the implementation plan will break the work into 13 reviewable tasks and execution will remain inline in the current `D:/YoutubeDoro` checkout, preserving unrelated dirty files.
