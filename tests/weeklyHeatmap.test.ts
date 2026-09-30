import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { fileURLToPath } from "node:url";

const weeklyHeatmapSource = readFileSync(
  fileURLToPath(new URL("../components/stats/WeeklyHeatmap.tsx", import.meta.url)),
  "utf8"
);
const settingsPanelSource = readFileSync(
  fileURLToPath(new URL("../components/settings/SettingsPanel.tsx", import.meta.url)),
  "utf8"
);
const youtubeRestTimerSource = readFileSync(
  fileURLToPath(new URL("../components/YouTubeRestTimer.tsx", import.meta.url)),
  "utf8"
);

test("WeeklyHeatmap accepts today prop and synchronizes with dateKeys", () => {
  assert.match(weeklyHeatmapSource, /today\s*=\s*""/);
  assert.match(weeklyHeatmapSource, /dateKeys\(effectiveToday,\s*28\)/);
  assert.match(weeklyHeatmapSource, /today\?: string/);
});

test("WeeklyHeatmap renders 4 weeks without horizontal overflow clipping", () => {
  assert.doesNotMatch(weeklyHeatmapSource, /overflow-x-auto/);
  assert.match(weeklyHeatmapSource, /weeks\.map/);
  assert.match(weeklyHeatmapSource, /This week/);
});

test("SettingsPanel and YouTubeRestTimer pass today prop to WeeklyHeatmap", () => {
  assert.match(settingsPanelSource, /<WeeklyHeatmap[\s\S]*today=\{today\}/);
  assert.match(youtubeRestTimerSource, /<WeeklyHeatmap[\s\S]*today=\{today\}/);
});
