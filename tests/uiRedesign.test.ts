import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const readWorkspaceFile = (relativePath: string) =>
  readFileSync(new URL(`../${relativePath}`, import.meta.url), "utf8");

const overlaySource = readWorkspaceFile("components/ui/OverlayPanel.tsx");
const stylesSource = readWorkspaceFile("app/globals.css");
const settingsSource = readWorkspaceFile("components/settings/SettingsPanel.tsx");
const musicSource = readWorkspaceFile("components/audio/LoFiPlayer.tsx");
const subtasksSource = readWorkspaceFile("components/tasks/SubtaskPanel.tsx");
const prioritiesSource = readWorkspaceFile("components/tasks/TaskQueue.tsx");
const historySource = readWorkspaceFile("components/history/HistoryPanel.tsx");
const timerSource = readWorkspaceFile("components/YouTubeRestTimer.tsx");

test("overlay surfaces use the shared atelier contract", () => {
  assert.match(
    overlaySource,
    /cx\("overlay-panel__surface",\s*"atelier-surface",\s*className\)/,
  );
  assert.match(stylesSource, /--atelier-ink:\s*#0b1a2a/i);
  assert.match(stylesSource, /--atelier-lantern:\s*#e4a854/i);
  assert.match(stylesSource, /\.atelier-surface\s*\{/);
  assert.match(
    stylesSource,
    /\.atelier-surface[\s\S]*background:\s*var\(--atelier-room\)/,
  );
  assert.match(
    stylesSource,
    /\.atelier-surface \.overlay-panel__header\s*\{[\s\S]*border-bottom-color:\s*var\(--atelier-line\)/,
  );
  assert.match(
    stylesSource,
    /\.atelier-surface \.overlay-panel__close\s*\{[\s\S]*border-color:\s*var\(--atelier-line\)/,
  );
});

test("Focus Timer settings use one recipe editor instead of nested cards", () => {
  assert.match(settingsSource, /settings-timer-recipe/);
  assert.match(settingsSource, /settings-duration-list/);
  assert.match(settingsSource, /settings-signal/);
  assert.doesNotMatch(settingsSource, /Keep the rhythm adjustable\./);
  assert.doesNotMatch(settingsSource, /settings-form-grid|settings-alert/);
  assert.match(stylesSource, /\.settings-recipe-toggle\s*\{[\s\S]*background:\s*transparent/);
});

test("Music uses aligned sound-shelf rows instead of emoji station cards", () => {
  assert.match(musicSource, /music-shelf/);
  assert.match(musicSource, /music-shelf__track/);
  assert.match(musicSource, /music-shelf__marker/);
  assert.doesNotMatch(musicSource, /audio-panel__station-grid|item\.icon/);
});

test("Sub-tasks use parent context and a progress-led checklist", () => {
  assert.match(subtasksSource, /Focus plan \/|For /);
  assert.match(subtasksSource, /subtasks-progress/);
  assert.match(subtasksSource, /subtask-row/);
  assert.doesNotMatch(subtasksSource, /subtasks-grid|subtask-card/);
});

test("Focus Priorities use ordered work rows without decorative task controls", () => {
  assert.match(prioritiesSource, /priority-workbench/);
  assert.match(prioritiesSource, /priority-work-row/);
  assert.match(prioritiesSource, /priority-work-row__drag/);
  assert.doesNotMatch(prioritiesSource, /task-confetti|priority-task__emoji|priority-task__color|task\.emoji/);
});

test("Focus Priorities actions use the atelier palette", () => {
  assert.match(stylesSource, /\.priorities-add button\s*\{[^}]*background:\s*var\(--atelier-lantern\)/);
  assert.match(stylesSource, /\.priorities-progress i\s*\{[^}]*background:\s*var\(--atelier-moss\)/);
});

test("timer recipe exposes one shared break length", () => {
  assert.match(settingsSource, /label: "Break"/);
  assert.doesNotMatch(settingsSource, /Short break|Long break/);
  assert.match(settingsSource, /key: "breakMinutes"/);
  assert.match(prioritiesSource, /breakMinutes/);
  assert.doesNotMatch(prioritiesSource, /shortBreakMinutes|longBreakMinutes/);
});

test("History is organized around account sessions", () => {
  assert.match(historySource, /useSessionHistory/);
  assert.match(historySource, /formatDuration/);
  assert.match(historySource, /window\.confirm/);
  assert.match(historySource, /Session note/);
  assert.match(timerSource, /<HistoryPanel[\s\S]*tasks=\{tasks\}/);
});
