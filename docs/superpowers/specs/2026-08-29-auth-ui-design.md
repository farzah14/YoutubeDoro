# Auth Screen UI Repair

## Context

The auth page renders its content correctly, but the screenshot shows browser-default layout and controls because `AuthScreen` uses `auth-*` class names that have no matching selectors in `app/globals.css`.

## Approved direction: centered atelier card

Restore the auth page as one focused, centered card over the existing dark YoutubeDoro workspace palette.

- Use the existing CSS tokens: deep ink background, blue surface, slate borders, warm amber accent, and existing Inter/mono font variables.
- Give the page a full-viewport responsive layout with subtle radial atmosphere, a bounded card, readable spacing, and a clear hierarchy: eyebrow, heading, explanation, Google action, divider, email form, status message, and secondary links.
- Style Google sign-in as a quiet secondary button and email sign-in as the primary amber action.
- Style inputs, disabled states, error/success messages, and `:focus-visible` states explicitly.
- Keep the card usable on narrow screens by reducing padding and allowing the form to remain one column.
- Reuse the existing markup and auth behavior; this is a CSS-only repair unless verification reveals a necessary markup issue.

## Out of scope

- Supabase configuration, OAuth behavior, password flows, or route changes.
- Tracker dashboard redesign or new components.

## Verification

- Run the focused and full lint checks, typecheck, tests, and production build.
- Inspect the auth route at desktop and narrow viewport widths and confirm the form remains accessible and legible.
