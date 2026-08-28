# Focus Sub-tasks Panel Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the visible Sounds dock panel with a simple persistent Sub-tasks checklist scoped to the active Focus Priority.

**Architecture:** Extend the existing TaskItem persistence model with a normalized subtasks array. Keep pure task-model helpers and useTasks as the only state-changing path, then render a small presentational SubtaskPanel through the existing modal and dock. The soundscape catalog, hook, storage keys, and component remain in the repository but are no longer imported or rendered by the workspace.

**Tech Stack:** Next.js 16, React 19, TypeScript, native form and checkbox controls, CSS in app/globals.css, Node's built-in test runner, TypeScript, ESLint, and Playwright browser smoke checks.

---

## File map

- Modify: types/index.ts — define SubtaskItem and add subtasks to TaskItem.
- Modify: lib/taskModel.ts — add pure add/toggle/delete helpers and initialize new parent tasks with an empty list.
- Modify: lib/migrations.ts — normalize legacy and malformed nested sub-task data.
- Modify: hooks/useTasks.ts — persist nested sub-task actions through the existing daily task storage key.
- Create: components/tasks/SubtaskPanel.tsx — render the active priority's checklist and empty state.
- Modify: types/workspace.ts — replace the workspace panel value sounds with subtasks.
- Modify: components/layout/WorkspaceDock.tsx — rename the dock action and use the existing CheckIcon.
- Modify: components/YouTubeRestTimer.tsx — wire the active task and sub-task callbacks, and replace the Sounds modal body.
- Modify: app/globals.css — add the two-column checklist card layout and narrow-screen one-column rule.
- Modify: tests/taskModel.test.ts — test nested item operations and parent-completion independence.
- Modify: tests/migrations.test.ts — test empty defaults and malformed nested item normalization.
- Create: tests/subtaskPanel.test.ts — source-level regression checks for panel semantics, workspace wiring, and responsive CSS.
- Reference only: components/audio/SoundscapePanel.tsx, hooks/useSoundscape.ts, and lib/soundscapes.ts — preserve their implementation and storage behavior without rendering them.

This checkout already contains unrelated modified and untracked work. Inspect git status --short before each commit and stage only the files listed for that task. Never use a broad git add command. If a listed file was already untracked and contains earlier work, do not commit that whole file as a side effect; leave that task uncommitted and preserve the focused changes for final review.

## Task 1: Extend the task model with nested sub-tasks

**Files:**
- Modify: types/index.ts at the Task Queue types.
- Modify: tests/taskModel.test.ts at the task fixture and model imports.
- Modify: lib/taskModel.ts beside the existing task mutation helpers.

- [ ] **Step 1: Add the data contract and make test fixtures include an empty list**

Add this type before TaskItem, then add subtasks: SubtaskItem[] to TaskItem:

~~~ts
export interface SubtaskItem {
  id: string;
  text: string;
  completed: boolean;
  createdAt: number;
  order: number;
}
~~~

Update the task() helper in tests/taskModel.test.ts with:

~~~ts
subtasks: [],
~~~

Update the addTaskItem result in lib/taskModel.ts with:

~~~ts
subtasks: [],
~~~

- [ ] **Step 2: Write the failing nested-operation tests**

Import addSubtaskItem, deleteSubtaskItem, and toggleSubtaskItem from lib/taskModel.ts, then add:

~~~ts
test("manages nested sub-tasks without completing the parent", () => {
  const added = addSubtaskItem([task("a")], "a", {
    id: "a-1",
    text: "  Learn Python  ",
    createdAt: 2,
  });

  assert.deepEqual(added[0].subtasks, [{
    id: "a-1",
    text: "Learn Python",
    completed: false,
    createdAt: 2,
    order: 0,
  }]);

  const checked = toggleSubtaskItem(added, "a", "a-1");
  assert.equal(checked[0].subtasks[0].completed, true);
  assert.equal(checked[0].completed, false);

  const deleted = deleteSubtaskItem(checked, "a", "a-1");
  assert.deepEqual(deleted[0].subtasks, []);
});

