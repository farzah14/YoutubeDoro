import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { fileURLToPath } from "node:url";

const settingsPanelSource = readFileSync(
  fileURLToPath(new URL("../components/settings/SettingsPanel.tsx", import.meta.url)),
  "utf8"
);

test("settings sidebar keeps one Themes entry instead of duplicate mode links", () => {
  const sectionDeclaration = settingsPanelSource.match(/const sections[\s\S]*?\];/)?.[0] ?? "";

  assert.match(sectionDeclaration, /\["themes", "Themes"\]/);
  assert.doesNotMatch(sectionDeclaration, /home-theme|focus-theme|example theme/i);
  assert.doesNotMatch(settingsPanelSource, /settings-preview/);
});

test("theme slot labels put the selected theme on its own line", () => {
  assert.match(settingsPanelSource, /<small className="settings-slot-tab__theme">/);
});

test("theme picker keeps search and group filters only", () => {
  assert.match(settingsPanelSource, /<select value=\{group\}/);
  assert.doesNotMatch(settingsPanelSource, /brightness|dominantColor|Filter brightness|Filter dominant color/);
});

test("settings stats renders the dashboards directly", () => {
  assert.match(settingsPanelSource, /<DailyStats/);
  assert.match(settingsPanelSource, /<WeeklyHeatmap/);
  assert.doesNotMatch(settingsPanelSource, /Open Stats|onOpenStats/);
});
