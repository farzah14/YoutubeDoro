# PIP, Break, and Sub-task Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Keep the active scenery and live countdown in Picture-in-Picture, simplify the visible break control, constrain Sub-tasks scrolling to the checklist, and add a Notes dock action.

**Architecture:** Keep the existing `useFocusTimer` state and native Document Picture-in-Picture API. Store the latest timer snapshot and PIP DOM nodes in refs so the parent timer updates the already-open PIP document, and pass the active built-in scene URL into the PIP renderer. Use CSS-only refinement for the timer method select and a bounded checklist region; preserve existing task, break, and note persistence callbacks.

**Tech Stack:** Next.js 16, React 19, TypeScript, native Document Picture-in-Picture, CSS, Node test runner.

---

### Task 1: Lock the requested behavior with failing source contracts

**Files:**
- Modify: `D:/YoutubeDoro/tests/workspaceVisuals.test.ts`
- Modify: `D:/YoutubeDoro/tests/subtaskPanel.test.ts`

- [ ] **Step 1: Add assertions for the five requested behaviors.**

  Assert that `LearningCard.tsx` owns a latest-value PIP ref/update path, accepts a scene URL, exposes only `Focus` and `Break` phase labels, and renders a timer-method control wrapper. Assert that `app/globals.css` styles the wrapper. Assert that `SubtaskPanel.tsx` marks the checklist as a no-scrollbar internal region and that its stylesheet gives that region bounded overflow. Assert that `WorkspaceDock.tsx` renders a Notes action with `BookIcon`.

- [ ] **Step 2: Run only the affected tests and confirm the new assertions fail for missing behavior.**

  Run `node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON --experimental-strip-types --test tests/workspaceVisuals.test.ts tests/subtaskPanel.test.ts`.

- [ ] **Step 3: Keep the failure output as the red checkpoint.**

  The expected failures are missing PIP latest-state/scene contracts, missing single Break contract, missing bounded subtask overflow, and missing Notes dock markup; no implementation changes are made before this red run.

### Task 2: Repair PIP state synchronization and scene rendering

**Files:**
- Modify: `D:/YoutubeDoro/components/timer/LearningCard.tsx`
- Modify: `D:/YoutubeDoro/components/YouTubeRestTimer.tsx`

- [ ] **Step 1: Pass the active built-in scene URL into `LearningCard`.**

  Add a required `pipBackgroundUrl: string` prop and pass `COZY_THEMES[activeTheme].backgroundUrl` from `YouTubeRestTimer.tsx` beside the existing timer props.

- [ ] **Step 2: Replace the stale PIP closure with refs.**

  Keep the native `requestWindow` call, but store the PIP window, time node, phase node, and latest `{ displaySeconds, phase, showTaskInPip, taskLabel }` snapshot in refs. Update the nodes from a small `updatePip` callback after each timer render. Remove the PIP-local interval that reads the stale `timer` object, and clear refs on `pagehide`/component cleanup.

- [ ] **Step 3: Render the active scene in the PIP document.**

  Include the passed `pipBackgroundUrl` as the PIP document background with a readable solid scrim and the same quiet ink/line palette. Display the phase as `Focus` or `Break`, never the internal `short-break`/`long-break` names.

- [ ] **Step 4: Run the affected tests and typecheck the changed path.**

  Run `node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON --experimental-strip-types --test tests/workspaceVisuals.test.ts` and `npx tsc --noEmit`; both must pass before the next task.

### Task 3: Simplify phase controls and refine the timer method select

**Files:**
- Modify: `D:/YoutubeDoro/components/timer/LearningCard.tsx`
- Modify: `D:/YoutubeDoro/app/globals.css`

- [ ] **Step 1: Replace the two visible break buttons with one `Break` button.**

  Keep the engine’s short/long timing rules and automatic fourth-session long break intact. Map a manual `Break` click to the short-break phase and treat either internal break phase as the single visible Break selection.

- [ ] **Step 2: Add a semantic method wrapper around the native select.**

  Keep the existing five `TimerMode` options and disabled-while-running behavior, add the visible `Method` label, and use the existing `ChevronDownIcon` for the control affordance.

- [ ] **Step 3: Style the method control without adding a custom menu.**

  Add `.focus-dashboard__mode-control` and `.focus-dashboard__mode-label` rules, remove the pill treatment from the select, preserve keyboard focus, and add compact responsive spacing for the two-button phase row.

- [ ] **Step 4: Run the focused visual tests.**

  Run `node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON --experimental-strip-types --test tests/workspaceVisuals.test.ts tests/focusTimerEngine.test.ts` and confirm all tests pass.

### Task 4: Bound Sub-task scrolling and add Notes beside the Sub-tasks dock action

**Files:**
- Modify: `D:/YoutubeDoro/components/tasks/SubtaskPanel.tsx`
- Modify: `D:/YoutubeDoro/components/layout/WorkspaceDock.tsx`
- Modify: `D:/YoutubeDoro/app/globals.css`

- [ ] **Step 1: Make only the checklist region scroll.**

  Add `no-scrollbar` to the ordered checklist and leave the context, progress line, and add form outside it. Do not change add/toggle/delete callbacks or task persistence.

- [ ] **Step 2: Add the Notes dock action.**

  Reuse `BookIcon`, call `onPanelToggle("notes")`, expose `aria-pressed`, and label it `Notes`; place it immediately after the Sub-tasks action.

- [ ] **Step 3: Add the bounded list layout.**

  Give `.subtasks-list` `max-height`, `overflow-y: auto`, `overscroll-behavior: contain`, and a small right inset while keeping the surrounding panel available for its fixed header and form.

- [ ] **Step 4: Run the focused tests.**

  Run `node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON --experimental-strip-types --test tests/subtaskPanel.test.ts tests/workspaceVisuals.test.ts` and confirm all tests pass.

### Task 5: Finish with full verification and one rendered smoke check

**Files:**
- Verify: `D:/YoutubeDoro/components/timer/LearningCard.tsx`
- Verify: `D:/YoutubeDoro/components/YouTubeRestTimer.tsx`
- Verify: `D:/YoutubeDoro/components/tasks/SubtaskPanel.tsx`
- Verify: `D:/YoutubeDoro/components/layout/WorkspaceDock.tsx`
- Verify: `D:/YoutubeDoro/app/globals.css`

- [ ] **Step 1: Run the complete test suite.**

  Run all `tests/*.test.ts` files with Node’s test runner and require zero failures.

- [ ] **Step 2: Run static and production checks.**

  Run `npx tsc --noEmit`, `npm run lint`, `npm run build`, and `git diff --check`; each command must exit 0.

- [ ] **Step 3: Inspect the running app at the existing local URL.**

  Verify the active scene is visible in PIP, the PIP countdown changes while the main timer runs, the method select has its new label/affordance, the single Break control is visible, a long subtask list scrolls without moving the add form, and Notes opens from the dock.

- [ ] **Step 4: Report the implementation and preserve unrelated worktree changes.**

  Do not commit, reset, clean, or modify unrelated files; report any pre-existing runtime error separately from this scope.