test("ignores blank sub-tasks and unknown parent or child ids", () => {
  const original = [task("a")];
  assert.deepEqual(addSubtaskItem(original, "a", {
    id: "blank",
    text: "   ",
    createdAt: 2,
  }), original);
  assert.deepEqual(toggleSubtaskItem(original, "missing", "blank"), original);
  assert.deepEqual(deleteSubtaskItem(original, "a", "missing"), original);
});
~~~

- [ ] **Step 3: Run the focused tests and verify they fail for the missing helpers**

Run:

~~~powershell
node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON --experimental-strip-types --test tests/taskModel.test.ts
~~~

Expected: FAIL because the three new exports do not exist yet.

- [ ] **Step 4: Implement the smallest pure helpers**

Import SubtaskItem as a type and add this helper block after withOrder in lib/taskModel.ts:

~~~ts
const withSubtaskOrder = (subtasks: SubtaskItem[]) =>
  subtasks.map((subtask, order) => ({ ...subtask, order }));

export function addSubtaskItem(
  tasks: TaskItem[],
  taskId: string,
  input: Pick<SubtaskItem, "id" | "text" | "createdAt">
): TaskItem[] {
  const text = input.text.trim();
  if (!text) return tasks;

  return tasks.map((task) => task.id !== taskId ? task : {
    ...task,
    subtasks: [...task.subtasks, {
      id: input.id,
      text,
      completed: false,
      createdAt: input.createdAt,
      order: task.subtasks.length,
    }],
  });
}

export function toggleSubtaskItem(
  tasks: TaskItem[],
  taskId: string,
  subtaskId: string
): TaskItem[] {
  return tasks.map((task) => task.id !== taskId ? task : {
    ...task,
    subtasks: task.subtasks.map((subtask) => subtask.id !== subtaskId
      ? subtask
      : { ...subtask, completed: !subtask.completed }),
  });
}

export function deleteSubtaskItem(
  tasks: TaskItem[],
  taskId: string,
  subtaskId: string
): TaskItem[] {
  return tasks.map((task) => task.id !== taskId ? task : {
    ...task,
    subtasks: withSubtaskOrder(task.subtasks.filter((subtask) => subtask.id !== subtaskId)),
  });
}
~~~

- [ ] **Step 5: Run the focused tests and verify they pass**

Run:

~~~powershell
node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON --experimental-strip-types --test tests/taskModel.test.ts
~~~

Expected: all task-model tests pass, including both nested-operation tests. Parent completed remains unchanged after the child toggle.

- [ ] **Step 6: Commit the model change without staging unrelated work**

Run after reviewing git status --short:

~~~powershell
git add -- types/index.ts lib/taskModel.ts tests/taskModel.test.ts
git diff --cached --check
git commit -m "feat: add nested subtask task model"
~~~

If lib/taskModel.ts is still an existing untracked file containing earlier user work, leave this task uncommitted rather than capturing that unrelated baseline; keep the working-tree diff for the final focused review.

## Task 2: Normalize nested data during migration

**Files:**
- Modify: tests/migrations.test.ts at the legacy expected object and migration cases.
- Modify: lib/migrations.ts beside the existing scalar normalization helpers.

- [ ] **Step 1: Update the legacy expectation and write the malformed-data test**

Add subtasks: [] to the existing legacy task expectation. Then add:

~~~ts
test("normalizes nested sub-tasks and preserves valid completion", () => {
  const [task] = migrateTaskItems([{
    id: "task-3",
    text: "Learning Data Engineering",
    subtasks: [
      { id: "s-1", text: "  Learn Python  ", completed: true, createdAt: 5, order: 99 },
      { id: "s-2", text: "   ", completed: "yes", createdAt: -1 },
      null,
      { id: "s-3", text: " Learn SQL ", completed: false, createdAt: 7 },
    ],
  }]);

  assert.deepEqual(task.subtasks, [
    { id: "s-1", text: "Learn Python", completed: true, createdAt: 5, order: 0 },
    { id: "s-3", text: "Learn SQL", completed: false, createdAt: 7, order: 1 },
  ]);
});
~~~

