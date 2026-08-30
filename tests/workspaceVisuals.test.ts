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

test("scene header keeps branding without quote content", () => {
  assert.doesNotMatch(headerSource, /scene-quote|blockquote|quote/);
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

test("focus controls expose one Break phase and a single learning-method disclosure", () => {
  assert.match(learningCardSource, /\["break", "Break"\]/);
  assert.doesNotMatch(learningCardSource, /Short Break|Long Break/);
  assert.doesNotMatch(learningCardSource, /focus-method-dock/);
  assert.match(dockSource, /workspace-dock__method-picker/);
  assert.match(dockSource, /workspace-dock__method-trigger/);
  assert.match(dockSource, /PomodoroIcon/);
  assert.match(dockSource, /MonitorIcon/);
  assert.match(dockSource, /WaveformIcon/);
  assert.match(dockSource, /role="listbox"/);
  assert.match(dockSource, /role="option"/);
  assert.doesNotMatch(learningCardSource, /aria-label="Timer type"/);
  assert.doesNotMatch(stylesSource, /\.focus-dashboard__mode-control/);
  assert.doesNotMatch(stylesSource, /\.focus-method-dock/);
  assert.match(stylesSource, /\.workspace-dock__method-menu\s*\{[\s\S]*bottom:\s*calc\(100%/);
});

test("focus priority is first and utility actions keep their edge dock positions", () => {
  assert.match(learningCardSource, /focus-dashboard__context/);
  assert.match(learningCardSource, /focus-dashboard__priority-action/);
  assert.match(learningCardSource, /<PhasePicker/);
  assert.match(dockSource, /workspace-dock__label/);
  assert.match(dockSource, /className="sr-only"/);
  assert.match(dockSource, /workspace-dock__center/);
  assert.match(dockSource, /title="Home"/);
  assert.match(dockSource, /title="Focus mode"/);
  assert.match(stylesSource, /\.workspace-dock\s*\{[^}]*inset:\s*auto 1\.5rem 1\.25rem[^}]*justify-content:\s*space-between/);
  assert.match(stylesSource, /\.workspace-dock__label\s*\{[\s\S]*display:\s*none/);
  assert.doesNotMatch(learningCardSource, /focus-dashboard__tally/);
});

test("focus surface removes the helper copy and hides the running dock", () => {
  assert.doesNotMatch(timerShellSource, /Focus mode keeps one task in view/);
  assert.match(timerShellSource, /focusRunning/);
  assert.match(timerShellSource, /onRunningChange=\{setFocusRunning\}/);
  assert.match(dockSource, /timerRunning/);
  assert.match(dockSource, /workspace-dock--hidden/);
  assert.match(stylesSource, /\.workspace-dock--hidden\s*\{[^}]*transform:\s*translateY/);
});

test("focus timer typography gives the method and clock a readable scale", () => {
  assert.match(stylesSource, /\.focus-dashboard__phase-option\s*\{[\s\S]*font-size:\s*0\.7rem/);
  assert.match(stylesSource, /\.focus-dashboard__time\s*\{[\s\S]*font-family:\s*var\(--font-mono\)[\s\S]*font-size:\s*clamp\(5\.25rem/);
});

test("History uses a notepad icon beside the Sub-tasks dock action", () => {
  assert.match(dockSource, /NotepadIcon/);
  assert.doesNotMatch(dockSource, /BookIcon/);
  assert.match(dockSource, /onPanelToggle\("history"\)/);
  assert.match(dockSource, /title="History"/);
});

test("focus centers the timer controls and keeps notes in Settings History", () => {
  assert.match(timerShellSource, /<LearningCard/);
  assert.doesNotMatch(timerShellSource, /SessionNoteEditor/);
  assert.doesNotMatch(timerShellSource, /focus-session-layout/);
  assert.match(stylesSource, /\.focus-dashboard\s*\{[\s\S]*justify-items:\s*center/);
  assert.doesNotMatch(stylesSource, /\.focus-session-layout/);
  assert.doesNotMatch(timerShellSource, /<Modal open=\{openPanel === "history"\}/);
  assert.match(timerShellSource, /<SettingsPanel[\s\S]*open=\{openPanel === "settings" \|\| openPanel === "history"\}/);
  assert.match(timerShellSource, /initialSection=\{openPanel === "history" \? "history" : undefined\}/);
});

test("focus clock uses full-width Home-style centered placement", () => {
  assert.match(stylesSource, /\.focus-dashboard__time\s*\{[\s\S]*width:\s*100%[\s\S]*text-align:\s*center/);
});

test("mobile scenes do not render the ambient rain-line overlay", () => {
  assert.match(
    stylesSource,
    /@media \(max-width: 767px\)[\s\S]*\.ambient-rainy-evening \.ambient-rain\s*\{[\s\S]*opacity:\s*0/,
  );
  assert.match(
    stylesSource,
    /\.ambient-rain\s*\{[\s\S]*opacity:\s*0[;\s]*animation:\s*none/,
  );
  const reducedMotion = stylesSource.slice(stylesSource.indexOf("@media (prefers-reduced-motion: reduce)"));
  assert.match(reducedMotion, /\.ambient-rain\s*\{[\s\S]*opacity:\s*0\s*!important/);
});
