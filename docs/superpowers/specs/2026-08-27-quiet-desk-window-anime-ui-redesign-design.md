# Quiet Desk Window — Cozy Anime UI Redesign

Date: 2026-08-27
Status: Approved design

## Scope and authority

The direct user request is to improve the existing YoutubeDoro interface and redesign it fully into a distinctive anime-style focus experience. The two supplied Downloads documents are treated as reference specifications: they define the desired visual direction, constraints, and acceptance criteria, but do not replace the user's request or repository rules.

The approved redesign is a presentation-layer change. Existing timer, task, statistics, notes, persistence, authentication, and Notion behavior must remain intact.

## Product thesis

YoutubeDoro has one primary job: help a person start and sustain a focus session. The interface should feel like a quiet illustrated study room, with the active focus session represented by the lit window at its center. Scenery supports attention; it never competes with the timer or makes controls harder to read.

The design deliberately avoids generic AI-generated dashboard patterns: no stock photography, characters, mascots, decorative emoji, neon HUD styling, heavy glass blur, equal-weight metric-card grids, or unmotivated gradients.

## Visual direction

### Signature

The central focus stage is a calm “study bay” backed by a local illustrated window scene. The scene is visible around the application shell and lightly behind the focus stage, while solid/semi-solid surfaces preserve readability. The three themes use different illustrated compositions rather than one image with different color filters.

### UI language

- Flat ink-and-paper surfaces with clear 1px borders.
- Restrained 12–16px corner radii instead of oversized rounded containers.
- Soft directional shadows; no full-screen blur as a readability strategy.
- Editorial micro-labels for mode, date, and progress.
- Inter remains the body/interface font; JetBrains Mono is reserved for time and data.
- Japanese atmosphere labels are used sparingly as secondary texture, never as required meaning.
- One theme accent drives active states, timer progress, and primary actions.

### Semantic tokens

The theme system exposes semantic values rather than scattering theme checks through components:

- `background`
- `surface`
- `surfaceSecondary`
- `surfaceHover`
- `textPrimary`
- `textSecondary`
- `textMuted`
- `accent`
- `accentSoft`
- `accentHover`
- `accentForeground`
- `border`
- `borderSubtle`
- `borderFocus`
- `shadow`
- `success`
- `warning`
- `timerFocus`
- `timerBreak`

### Theme palette

| Theme | Environment | UI surfaces | Accent |
| --- | --- | --- | --- |
| Night Study | ink navy, indigo sky, moonlight | blue-black slate | desk-lamp amber |
| Rainy Evening | cool blue-gray window, wet city silhouettes | deep desaturated blue | pale cyan |
| Sunset Study | plum dusk, peach sky, rose light | warm aubergine | peach-gold |

The UI stays readable against every environment through surfaces and overlays, not text shadows.

## Local environment artwork and ambience

The project will own three replaceable, local SVG scene assets:

- `public/themes/night-study.svg`
- `public/themes/rainy-evening.svg`
- `public/themes/sunset-study.svg`

Each scene is a hand-built vector composition with a window/sky, distant silhouettes, desk or room shapes, and theme-specific lighting. The assets must not hotlink arbitrary external images.

`AmbientBackground` owns the visual layer stack:

1. Local environment artwork.
2. Theme-specific CSS/SVG ambience.
3. Contrast and readability overlay.
4. Application UI above the environment.
5. Small UI micro-interactions.

The primary path uses CSS/SVG ambience rather than a continuously animated canvas:

- Night Study: sparse stars, static lamp glow, and extremely slow cloud drift.
- Rainy Evening: restrained layered rain and window streaks kept behind content.
- Sunset Study: slow cloud movement, warm light shift, and a small amount of dust.

Ambient animation uses transform/opacity where possible, reduces decorative work on small screens, and pauses or reduces work when the document is hidden. `prefers-reduced-motion: reduce` disables drift, rain, dust, and twinkle while preserving all product behavior.

## Responsive composition

The same focused components are recomposed with responsive layout rules; desktop, tablet, and mobile are not separate applications.

### Desktop

```text
┌──────────────────────────────────────────────────────────────────────────┐
│ brand + date                         theme · lofi · sync · notes · settings │
├───────────────┬─────────────────────────────────┬────────────────────────┤
│ TODAY'S DESK  │          FOCUS STAGE             │ TASK RAIL               │
│ goal          │ mode                            │ current task            │
│ focused time  │ timer ring                      │ up next                 │
│ sessions      │ active task                     │ add task                │
│ rest/streak   │ primary + secondary controls    │ completed (secondary)   │
├───────────────┴─────────────────────────────────┴────────────────────────┤
│ weekly heatmap · focus timeline · goal context                             │
└──────────────────────────────────────────────────────────────────────────┘
```

The focus stage is the largest and most visually centered region. The left brief has one job—answer “how is today going?” The right rail has one job—answer “what do I work on next?”

### Tablet