- [ ] **Step 2: Run migration tests and verify the new expectations fail**

Run:

~~~powershell
node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON --experimental-strip-types --test tests/migrations.test.ts
~~~

Expected: FAIL because migrated tasks currently have no subtasks property and malformed nested entries are not normalized.

- [ ] **Step 3: Implement the migration normalizer**

Import SubtaskItem as a type and add this function after text():

~~~ts
function migrateSubtasks(value: unknown): SubtaskItem[] {
  if (!Array.isArray(value)) return [];

  const subtasks: SubtaskItem[] = [];
  for (const item of value) {
    const source = record(item);
    const id = text(source?.id, "");
    const subtaskText = text(source?.text, "");
    if (!source || !id || !subtaskText) continue;

    subtasks.push({
      id,
      text: subtaskText,
      completed: source.completed === true,
      createdAt: integer(source.createdAt, 0, 0, Number.MAX_SAFE_INTEGER),
      order: subtasks.length,
    });
  }

  return subtasks;
}
~~~

Add this property to every migrated TaskItem object:

~~~ts
subtasks: migrateSubtasks(source.subtasks),
~~~

- [ ] **Step 4: Run migration tests and verify they pass**

Run:

~~~powershell
node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON --experimental-strip-types --test tests/migrations.test.ts
~~~

Expected: all migration tests pass; legacy tasks receive [], valid text is trimmed, invalid entries are dropped, completion is preserved only for literal true, and order is contiguous.

- [ ] **Step 5: Commit only the migration files**

Run:

~~~powershell
git add -- lib/migrations.ts tests/migrations.test.ts
git diff --cached --check
git commit -m "feat: migrate nested focus subtasks"
~~~

## Task 3: Persist sub-task actions through useTasks

**Files:**
- Modify: hooks/useTasks.ts beside the existing task callbacks and return object.

- [ ] **Step 1: Add the hook callbacks using the existing saveTasks path**

Import the three model helpers, then add these callbacks after updateTask:

~~~ts
  const addSubtask = useCallback(
    (taskId: string, text: string) => {
      const trimmed = text.trim();
      if (!trimmed) return;
      const id = "subtask_" + Date.now() + "_" + Math.random().toString(36).substring(2, 7);
      saveTasks(addSubtaskItem(tasks, taskId, {
        id,
        text: trimmed,
        createdAt: Date.now(),
      }));
    },
    [saveTasks, tasks]
  );

  const toggleSubtask = useCallback(
    (taskId: string, subtaskId: string) => {
      saveTasks(toggleSubtaskItem(tasks, taskId, subtaskId));
    },
    [saveTasks, tasks]
  );

  const deleteSubtask = useCallback(
    (taskId: string, subtaskId: string) => {
      saveTasks(deleteSubtaskItem(tasks, taskId, subtaskId));
    },
    [saveTasks, tasks]
  );
~~~

Expose the callbacks alongside activeTask in the returned object:

~~~ts
    addSubtask,
    toggleSubtask,
    deleteSubtask,
~~~

Do not add a second storage key or separate hook state. activeTask remains the existing selectActiveTask(tasks, activeTaskId) result.

- [ ] **Step 2: Run the type gate**

Run:

~~~powershell
npx tsc --noEmit
~~~

Expected: PASS. The callbacks have the exact signatures used by the panel in Task 4.

- [ ] **Step 3: Commit the hook change when it can be staged without unrelated baseline content**

Run:

~~~powershell
git add -- hooks/useTasks.ts
git diff --cached --check
git commit -m "feat: persist focus subtask actions"
~~~

If this file remains an earlier untracked user file, keep it unstaged and include it in the final focused diff review instead of committing unrelated content.

## Task 4: Build the replacement Sub-tasks panel and responsive cards

**Files:**
- Create: tests/subtaskPanel.test.ts.
- Create: components/tasks/SubtaskPanel.tsx.
- Modify: app/globals.css after the existing audio panel rules.

- [ ] **Step 1: Write the failing panel and CSS regression test**

Create tests/subtaskPanel.test.ts with:

~~~ts
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { fileURLToPath } from "node:url";

