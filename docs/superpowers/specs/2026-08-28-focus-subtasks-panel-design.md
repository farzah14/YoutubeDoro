# Focus Sub-tasks Panel

## Goal

Replace the visible Sounds panel with a simple Sub-tasks panel where users can manage checklist items belonging to the currently selected Focus Priority, while keeping the existing soundscape implementation and storage available but hidden.

## Scope

- Change the dock tool from Sounds to Sub-tasks and use an existing checklist/check icon.
- Replace the Sounds modal content with a Sub-tasks modal.
- Show the active Focus Priority as the parent context, for example `Learning Data Engineering`.
- Let users add, check/uncheck, and delete plain-text sub-tasks such as `Learn Python` and `Learn SQL`.
- Store sub-tasks inside their parent `TaskItem`, so switching priorities switches to that priority’s own list.
- Keep parent priority completion manual; checking every sub-task never completes the parent automatically.
- Keep `SoundscapePanel`, `useSoundscape`, `lib/soundscapes.ts`, and soundscape storage keys in the repository unchanged, but stop rendering the Sounds panel and remove its dock entry.

## Data model and migration

Add a `SubtaskItem` type with only `id`, `text`, `completed`, `createdAt`, and `order`. Add `subtasks: SubtaskItem[]` to `TaskItem`.

`migrateTaskItems` will normalize missing or malformed sub-task arrays to an empty list, trim valid text, discard blank/invalid entries, preserve valid completion state, and reassign contiguous order values. Existing task fields and progress remain unchanged.

The task model will expose small pure helpers for adding, toggling, and deleting a sub-task by parent task id. Empty text is ignored, and no timer, duration, color, emoji, or progress fields are added to sub-tasks.

## Data flow

`useTasks` owns persistence through the existing day task storage key. It will expose `activeTask`, `addSubtask`, `toggleSubtask`, and `deleteSubtask` callbacks. The active parent is the same task selected by Focus Priority and the Focus timer. `SubtaskPanel` receives the active task and callbacks; it does not read or write storage directly.

## Panel interaction and layout

- The replacement panel is titled `Sub-tasks` and identifies the current parent priority.
- A single input and `Add sub-task` button create plain-text checklist items.
- Each sub-task card has a native checkbox, text, and delete action.
- Completed cards use muted/struck styling but remain manually reversible.
- If no incomplete/selected priority exists, show a short empty state and an `Open Focus Priorities` action.
- The existing two-column card treatment is reused on desktop and collapses to one column on narrow screens.
- The panel contains no sound tabs, categories, volume sliders, playback controls, or sound cards.

## Non-goals

- Automatic parent completion.
- Sub-task timers, estimates, per-sub-task focus progress, colors, or emojis.
- Nested sub-sub-tasks.
- Deleting or refactoring the existing soundscape engine, catalog, or storage.
- Changing the separate Music player.

## Accessibility and verification

- Use native checkbox semantics and descriptive labels for every sub-task action.
- Keep keyboard focus styles and modal close behavior.
- Add task-model and migration tests for nested sub-task persistence and parent independence.
- Add UI regression checks for the Sub-tasks dock/panel and absence of the rendered Soundscape panel.
- Browser-check switching parent priorities, adding/checking/deleting items, empty state, responsive layout, and no horizontal overflow.
