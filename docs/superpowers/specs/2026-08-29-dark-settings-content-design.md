# Dark Settings Content Design

## Goal

Make every Settings content section match the existing dark Settings shell. The Themes page, including “Make the room yours,” must no longer use a cream content background.

## Scope

- Update `app/globals.css` only.
- Apply the existing `--manga-*` palette to `.settings-main` and its shared content surfaces.
- Keep the Settings header, navigation, layout, interactions, and responsive behavior unchanged.
- Keep the existing vermilion accent for active and focus states.
- Do not add colors, components, dependencies, or data changes.

## Visual behavior

- `.settings-main` uses the existing charcoal/ink dark surfaces.
- Text uses the existing paper and muted paper tokens for contrast.
- Tabs, cards, filters, inputs, selects, custom-scene rows, and timer/account controls use existing dark palette tokens.
- Active and hover states remain identifiable through the existing vermilion token.

## Verification

Run the focused Settings test, the full test suite, TypeScript, lint, build, and `git diff --check`. Review the final diff and confirm only the requested CSS plus this design record are included.