const readWorkspaceFile = (path: string) => readFileSync(
  fileURLToPath(new URL(path, import.meta.url)),
  "utf8"
);

const panelSource = readWorkspaceFile("../components/tasks/SubtaskPanel.tsx");
const stylesSource = readWorkspaceFile("../app/globals.css");

test("subtask panel renders a native checklist for the active priority", () => {
  assert.match(panelSource, /subtasks-panel/);
  assert.match(panelSource, /activeTask\.subtasks/);
  assert.match(panelSource, /type="checkbox"/);
  assert.match(panelSource, /onAddSubtask/);
  assert.match(panelSource, /onToggleSubtask/);
  assert.match(panelSource, /onDeleteSubtask/);
  assert.match(panelSource, /Open Focus Priorities/);
});

test("subtask cards use two columns on desktop and one on narrow screens", () => {
  assert.match(stylesSource, /\.subtasks-grid[\s\S]*grid-template-columns:\s*repeat\(2/);
  assert.match(stylesSource, /\.subtask-card[\s\S]*grid-template-columns/);
  assert.match(stylesSource, /@media \(max-width:\s*34rem\)[\s\S]*\.subtasks-grid[\s\S]*grid-template-columns:\s*1fr/);
});
~~~

- [ ] **Step 2: Run the new test and verify it fails before the panel exists**

Run:

~~~powershell
node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON --experimental-strip-types --test tests/subtaskPanel.test.ts
~~~

Expected: FAIL because SubtaskPanel.tsx and the new CSS contract do not exist yet.

- [ ] **Step 3: Create the presentational panel**

Create components/tasks/SubtaskPanel.tsx:

~~~tsx
"use client";

import { FormEvent, useState } from "react";
import type { TaskItem } from "@/types";
import { PlusIcon, TrashIcon } from "../icons";

interface SubtaskPanelProps {
  activeTask?: TaskItem;
  onAddSubtask: (taskId: string, text: string) => void;
  onToggleSubtask: (taskId: string, subtaskId: string) => void;
  onDeleteSubtask: (taskId: string, subtaskId: string) => void;
  onOpenTasks: () => void;
}

export function SubtaskPanel({
  activeTask,
  onAddSubtask,
  onToggleSubtask,
  onDeleteSubtask,
  onOpenTasks,
}: SubtaskPanelProps) {
  const [newText, setNewText] = useState("");

  const handleAdd = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!activeTask || !newText.trim()) return;
    onAddSubtask(activeTask.id, newText);
    setNewText("");
  };

  return (
    <section className="subtasks-panel" aria-labelledby="subtasks-title">
      <header className="subtasks-panel__intro">
        <div>
          <p className="eyebrow">Focus plan</p>
          <h3 id="subtasks-title">Sub-tasks</h3>
          <p>{activeTask ? "For " + activeTask.text : "Choose a focus priority first."}</p>
        </div>
      </header>

      {!activeTask ? (
        <div className="subtasks-empty">
          <p>No active focus priority. Choose one before adding sub-tasks.</p>
          <button type="button" className="subtasks-empty__action" onClick={onOpenTasks}>
            Open Focus Priorities
          </button>
        </div>
      ) : (
        <>
          <form className="subtasks-add" onSubmit={handleAdd}>
            <input
              value={newText}
              onChange={(event) => setNewText(event.target.value)}
              placeholder="Add a sub-task"
              aria-label="Sub-task title"
            />
            <button type="submit" disabled={!newText.trim()}>
              <PlusIcon aria-hidden="true" />
              Add sub-task
            </button>
          </form>

          <div className="subtasks-grid" aria-label={"Sub-tasks for " + activeTask.text}>
            {activeTask.subtasks.length === 0 && (
              <p className="subtasks-empty subtasks-empty--list">No sub-tasks yet. Add the next small step.</p>
            )}
            {activeTask.subtasks.map((subtask) => (
              <article className="subtask-card" data-complete={subtask.completed || undefined} key={subtask.id}>
                <label className="subtask-card__check">
                  <input
                    type="checkbox"
                    checked={subtask.completed}
                    onChange={() => onToggleSubtask(activeTask.id, subtask.id)}
                    aria-label={(subtask.completed ? "Mark" : "Complete") + " sub-task " + subtask.text}
                  />
                  <span className="subtask-card__text">{subtask.text}</span>
                </label>
                <button
                  type="button"
                  className="subtask-card__delete"
                  onClick={() => onDeleteSubtask(activeTask.id, subtask.id)}
                  aria-label={"Delete sub-task " + subtask.text}
                  title={"Delete sub-task " + subtask.text}
                >
                  <TrashIcon aria-hidden="true" />
                </button>
              </article>
            ))}
          </div>
        </>
      )}
    </section>
  );
}
~~~

