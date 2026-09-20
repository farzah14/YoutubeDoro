# Correct Pomodoro and Animedoro Durations Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restore Pomodoro to 25 minutes, make Animedoro a fixed 50 minutes, and open the media-duration Anime Break only after Animedoro focus completes.

**Architecture:** Keep both method durations as named engine constants and route the media-driven break by timer mode. Preserve the legacy `focusMinutes` preference only for storage compatibility while removing the misleading editable control from settings. Update the login preview, documentation, and source-contract tests to match the engine.

**Tech Stack:** Next.js 16, React 19, TypeScript, Node test runner.

---

### Task 1: Add failing duration and routing regressions

**Files:**
- Modify: `tests/focusTimerEngine.test.ts`
- Modify: `tests/animeBreakSurface.test.ts`
- Modify: `tests/settingsPanel.test.ts`
- Modify: `tests/migrations.test.ts`
- Modify: `tests/uiRedesign.test.ts`

- [ ] Replace the fixed-50 Pomodoro assertions with a fixed-25 Pomodoro test and a fixed-50 Animedoro test.
- [ ] Assert that Animedoro waits for media metadata even when auto-start is enabled, while Pomodoro can use its normal clock break.
- [ ] Assert that only completed Animedoro opens Anime Break.
- [ ] Assert settings expose fixed `25 min` Pomodoro and fixed `50 min` Animedoro rows without a `Flexible focus` control.
- [ ] Assert the login preview shows `25:00`.
- [ ] Run `npx --yes tsx --test tests/focusTimerEngine.test.ts tests/animeBreakSurface.test.ts tests/settingsPanel.test.ts tests/migrations.test.ts tests/uiRedesign.test.ts` and confirm the new assertions fail for the reversed current implementation.

### Task 2: Correct the engine and UI mapping

**Files:**
- Modify: `lib/focusTimerEngine.ts`
- Modify: `components/YouTubeRestTimer.tsx`
- Modify: `components/settings/SettingsPanel.tsx`
- Modify: `components/auth/LoginHomeBackdrop.tsx`

- [ ] Define `POMODORO_FOCUS_MINUTES = 25` and `ANIMEDORO_FOCUS_MINUTES = 50`.
- [ ] Route `pomodoro` and `animedoro` through their matching engine constants.
- [ ] Keep Animedoro idle at the focus-to-break boundary until a video supplies metadata; retain normal Pomodoro clock-break behavior.
- [ ] Open Anime Break only when `followedByBreak && mode === "animedoro"`.
- [ ] Replace the settings flexible-focus control with read-only Pomodoro and Animedoro duration rows.
- [ ] Restore the unauthenticated home preview to `25:00`.
- [ ] Run the focused tests again and confirm they pass.

### Task 3: Align durable documentation and verify the branch

**Files:**
- Modify: `README.md`
- Modify: `docs/superpowers/specs/2026-09-21-pomodoro-anime-break-design.md`
- Modify: `docs/superpowers/plans/2026-09-21-pomodoro-anime-break.md`

- [ ] Describe Pomodoro as 25 minutes and Animedoro as 50 minutes with a media-duration break.
- [ ] Mark the original implementation plan's duration ownership as superseded by this correction plan.
- [ ] Run `npx --yes tsx --test tests/*.test.ts`.
- [ ] Run `npm run typecheck`.
- [ ] Run ESLint for all touched TypeScript and TSX files.
- [ ] Run `npm run build`.
- [ ] Review `git diff --check` and `git status --short`.
- [ ] Commit and push the correction to `origin/feature/pomodoro-anime-break`, updating pull request #1.
