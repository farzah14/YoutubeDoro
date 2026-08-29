# Studio Window Anime UI Redesign

## Status

Approved in conversation on 2026-08-29. This document defines the visual redesign shown across the five supplied screenshots. It does not authorize unrelated product or data-flow changes.

## Product intent

YoutubeDoro should feel like a cinematic slice-of-life anime study room, not a generic productivity dashboard placed over a photograph. The room is the visual anchor. Timer and workspace tools should feel integrated into that environment while remaining quiet, legible, and efficient.

The primary user is a learner beginning or managing a focus session. The primary action is starting or resuming the timer for the selected focus priority.

## Scope

Redesign the connected visual system represented by the supplied screenshots:

1. Home and Focus timer.
2. Music.
3. Sub-tasks.
4. Themes within Settings.
5. History within Settings, including its empty and populated states.

The browser chrome visible in the screenshots is not part of the application. Existing timer, task, music, authentication, history, theme-assignment, and persistence behavior must remain intact.

## Design direction: Studio Window

The application uses a full-screen illustrated anime environment as its stage. The timer sits directly within the scene rather than inside a dashboard card. Compact tools attach to screen edges and open into matte work surfaces.

The signature element is a thin desk rail connecting the active mode, current focus priority, and primary action. It encodes workspace state and replaces decorative pills, glows, badges, and disconnected card groups.

### Visual contract

#### Color

- Ink `#101820`: deepest interface background and strong scene contrast.
- Night blue `#19293A`: matte panel surfaces.
- Rice paper `#F1EDE4`: primary text and timer numerals.
- Pencil grey `#AAB5BA`: secondary text and utility information.
- Lamplight amber `#E2A44F`: focus actions and active state.
- Rain blue `#78A6B5`: break state and calm secondary emphasis.

Use one accent for the current context. Purple gradients, neon glows, and unrelated accent colors are not part of this system.

#### Typography

- Keep the existing Inter face for interface text.
- Keep JetBrains Mono for timer values and precise durations.
- Use sentence case and compact type scales.
- Reserve all-caps treatment for genuine utility metadata, not section headings.
- Establish hierarchy through weight, scale, and spacing rather than decorative labels.

#### Shape and depth

- Matte, substantially opaque panels; no glassmorphism.
- `8px` to `10px` corner radii for panels and fields.
- Thin dividers and spacing replace nested cards.
- Shadows only separate an open panel from the scene.
- Controls remain familiar and visibly interactive.

#### Scene art

- Preserve the existing theme slots and assignment behavior.
- Use cinematic slice-of-life anime environments such as a lamplit desk, rain-streaked window, dusk classroom, or quiet train carriage.
- Replace every photographic scene used by the active theme catalog with an original anime illustration.
- Keep illustrations free of branded characters and borrowed franchise imagery.
- Do not create a new theme engine or add scenery solely for quantity.

## Layout

### Desktop

- The scene fills the viewport.
- Brand and account controls remain small at the top edges.
- The selected priority appears before the timer in the main reading order.
- Timer controls sit immediately below the timer.
- A compact desk rail runs along the lower workspace edge and holds the active mode plus tool entry points.
- Music and Sub-tasks open as `400px` to `440px` edge panels.
- Settings and History use a wider worktable surface suited to navigation, thumbnails, filters, and editable records.

### Mobile

- At viewport heights of `700px` or more, keep part of the scene and timer visible above an open tool; at shorter heights, let the bottom sheet cover the stage so its controls remain usable.
- Tool surfaces become full-width bottom sheets with a bounded viewport height and internal scrolling.
- Controls stack in reading order instead of shrinking desktop grids.
- Timer size uses responsive CSS such as `clamp()` to avoid clipping.
- The desk rail becomes a compact bottom dock with accessible labels.

## Surface designs

### Home and Focus timer

- Remove the oversized question and purple Focus/Break buttons.
- Present the current priority first, followed by mode and timer.
- Use one lamplight-amber primary Start, Pause, or Resume action according to timer state.
- Keep Reset and secondary actions as quiet text or icon controls.
- Focus and Break share one layout; break state changes the label and accent to rain blue.
- Timer numerals remain the focal point without occupying most of the viewport.
- Preserve today's focused duration as subordinate context.

### Music