- [ ] **Step 4: Add only the replacement panel styles**

Append these rules to app/globals.css without deleting existing soundscape rules:

~~~css
.subtasks-panel {
  display: grid;
  gap: 1rem;
  text-shadow: none;
}

.subtasks-panel__intro h3 {
  margin-top: 0.35rem;
  color: var(--fg);
  font-size: 1.15rem;
  font-weight: 850;
  letter-spacing: -0.03em;
}

.subtasks-panel__intro p:last-child {
  margin-top: 0.3rem;
  color: var(--text-muted);
  font-size: 0.72rem;
}

.subtasks-add {
  display: flex;
  gap: 0.5rem;
}

.subtasks-add input {
  min-width: 0;
  min-height: 2.75rem;
  flex: 1;
  border: 1px solid var(--border-subtle);
  border-radius: 9px;
  background: var(--surface-secondary);
  padding: 0 0.75rem;
  color: var(--fg);
  font-size: 0.72rem;
}

.subtasks-add button,
.subtasks-empty__action {
  display: inline-flex;
  min-height: 2.75rem;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  border-radius: 9px;
  background: var(--workspace-purple);
  padding: 0 0.85rem;
  color: white;
  font-size: 0.7rem;
  font-weight: 800;
  white-space: nowrap;
}

.subtasks-add button svg {
  height: 0.9rem;
  width: 0.9rem;
}

.subtasks-add button:disabled {
  cursor: not-allowed;
  opacity: 0.45;
}

.subtasks-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.6rem;
}

.subtask-card {
  display: grid;
  min-width: 0;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: 0.55rem;
  border: 1px solid var(--border-subtle);
  border-radius: 14px;
  background: color-mix(in srgb, var(--surface-secondary) 88%, transparent);
  padding: 0.78rem;
}

.subtask-card:hover {
  border-color: var(--border-focus);
}

.subtask-card__check {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 0.6rem;
  color: var(--fg);
  cursor: pointer;
  font-size: 0.72rem;
  font-weight: 700;
}

.subtask-card__check input {
  flex-shrink: 0;
  accent-color: var(--workspace-purple);
}

