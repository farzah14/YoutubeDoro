import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { fileURLToPath } from "node:url";

const readWorkspaceFile = (path: string) => readFileSync(
  fileURLToPath(new URL(path, import.meta.url)),
  "utf8"
);

const learningCardSource = readWorkspaceFile("../components/timer/LearningCard.tsx");
const homeHeroSource = readWorkspaceFile("../components/layout/HomeHero.tsx");
const headerSource = readWorkspaceFile("../components/layout/Header.tsx");
const timerDisplaySource = readWorkspaceFile("../components/timer/TimerDisplay.tsx");
const overlayPanelSource = readWorkspaceFile("../components/ui/OverlayPanel.tsx");
const timerShellSource = readWorkspaceFile("../components/YouTubeRestTimer.tsx");
const layoutSource = readWorkspaceFile("../app/layout.tsx");
const dockSource = readWorkspaceFile("../components/layout/WorkspaceDock.tsx");
const stylesSource = readWorkspaceFile("../app/globals.css");

test("timer surfaces use an icon PIP control and shared numeric spacing", () => {
  assert.match(learningCardSource, /PictureInPictureIcon/);
  assert.doesNotMatch(learningCardSource, />\s*PiP\s*</);
  assert.match(homeHeroSource, /numeric-time/);
  assert.match(learningCardSource, /numeric-time/);
  assert.match(timerDisplaySource, /numeric-time/);
  assert.match(stylesSource, /\.numeric-time[\s\S]*letter-spacing:\s*0\.04em/);
});

test("workspace scroll surfaces keep scrolling without visible scrollbar chrome", () => {
  assert.match(timerShellSource, /workspace-stage no-scrollbar/);
  assert.match(overlayPanelSource, /overlay-panel__body no-scrollbar/);
  assert.match(stylesSource, /\.no-scrollbar\s*\{[\s\S]*scrollbar-width:\s*none/);
});

test("focus prompt does not render the decorative star glyph", () => {
  assert.doesNotMatch(learningCardSource, /✦/);
});

test("scene brand aligns with the workspace padding", () => {
  assert.match(headerSource, /className="scene-brand"/);
  assert.match(stylesSource, /\.scene-header\s*\{[\s\S]*inset:\s*1\.75rem 2rem auto/);
  assert.match(stylesSource, /\.scene-brand p\s*\{[\s\S]*margin-top:\s*0\.65rem/);
});

test("workspace mode selects the matching theme slot", () => {
  assert.match(
    timerShellSource,
    /const handleModeChange = useCallback\(\(mode: WorkspaceMode\) => \{\s*setWorkspaceMode\(mode\);\s*setActiveThemeSlot\(mode\);/
  );
});

test("scene selection changes the background without changing the interface palette", () => {
  assert.match(timerShellSource, /<AmbientBackground[\s\S]*theme=\{activeTheme\}/);
  assert.doesNotMatch(timerShellSource, /document\.documentElement\.dataset\.theme\s*=\s*activeTheme/);
  assert.match(layoutSource, /data-theme="night-study"/);
  assert.doesNotMatch(layoutSource, /localStorage\.getItem\(['"]ytdoro:theme:home/);
});

test("PIP mirrors the active scene and the latest timer snapshot", () => {
  assert.match(learningCardSource, /pipBackgroundUrl/);
  assert.match(learningCardSource, /pipWindowRef/);
  assert.match(learningCardSource, /pipSnapshotRef/);
  assert.match(learningCardSource, /updatePip/);
  assert.doesNotMatch(learningCardSource, /pipWindow\.setInterval/);
  assert.match(timerShellSource, /pipBackgroundUrl=\{COZY_THEMES\[activeTheme\]\.backgroundUrl\}/);
});

test("focus controls expose one Break phase and a designed method select", () => {
  assert.match(learningCardSource, /\["break", "Break"\]/);
  assert.doesNotMatch(learningCardSource, /Short Break|Long Break/);
  assert.match(learningCardSource, /focus-dashboard__mode-control/);
  assert.match(learningCardSource, /ChevronDownIcon/);
  assert.match(learningCardSource, /aria-label="Timer type"/);
  assert.doesNotMatch(learningCardSource, />Method</);
  assert.match(stylesSource, /\.focus-dashboard__mode-control\s*\{/);
});

test("focus surface removes the helper copy and hides the running dock", () => {
  assert.doesNotMatch(timerShellSource, /Focus mode keeps one task in view/);
  assert.match(timerShellSource, /focusRunning/);
  assert.match(timerShellSource, /onRunningChange=\{setFocusRunning\}/);
  assert.match(dockSource, /timerRunning/);
  assert.match(dockSource, /workspace-dock--hidden/);
  assert.match(stylesSource, /\.workspace-dock--hidden\s*\{[\s\S]*transform:\s*translateY/);
});

test("History sits beside the Sub-tasks dock action", () => {
  assert.match(dockSource, /BookIcon/);
  assert.match(dockSource, /onPanelToggle\("history"\)/);
  assert.match(dockSource, /title="History"/);
});
