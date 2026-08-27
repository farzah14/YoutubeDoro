# Soundscape Quiet Studio Tiles

## Goal

Redesign the existing Sounds panel into compact, calm “Quiet Studio” tiles that make sound selection and active-layer volume control easy to scan. This is a presentation change; the existing sound catalog, persistence, playback controls, and five-layer limit remain unchanged.

## Scope

- Keep the Sounds, My Music, and Playlist Library tabs.
- Keep the current master play/pause, restart, category filters, presets, and five-layer limit.
- Redesign each sound item as a selectable tile with a category accent, icon, label, active state, and an inline volume control that appears only for active layers.
- Show active layers with a restrained accent border and playing indicator.
- Make unavailable tiles visibly unavailable when five layers are active, with a concise hint.
- Collapse the two-column tile grid to one-column rows on narrow screens.
- Preserve keyboard focus styles and descriptive accessible labels.

## Data flow and architecture

`SoundscapePanel` remains a presentational consumer of `SoundscapeController`. `SOUNDSCAPE_CATALOG`, `useSoundscape`, storage keys, and audio generation do not change. Tile click handlers continue to call `toggleLayer`; volume inputs continue to call `setVolume`; preset buttons continue to call `applyPreset`.

The redesign should use the existing CSS class structure where practical and add only the styles needed for the new tile anatomy. No new component or dependency is required.

## Interaction states

- Inactive tile: selectable, shows Add affordance through existing button semantics.
- Active tile: `aria-pressed=true`, accent border/indicator, and visible volume slider/output.
- At capacity: inactive tile disabled; active tiles remain removable and adjustable.
- Paused/playing: the existing master control and status remain the source of truth.
- Narrow viewport: tile content stays usable without horizontal scrolling.

## Non-goals

- User-uploaded or custom sounds.
- New procedural audio or catalog entries.
- Changes to sound mixing, persistence, presets, or playback semantics.
- Reworking the separate Music player.

## Verification

1. Add a focused regression test for the tile structure and preserved controller wiring.
2. Run the focused test red before the UI edit, then green after it.
3. Run the full test suite, TypeScript, lint, and production build.
4. Verify in the local browser at desktop and narrow widths: inactive/active tiles, volume visibility, five-layer limit, category filters, presets, and keyboard focus.
