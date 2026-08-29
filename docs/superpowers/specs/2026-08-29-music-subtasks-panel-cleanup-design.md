# Music and Sub-tasks Panel Cleanup

## Status

Approved in conversation on 2026-08-29.

## Goal

Make the Music and Sub-tasks edge panels use the existing charcoal desk surface instead of the blue modal shell, and simplify the Music station list.

## Scope

- Apply the charcoal surface only to the shared modal shell used by Music and Sub-tasks.
- Keep the page scene, timer, other dialogs, and existing behavior unchanged.
- Remove the Music frequency row containing `STREAM`, its separator glyphs, and `STATIONS / 01–06`.
- Keep each station's number and letter values, but remove the visible `CH` and `BAND` prefixes.
- Preserve station selection, playback, volume, mute, provider URLs, and responsive behavior.

## Implementation

- Update `components/audio/LoFiPlayer.tsx` to delete the frequency row and render only the station number and band letter.
- Update `app/globals.css` with a scoped audio-overlay shell override using the existing `--manga-charcoal` token.
- Update `tests/musicPanel.test.ts` so the source contract checks the simplified station markup and absence of the removed labels/row.
- Add no dependencies, components, state, or new styling system.

## Verification

- Run the focused Music test.
- Run the full test suite, typecheck, lint, build, and `git diff --check`.
- Inspect Music and Sub-tasks at desktop and mobile widths for charcoal surfaces, no frequency row, no `CH`/`BAND` prefixes, and no clipping.
