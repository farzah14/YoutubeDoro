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
const dockSource = readWorkspaceFile("../components/layout/WorkspaceDock.tsx");
const timerSource = readWorkspaceFile("../components/YouTubeRestTimer.tsx");
const workspaceSource = readWorkspaceFile("../types/workspace.ts");

test("subtask panel renders a native checklist for the active priority", () => {
  assert.match(panelSource, /subtasks-panel/);
  assert.match(panelSource, /activeTask\.subtasks/);
  assert.match(panelSource, /type="checkbox"/);
  assert.match(panelSource, /onAddSubtask/);
  assert.match(panelSource, /onToggleSubtask/);
  assert.match(panelSource, /onDeleteSubtask/);
  assert.match(panelSource, /Open Focus Priorities/);
});

test("subtask checkboxes expose complete and incomplete actions", () => {
  assert.match(panelSource, /Mark incomplete sub-task/);
  assert.match(panelSource, /Mark complete sub-task/);
});

test("subtasks expose priority status and CUT row semantics without folio decoration", () => {
  assert.match(panelSource, /subtasks-context__folio/);
  assert.doesNotMatch(panelSource, /FOLIO \/ /);
  assert.doesNotMatch(panelSource, /FOCUS PLAN|Focus plan \//);
  assert.match(panelSource, /NO PRIORITY/);
  assert.match(panelSource, /subtask-row__index/);
  assert.match(panelSource, /CUT/);
  assert.match(stylesSource, /\.subtasks-panel\s*\{[\s\S]*border:\s*0/);
  assert.match(stylesSource, /\.subtasks-panel\s*\{[\s\S]*background:\s*transparent/);
});

test("subtasks render as a single checklist at every width", () => {
  assert.match(panelSource, /subtasks-list/);
  assert.match(panelSource, /subtask-row/);
  assert.match(panelSource, /completedCount/);
  assert.doesNotMatch(panelSource, /subtasks-grid|subtask-card/);
  assert.match(stylesSource, /\.subtasks-list\s*\{/);
  assert.match(stylesSource, /\.subtask-row\s*\{/);
  assert.doesNotMatch(stylesSource, /\.subtasks-grid\s*\{/);
  assert.doesNotMatch(stylesSource, /\.subtask-card\s*\{/);
});

test("only the subtask checklist scrolls when the list grows", () => {
  assert.match(panelSource, /className="subtasks-list no-scrollbar"/);
  assert.match(stylesSource, /\.subtasks-list\s*\{[\s\S]*max-height:[^;]+;[\s\S]*overflow-y:\s*auto/);
  assert.match(stylesSource, /\.subtasks-list\s*\{[\s\S]*overscroll-behavior:\s*contain/);
  assert.match(stylesSource, /\.overlay-panel:has\(\.subtasks-panel\) \.overlay-panel__body\s*\{[\s\S]*display:\s*flex[\s\S]*overflow:\s*hidden/);
  assert.match(stylesSource, /\.subtasks-panel\s*\{[\s\S]*height:\s*100%/);
  assert.match(stylesSource, /\.subtasks-list\s*\{[\s\S]*flex:\s*1\s+1\s+auto/);
});

test("the workspace exposes Sub-tasks instead of the rendered Sounds panel", () => {
  assert.match(dockSource, /CheckIcon/);
  assert.match(dockSource, /Sub-tasks/);
  assert.doesNotMatch(dockSource, /Sounds/);
  assert.match(timerSource, /openPanel === "subtasks"/);
  assert.match(timerSource, /<SubtaskPanel/);
  assert.doesNotMatch(timerSource, /SoundscapePanel|useSoundscape/);
  assert.match(workspaceSource, /"subtasks"/);
  assert.doesNotMatch(workspaceSource, /"sounds"/);
});