.subtask-card__text {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.subtask-card[data-complete="true"] .subtask-card__text {
  color: var(--text-muted);
  text-decoration: line-through;
}

.subtask-card__delete {
  display: grid;
  height: 2rem;
  width: 2rem;
  flex-shrink: 0;
  place-items: center;
  border-radius: 7px;
  color: var(--text-muted);
}

.subtask-card__delete:hover {
  background: color-mix(in srgb, var(--danger) 12%, transparent);
  color: var(--danger);
}

.subtask-card__delete svg {
  height: 0.9rem;
  width: 0.9rem;
}

.subtasks-empty {
  display: grid;
  gap: 0.75rem;
  justify-items: start;
  border: 1px dashed var(--border-subtle);
  border-radius: 12px;
  padding: 1rem;
  color: var(--text-muted);
  font-size: 0.7rem;
  line-height: 1.5;
}

.subtasks-empty--list {
  grid-column: 1 / -1;
}

@media (max-width: 34rem) {
  .subtasks-add {
    display: grid;
    grid-template-columns: 1fr;
  }

  .subtasks-grid {
    grid-template-columns: 1fr;
  }
}
~~~

- [ ] **Step 5: Run the panel test and verify it passes**

Run:

~~~powershell
node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON --experimental-strip-types --test tests/subtaskPanel.test.ts
~~~

Expected: 2 tests pass. The component has native checkbox semantics, descriptive delete labels, an empty state, and no sound controls.

- [ ] **Step 6: Commit the new panel and style contract**

Run:

~~~powershell
git add -- components/tasks/SubtaskPanel.tsx app/globals.css tests/subtaskPanel.test.ts
git diff --cached --check
git commit -m "feat: add focus subtask panel"
~~~

## Task 5: Replace Sounds wiring with Sub-tasks wiring

**Files:**
- Modify: tests/subtaskPanel.test.ts — add workspace wiring assertions.
- Modify: types/workspace.ts — use subtasks in WorkspacePanel.
- Modify: components/layout/WorkspaceDock.tsx — use CheckIcon, Sub-tasks, and the subtasks panel key.
- Modify: components/YouTubeRestTimer.tsx — remove Soundscape imports/usage and render SubtaskPanel.

- [ ] **Step 1: Add failing source-level wiring assertions**

Add these source reads after the existing test constants:

~~~ts
const dockSource = readWorkspaceFile("../components/layout/WorkspaceDock.tsx");
const timerSource = readWorkspaceFile("../components/YouTubeRestTimer.tsx");
const workspaceSource = readWorkspaceFile("../types/workspace.ts");
~~~

Then add:

~~~ts
test("the workspace exposes Sub-tasks instead of the rendered Sounds panel", () => {
  assert.match(dockSource, /CheckIcon/);
  assert.match(dockSource, /Sub-tasks/);
  assert.doesNotMatch(dockSource, /WaveformIcon|Sounds/);
  assert.match(timerSource, /openPanel === "subtasks"/);
  assert.match(timerSource, /<SubtaskPanel/);
  assert.doesNotMatch(timerSource, /SoundscapePanel|useSoundscape/);
  assert.match(workspaceSource, /"subtasks"/);
  assert.doesNotMatch(workspaceSource, /"sounds"/);
});
~~~

- [ ] **Step 2: Run the wiring test and verify it fails**

Run:

~~~powershell
node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON --experimental-strip-types --test tests/subtaskPanel.test.ts
~~~

Expected: FAIL because the dock, panel key, and root modal still refer to Sounds.

- [ ] **Step 3: Replace the workspace panel type and dock button**

Change WorkspacePanel to:

~~~ts
export type WorkspacePanel = "tasks" | "subtasks" | "music" | "settings" | "notes" | "stats" | "rest";
~~~

In WorkspaceDock.tsx, replace WaveformIcon with CheckIcon, change the left group label to Focus tools, and use this button body:

~~~tsx
<button
  type="button"
  className={dockButtonClass(openPanel === "subtasks")}
  aria-pressed={openPanel === "subtasks"}
  onClick={() => onPanelToggle("subtasks")}
  title="Sub-tasks"
>
  <CheckIcon className="h-5 w-5" aria-hidden="true" />
  <span className="sr-only">Sub-tasks</span>
</button>
~~~

- [ ] **Step 4: Replace only the Sounds modal in YouTubeRestTimer.tsx**

Remove these imports and the hook call:

~~~ts
import { useSoundscape } from "@/hooks/useSoundscape";
import { SoundscapePanel } from "./audio/SoundscapePanel";
~~~

~~~ts
  const soundscape = useSoundscape();
~~~

Add the panel import:

~~~ts
import { SubtaskPanel } from "./tasks/SubtaskPanel";
~~~

Destructure these additional values from useTasks(today):

~~~ts
    activeTask,
    addSubtask,
    toggleSubtask,
    deleteSubtask,
~~~

Replace the existing Sounds modal with:

~~~tsx
      <Modal open={openPanel === "subtasks"} onClose={closeWorkspacePanel} title="Sub-tasks" className="audio-overlay">
        <SubtaskPanel
          activeTask={activeTask}
          onAddSubtask={addSubtask}
          onToggleSubtask={toggleSubtask}
          onDeleteSubtask={deleteSubtask}
          onOpenTasks={() => setOpenPanel("tasks")}
        />
      </Modal>
~~~

Do not delete or modify SoundscapePanel.tsx, useSoundscape.ts, lib/soundscapes.ts, or their storage keys. They remain hidden implementation code; only the workspace import/render path is removed.

- [ ] **Step 5: Run the wiring test and the type gate**

Run:

~~~powershell
node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON --experimental-strip-types --test tests/subtaskPanel.test.ts
npx tsc --noEmit
~~~

Expected: all 3 Sub-tasks regression tests pass and TypeScript exits 0. There must be no sounds workspace panel key or rendered Soundscape panel reference in the active workspace path.

- [ ] **Step 6: Commit the workspace replacement**

Run:

~~~powershell
git add -- types/workspace.ts components/layout/WorkspaceDock.tsx components/YouTubeRestTimer.tsx tests/subtaskPanel.test.ts
git diff --cached --check
git commit -m "feat: replace sounds dock with subtasks"
~~~

## Task 6: Run complete verification and browser smoke checks

**Files:**
- Reference: all files listed above.
- Do not modify soundscape source files as part of this task.

- [ ] **Step 1: Run all automated gates**

Run:

~~~powershell
node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON --experimental-strip-types --test tests/*.test.ts
npx tsc --noEmit
npm run lint
npm run build
git diff --check
~~~

Expected: all tests pass, TypeScript exits 0, ESLint exits 0, the production build completes, and whitespace validation reports no errors.

- [ ] **Step 2: Verify desktop behavior in the current browser**

At http://localhost:3000/:

1. Confirm the dock shows Sub-tasks with a check icon and no Sounds action.
2. Open Sub-tasks and confirm the modal shows the current active Focus Priority.
3. Add Learn Python and Learn SQL; confirm both cards persist after closing and reopening the panel.
4. Check and uncheck one card; confirm only that card changes and the parent priority is not marked complete.
5. Delete one card; confirm only that card disappears.
6. Open Focus Priorities, select another incomplete priority, reopen Sub-tasks, and confirm the checklist belongs to the newly selected parent.
7. With no incomplete priority, confirm the empty state and Open Focus Priorities action.
8. Confirm no sound tabs, categories, volume sliders, playback controls, or Soundscape panel are rendered.

Before mutating an existing browser profile, capture the current daily task storage value and restore it after the smoke test so the user's test data is unchanged.

- [ ] **Step 3: Verify narrow layout and overflow**

Resize to 540px wide or less and confirm the cards use one column, the add form stacks cleanly, modal close/checkbox/delete controls remain keyboard reachable, and document.documentElement.scrollWidth equals document.documentElement.clientWidth.

- [ ] **Step 4: Review the focused final diff**

Run:

~~~powershell
git status --short
git diff --stat
git diff -- types/index.ts lib/taskModel.ts lib/migrations.ts hooks/useTasks.ts components/tasks/SubtaskPanel.tsx types/workspace.ts components/layout/WorkspaceDock.tsx components/YouTubeRestTimer.tsx app/globals.css tests/taskModel.test.ts tests/migrations.test.ts tests/subtaskPanel.test.ts
~~~

Confirm the diff contains only nested sub-task data/migration/persistence, the replacement panel, dock/modal wiring, tests, and panel styles. Confirm all existing soundscape files and storage code remain present and unchanged.

## Self-review

- Spec coverage: Task 1 covers the data model, pure operations, and parent independence; Task 2 covers migration defaults, trimming, filtering, completion preservation, and contiguous order; Task 3 covers existing-key persistence and active-task selection; Task 4 covers the replacement panel, native controls, empty state, two-column cards, and narrow layout; Task 5 covers the dock/modal replacement and removal of the rendered soundscape path; Task 6 covers automated gates, parent switching, persistence, accessibility checks, and overflow.
- Placeholder scan: every implementation step contains concrete file names, code, commands, and expected results.
- Type consistency: SubtaskItem fields, TaskItem.subtasks, model helper signatures, hook callback signatures, and SubtaskPanel props use the same names and types throughout.
- Scope check: this is one feature with related model, persistence, and UI changes; it does not require splitting into separate project specs.
