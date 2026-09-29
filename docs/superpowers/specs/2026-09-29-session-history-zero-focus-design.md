# Session History Zero-Focus and Layout Design

## Problem

History can show a completed session with zero focus seconds and nonzero break time. The break tools accept any active session; starting a break increments its count without checking whether focus time was recorded. Completing the break finalizes the current focus total, which can still be zero. The history summary also has markup for a compact row but no styles for that row, so the session title, task snapshot, time, metrics, and status run together.

## Approved behavior

- A break may start only after at least one focus second is recorded for the active session.
- If the user tries sooner, show a direct message that at least one second of focus must be recorded first.
- Keep the existing timer modes and break flow once focus time is available.
- Do not rewrite existing session rows: the stored record does not contain enough information to reconstruct missing focus time.

## Approved history layout

Use the selected two-level summary. Put the session title and start time on the first line. Put focus and break totals together on the second line, with the status aligned at the right. Add consistent row padding, gaps, and a subtle divider between the two lines. On narrow panels, allow the identity and metrics to wrap without overlap. Hide the task snapshot when its trimmed text matches the trimmed session title; preserve it when it adds context.

The design follows the current dark settings surface, cream text, muted secondary text, fine blue-gray borders, and vermilion selection accent shown in the supplied screenshot.

## Scope and verification

Changes are limited to the break-start guard/message and session-history summary markup/styles. No schema or saved-data migration is needed. Review the diff and run the project's typecheck; do not claim existing account data or live authenticated behavior was repaired without a separate live check.