- Present Music as a compact desk radio.
- Show the current station and playback state first.
- Keep one primary Play/Pause control and a precise horizontal volume tuner.
- Keep Stations, My Music, and Playlist Library as text tabs.
- Render stations as aligned frequency-style rows containing a marker, name, genre, and selected action.
- Use one selected-row tint and desk-rail marker; do not nest station cards.
- Preserve provider URL validation, saved providers, mute, volume, playback, and persistent player behavior.

### Sub-tasks

- Present Sub-tasks as a narrow notebook panel.
- Show the parent priority path before progress.
- Use one completion count and thin progress rule.
- Render each sub-task as a full-width checklist row with a native checkbox and quiet delete action.
- Keep completed rows readable with restrained muting and strike-through.
- Place the add field at the bottom and disable Add for blank text.
- If no priority is active, explain why items cannot be added and provide one direct action to open Focus Priorities.

### Themes

- Present scenes as a cinematic contact sheet rather than a grid of small dashboard cards.
- Make imagery large enough to judge composition and contrast.
- Keep Home and Focus assignment controls compact and clearly captioned.
- Mark the selected scene with a caption, check, and thin accent edge rather than a thick colored container.
- Keep search, filtering, randomization, custom uploads, and overlay strength secondary to scene selection.
- Scene changes must not alter the stable interface palette.

### History

- Present History as a study logbook grouped by date.
- Each session starts as a compact row with subject, time, learning duration, break duration, and status.
- Selecting a row reveals editable title, task, and note fields without duplicating the summary.
- Keep measured timing read-only.
- Keep filters in one compact toolbar and make Clear filters conditional on active filters.
- The empty state explains that completed or stopped focus sessions create records.
- Loading and failure states use direct text; failure includes a retry action.

## Component and data boundaries

- Keep `components/YouTubeRestTimer.tsx` as the workspace orchestrator.
- Reshape the existing `HomeHero`, timer components, `WorkspaceDock`, `LoFiPlayer`, `SubtaskPanel`, `SettingsPanel`, and `HistoryPanel` instead of introducing parallel replacements.
- Keep current hooks, tracker APIs, local-storage keys, Supabase behavior, and timer semantics as sources of truth.
- Reuse existing buttons, inputs, icons, overlay behavior, and responsive utilities where they fit the design.
- Add a shared primitive only when at least two redesigned surfaces need the same meaningful structure.
- Add no package, component framework, animation library, or state layer.

## Interaction and accessibility

- Use one restrained `160ms` panel entrance.
- Disable nonessential movement under `prefers-reduced-motion`.
- Preserve visible keyboard focus, accessible names, logical heading order, native field semantics, and Escape-to-close behavior.
- Selected state must be communicated by text or icon in addition to color.
- Disabled actions remain legible.
- Error messages identify the failed action and the next useful step.
- Prevent clipping, accidental nested scrolling, and hidden controls at supported viewport sizes.

## Verification

Automated verification:

- Existing timer, settings, theme, music, task, history, authentication, and workspace tests remain green.
- Add or update the smallest relevant UI source checks when structure changes invalidate existing assertions.
- Run `npm test`.
- Run `npm run typecheck`.
- Run `npm run lint`.
- Run `npm run build`.
- Run `git diff --check`.

Rendered verification:

- Inspect Home/Focus, Music, Sub-tasks, Themes, and History at desktop and mobile widths.
- Check idle, active, selected, disabled, empty, loading, and error states where applicable.
- Confirm no clipping, overlap, illegible contrast, distorted scene art, or inert controls.
- Confirm the interface remains visually stable across theme scenes.

## Acceptance criteria

- The five screenshot surfaces read as one authored anime study-room system.
- Anime scenery is genuinely illustrated rather than a stock photograph with anime copy layered over it.
- The timer and primary action have immediate visual priority.
- No purple gradient, glow-heavy selection, glass card, oversized pill, or nested-card hierarchy remains in the redesigned scope.
- Existing useful behavior remains available and testable.
- Desktop and mobile rendered checks pass without visible layout defects.

## Out of scope

- Rewriting timer, task, music, authentication, or persistence logic.
- Replacing Supabase or local storage.
- Adding new productivity features.
- Adding a new theme engine or an animation system.
- Copying an existing anime franchise, character, or external product interface.
- Cleaning unrelated working-tree files or QA artifacts.
