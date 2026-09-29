# Session History Zero-Focus Fix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prevent recording breaks before any focus time is tracked and make saved-session history readable at desktop and narrow widths.

**Architecture:** Gate break starts in the shared timer-to-recorder callback using the active session's in-memory measurements, before `breakStart` increments the count. Keep the data model unchanged. Restructure the history summary into identity/time and metrics/status rows, then style those existing elements in the global stylesheet.

**Tech Stack:** Next.js, React, TypeScript, global CSS.

---

## File map

- `components/YouTubeRestTimer.tsx`: reject break starts while the active session has zero tracked learning seconds.
- `components/timer/RestCardContainer.tsx`: explain the one-second focus requirement when the callback rejects a break.
- `components/history/HistoryPanel.tsx`: group title/time and focus/break/status; hide a task snapshot that repeats the title.
- `app/globals.css`: provide the missing history-summary layout, spacing, focus treatment, and responsive wrapping.

## Task 1: Require recorded focus before starting a break

**Files:**
- Modify: `components/YouTubeRestTimer.tsx`
- Modify: `components/timer/RestCardContainer.tsx`

- [x] In `YouTubeRestTimer.tsx`, replace the current `handleBreakStart` with:

```tsx
const handleBreakStart = useCallback(async () => {
  if (getLastMeasurements().learningSeconds < 1) return false;
  return startBreak();
}, [getLastMeasurements, startBreak]);
```

This check runs before `useSessionRecorder.breakStart()` increments `breakCount` or flushes a checkpoint. The measurements ref is updated synchronously by `checkpointSession`, so an automatically started break after a completed focus interval passes the same guard.

- [x] In `RestCardContainer.tsx`, change the rejection text to:

```tsx
if (allowed === false) setBreakError("Track at least 1 second of focus before starting a break.");
```

The plain and anime break controls share this callback and message.

## Task 2: Reshape and space the history summary

**Files:**
- Modify: `components/history/HistoryPanel.tsx`
- Modify: `app/globals.css`

- [x] In `HistoryRow`, compute whether the task label adds information:

```tsx
const hasDistinctTaskTitle = session.taskTitleSnapshot.trim() !== session.title.trim();
const breakLabel = session.breakCount === null
  ? "Break · count unknown"
  : `Break · ${session.breakCount} ${session.breakCount === 1 ? "break" : "breaks"}`;
```

- [x] Replace the contents of the summary button with this two-level structure:

```tsx
<span className="history-row__summary-main">
  <span className="history-row__identity">
    <strong>{session.title}</strong>
    {hasDistinctTaskTitle && <small>{session.taskTitleSnapshot}</small>}
  </span>
  <time className="history-row__time">{displayTime(session.startedAt)}</time>
</span>
<span className="history-row__summary-details">
  <span className="history-row__summary-metrics">
    <span className="history-row__summary-metric"><small>Focus</small><strong>{formatDuration(session.learningSeconds)}</strong></span>
    <span className="history-row__summary-metric"><small>{breakLabel}</small><strong>{formatDuration(session.breakSeconds)}</strong></span>
  </span>
  <span className={`history-status history-status--${session.status}`}>{labelStatus(session.status)}</span>
</span>
```

- [x] Add styles for the summary button and its children near `.history-list` in `app/globals.css`:

```css
.history-row__summary {
  display: grid;
  width: 100%;
  gap: 0.65rem;
  border: 0;
  background: transparent;
  padding: 0;
  color: inherit;
  text-align: left;
}

.history-row__summary:focus-visible {
  outline: 2px solid var(--manga-vermilion);
  outline-offset: 3px;
}

.history-row__summary-main,
.history-row__summary-details {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  min-width: 0;
}

.history-row__identity { display: grid; min-width: 0; gap: 0.2rem; }
.history-row__identity strong { color: var(--manga-paper); font-size: 0.86rem; line-height: 1.45; overflow-wrap: anywhere; }
.history-row__identity small,
.history-row__time,
.history-row__summary-metric small { color: var(--manga-paper-muted); font-size: 0.68rem; line-height: 1.45; }
.history-row__time { flex: 0 0 auto; }
.history-row__summary-metrics { display: flex; flex: 1; flex-wrap: wrap; gap: 0.6rem 1.4rem; min-width: 0; }
.history-row__summary-metric { display: grid; min-width: 6.5rem; gap: 0.12rem; }
.history-row__summary-metric strong { color: var(--manga-paper); font-size: 0.76rem; font-weight: 750; }
.history-row__summary-details .history-status { flex: 0 0 auto; }

@media (max-width: 640px) {
  .history-row__summary-main { align-items: flex-start; }
  .history-row__summary-details { align-items: flex-start; flex-wrap: wrap; }
  .history-row__summary-metrics { gap: 0.55rem 0.9rem; }
}
```

The history row already supplies its outer border and padding. These rules style only its summary button, keep the two chosen information levels distinct, and allow both metrics and status to wrap on narrow screens.

## Task 3: Review and verify the focused change

**Files:** No additional files.

- [x] Review `git diff` to confirm the break guard precedes the count mutation, both break modes use the same rejection text, and the history expansion/editor behavior remains unchanged.
- [x] Run `npm run typecheck`; expect exit code 0.
- [x] Run `git diff --check`; expect no whitespace errors.

No test files are added or executed for this task.