```text
┌─────────────────────────────────────────────┐
│ compact header + daily summary               │
├───────────────────────────┬─────────────────┤
│ focus stage               │ task rail        │
├───────────────────────────┴─────────────────┤
│ daily activity and statistics                │
└─────────────────────────────────────────────┘
```

The daily brief collapses into a compact summary row. Low-priority controls move into existing settings/notes surfaces rather than compressing the main workspace.

### Mobile

```text
┌──────────────────────────┐
│ brand · theme             │
├──────────────────────────┤
│ focus stage / timer       │
├──────────────────────────┤
│ current task              │
├──────────────────────────┤
│ up next / add task        │
├──────────────────────────┤
│ daily progress            │
├──────────────────────────┤
│ Focus · Tasks · Stats · Notes│
└──────────────────────────┘
```

The single flow prioritizes focus, then the current task, then the queue, then progress. A sticky bottom navigation provides ergonomic access without requiring a desktop sidebar.

## Component and state boundaries

The orchestration boundary remains `components/YouTubeRestTimer.tsx`. Targeted presentation refactoring may introduce or reshape focused components such as:

- application shell/header and mobile navigation,
- theme selector,
- ambient background,
- focus stage/session status/timer display/controls,
- current task and task queue,
- daily summary and activity timeline.

The following existing interfaces remain the source of truth:

- `useTimer` for start, pause, resume, stop, reset, completion, and timing state.
- `useTasks` for task creation, selection, completion, deletion, and pomodoro progress.
- Existing local-storage keys and daily note persistence.
- Existing Notion sync validation, pull, manual sync, and debounced sync handlers.
- Existing focus/rest totals, session count, daily goal, streak, and heatmap calculations.

Theme state is presentation-only. It is persisted through the existing local-storage pattern, defaults to Night Study, and is applied independently of timer, task, session, statistics, notes, authentication, or Notion state. Theme selection is the only scenery control; the unused/overlapping scenery picker concept is not part of the primary UI.

## Interaction and state design

- Focus timer remains the dominant control: Idle → Start Focus, Running → Pause, Paused → Resume, Done → existing next-action behavior.
- Reset and skip/stop remain visible but visually subordinate.
- Current Task appears before Up Next and exposes the existing select/complete behavior.
- Empty tasks show a direct Add Task action and do not display an empty chart.
- Completed tasks are collapsed or visually secondary where the current component supports it.
- Theme selection is a quick-access three-option menu with local previews, keyboard access, Escape close, outside-click close, and a clear selected state.
- Notion errors are localized to a compact non-blocking status control; details and recovery remain in the existing settings modal.
- Existing notes, Lo-fi player, settings, and Notion actions remain available without changing their behavior.

## Accessibility and performance

- Use semantic buttons and links with visible keyboard focus.
- Add accessible names to icon-only controls and preserve meaningful labels.
- Maintain comfortable touch targets on mobile.
- Do not make hover, color, or animation the only way to understand state.
- Preserve safe Escape handling for popovers and dialogs.
- Keep decorative layers pointer-transparent and behind critical UI.
- Prefer local SVG, CSS, and native browser capabilities over new animation packages.
- Avoid large particle systems, continuous JS animation loops, full-screen blur, heavy parallax, and layout-shifting theme changes.
- Ensure theme transitions are smooth without a white flash; initialize the saved theme before the page paints where practical.

## Validation strategy

Run the repository's available checks, including:

- `npm run lint`
- `npm run build`
- focused browser/manual smoke checks for start, pause, resume, reset, stop/skip, and focus-to-break behavior;
- task create, select, complete, persistence, and supported reorder checks;
- statistics/session-count/daily-goal checks without changing formulas;
- all three theme selections and reload persistence;
- keyboard navigation, visible focus, Escape close, and reduced-motion behavior;
- responsive review at desktop, tablet, and mobile widths.

Visual QA covers the nine baseline conditions:

1. Night Study — desktop, tablet, mobile.
2. Rainy Evening — desktop, tablet, mobile.
3. Sunset Study — desktop, tablet, mobile.

For each condition, verify timer priority, text contrast, task hierarchy, navigation, artwork crop, no unintended overflow, no occlusion by ambience, and restrained motion.

## Non-goals

This redesign does not include anime characters, mascots, AI chat, music/audio-system expansion, new gamification, authentication redesign, database/backend rewrites, timer-algorithm rewrites, statistics-formula changes, framework migration, Three.js, video backgrounds, or unrelated refactoring.

## Definition of done

The redesign is complete when the app unmistakably reads as a custom Cozy Anime / Lo-fi Study focus tool; all three local themes are selectable and persistent; desktop, tablet, and mobile compositions are intentional; the timer remains the primary focus; task/statistics hierarchy is clearer; motion is moderate and reduced-motion-safe; existing domain behavior is preserved; no unnecessary dependencies are introduced; and available validation plus the nine-condition visual review are recorded honestly.
