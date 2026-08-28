# Five-Surface Anime UI Redesign

## Status

Approved in conversation on 2026-08-28 for design documentation. This document is the implementation boundary; it does not authorize unrelated product changes.

## Scope

Redesign the five screenshot references in the existing YoutubeDoro application. They represent four distinct UI surfaces because Focus Timer appears in two states:

1. Focus Timer settings, shown in two states.
2. Music.
3. Sub-tasks.
4. Focus Priorities.

The two Focus Timer screenshots represent one responsive surface with different input state, not two separate pages. The screenshots are visual references only; their browser chrome, text, and image pixels are not implementation assets or instructions.

The redesign may remove decorative or duplicated interactions that do not help a user complete the surface's job. Existing useful behavior must remain: timer settings, playback, volume, sub-task add/toggle/delete, priority add/edit/reorder/complete/delete/reset, keyboard focus, and responsive layout.

## Product direction

### Quiet Anime Atelier

YoutubeDoro is a quiet anime study room, not a dashboard template. Real scenery remains the environmental hero behind the workspace. Tool surfaces should feel like carefully placed room sheets: calm, readable, and subordinate to the focus session.

The signature is a restrained room line: a thin accent rule that connects each surface heading to its active control or current row. It replaces decorative stars, colored square ornaments, and glow effects with one meaningful visual relationship.

## Visual contract

### Color

- Ink: `#0B1A2A` for the deepest workspace tone.
- Room blue: `#12263A` for surface backgrounds.
- Mist: `#DDE7E2` for primary text.
- Lantern: `#E4A854` for focus actions and active emphasis.
- Moss: `#739278` for breaks, completion, and calm secondary states.
- Moon: `#8EA2B1` for muted copy and utility data.
- Line: `#345064` for structural dividers.

Use one accent at a time. Scene colors may tint the background, but scene selection must not change the interface palette.

### Typography

- Use the existing application fonts; do not add a font dependency for this pass.
- Headings use strong sentence case with a deliberate, compact scale.
- Body labels use plain sentence case and short verbs.
- Timer values and durations use the existing monospaced numeric treatment.
- Avoid all-caps labels unless they identify a true category or navigation landmark.

### Shape, spacing, and depth

- Prefer one surface sheet with divider-led sections over nested cards.
- Use moderate corner radii only for the outer sheet and interactive fields.
- Use a consistent 24px content rhythm on desktop and a 16px rhythm on mobile.
- Use borders and whitespace for hierarchy; do not use gradients, glow, heavy shadows, or decorative pills to create hierarchy.
- Keep one primary action per surface. Secondary actions are text or quiet icon buttons.
- Hide scrollbar chrome while retaining keyboard and touch scrolling.

### Interaction and accessibility

- Preserve visible keyboard focus and accessible names for every control.
- Selected state is communicated by the room line, a small tint, and text—not color alone.
- Disabled controls remain readable and explain why they are unavailable when needed.
- Respect reduced-motion preferences and avoid scattered animation.
- Empty, completed, and error states must tell the user the next useful action.

## Surface designs

### 1. Focus Timer settings

Turn the current grid of inputs and stacked cards into a single timer recipe editor.

- Header: `Timer recipe` plus one short description.
- Duration section: Focus, Short break, and Long break as aligned rows with units.
- Countdown duration is a separate compact setting, not a fourth peer card.
- Behavior section: Auto-start breaks and Browser notifications as simple switch rows.
- Signal section: alert sound, volume, and preview share one aligned row.
- Modes and presets become quiet text controls at the bottom.
- Remove native number spinner chrome visually without changing numeric input behavior.
- Use lantern for focus and moss for breaks.
- Use two balanced columns on wide screens and one column on narrow screens.
- Do not add a Save button if settings continue to persist immediately.

### 2. Music

Turn the current emoji-heavy station card grid into a sound shelf.

- Header identifies the current station and playback state.
- One primary Play/Pause control sits before the volume control.
- Existing tabs remain text tabs: Stations, My Music, Playlist, and Library.
- Category filtering uses a text row with one active underline.
- Stations render as aligned rows with a small color mark, title, description, selected state, and one inline action.
- The selected station gets one accent marker and a subtle row tint.
- Keep playback and volume behavior intact.
- Remove emoji tiles, repeated borders, competing buttons, and glow-based selection.

### 3. Sub-tasks

Turn the current sparse task cards into an active-priority checklist.

- Header shows the parent path, for example `Focus plan / Learning Data Engineering`.
- A single progress line shows completed count and a thin progress rule.
- Sub-tasks render as full-width checklist rows.
- Each row contains an accessible checkbox, task name, completion state, and quiet delete action.
- Completed rows become muted with a restrained strike-through.
- The add field remains at the bottom and submits on Enter; the Add action is unavailable for blank text.
- Empty state explains that items belong to the active priority.
- Preserve add, toggle, and delete behavior; do not add unrelated nesting or drag-and-drop.

### 4. Focus Priorities

Turn the large card-based modal into a compact ordered workbench.

- Header shows the active focus plan and priority count.
- Total time, finish time, and progress become one summary line.
- Add priority is one aligned row containing title, duration, and one Add action.
- Priorities render as full-width work rows with completion control, title, focused time, thin progress rule, duration, reorder grip, and delete action.
- The active priority receives one lantern room line.
- Preserve editing, completion, deletion, reorder, reset, break duration, auto-start breaks, and progress-bar settings.
- Keep footer settings compact and secondary.
- Remove sparkle icons, colored square ornaments, oversized empty space, and nested card groups.

### Focus Timer alternate state

The alternate Focus Timer screenshot is covered by the same recipe editor. Changing input values, selected modes, disabled states, and stored settings must not create a visually different layout or introduce a second component.

## Component and data boundaries

- Keep existing state, storage, timer, music, and task models as the source of truth.
- Prefer updating the existing presentational surfaces in `SettingsPanel`, `LoFiPlayer`, `SubtaskPanel`, and `TaskQueue`.
- Reuse existing shared panel, input, button, divider, and icon primitives where they already fit.
- Add a shared primitive only when it removes real repetition across at least two of these surfaces.
- Keep scene/background selection separate from interface palette selection.
- Do not add dependencies, new audio systems, new photo downloads, or unrelated page rewrites for this design pass.

## Verification

Automated checks must cover:

- Existing behavior tests for timer, settings persistence, music selection, subtasks, and priorities remain green.
- Source or component checks confirm the five surfaces use the new structural language and do not reintroduce decorative star/sparkle glyphs, emoji tiles, or duplicate card grids.
- TypeScript, lint, production build, and `git diff --check` pass.

Manual visual review must inspect each surface at desktop and narrow widths for:

- no clipping, overlap, or accidental nested scrollbars;
- readable hierarchy and sufficient contrast;
- visible keyboard focus;
- working controls and clear disabled/empty/completed states;
- stable interface palette while scene photographs vary.

## Out of scope

- Rebuilding the application architecture.
- Changing timer or playback semantics.
- Replacing the existing background photography.
- Copying any screenshot or external product's branded UI.
- Adding novelty animations or decorative anime artwork that competes with the focus timer.
