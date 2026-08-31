import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { fileURLToPath } from "node:url";

const settingsPanelSource = readFileSync(
  fileURLToPath(new URL("../components/settings/SettingsPanel.tsx", import.meta.url)),
  "utf8"
);
const headerSource = readFileSync(
  fileURLToPath(new URL("../components/layout/Header.tsx", import.meta.url)),
  "utf8"
);
const stylesSource = readFileSync(
  fileURLToPath(new URL("../app/globals.css", import.meta.url)),
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

test("settings stats uses editorial charcoal surfaces instead of blue fills", () => {
  assert.match(stylesSource, /\.stats-card\s*\{[^}]*background:\s*var\(--manga-charcoal\)/);
  assert.match(stylesSource, /\.stats-card\s+\.stats-metric,[\s\S]*background:\s*var\(--manga-ink\)/);
  assert.match(stylesSource, /\.stats-card\s+\.stats-chart-card,[\s\S]*background:\s*var\(--manga-ink\)/);
  assert.match(stylesSource, /\.overlay-panel:has\(\.stats-dashboard\) \.overlay-panel__surface[\s\S]*background:\s*var\(--manga-charcoal\)/);
});

test("settings removes Music and Extras sections", () => {
  const sectionDeclaration = settingsPanelSource.match(/const sections[\s\S]*?\];/)?.[0] ?? "";
  assert.doesNotMatch(sectionDeclaration, /\["music", "Music"\]|\["extras", "Extras"\]/);
  assert.doesNotMatch(settingsPanelSource, /section === "music"|section === "extras"/);
});

test("settings exposes the signed-in account and session history", () => {
  assert.match(settingsPanelSource, /\["account", "Account"\]/);
  assert.match(settingsPanelSource, /\["history", "History"\]/);
  assert.match(settingsPanelSource, /accountEmail/);
  assert.match(settingsPanelSource, /accountProvider/);
  assert.match(settingsPanelSource, /initialSection/);
  assert.match(settingsPanelSource, /useState<SettingsSection>\(initialSection \?\? "themes"\)/);
  assert.match(settingsPanelSource, /<HistoryPanel[\s\S]*tasks=\{tasks\}/);
});

test("Settings Account owns sign out instead of the header", () => {
  assert.match(settingsPanelSource, /signOut/);
  assert.match(settingsPanelSource, /settings-account__actions/);
  assert.match(settingsPanelSource, /Sign out/);
  assert.match(settingsPanelSource, /router\.replace\("\/"\)/);
  assert.doesNotMatch(headerSource, /signOut|Sign out|scene-account/);
  assert.match(stylesSource, /\.settings-account__actions\s*\{/);
});

test("Account removes provider implementation copy and makes Sign out red", () => {
  assert.doesNotMatch(settingsPanelSource, /Authentication is handled by Supabase/);
  assert.match(settingsPanelSource, /settings-account__sign-out/);
  assert.match(stylesSource, /\.settings-account__actions \.settings-account__sign-out,\s*\.history-row__actions \.history-row__delete-session\s*\{[\s\S]*background:\s*var\(--manga-vermilion\)/);
});

test("Focus Timer removes section dividers, keeps labels left, and centers numbers in right-side inputs", () => {
  assert.match(stylesSource, /\.settings-duration-list,\s*\.settings-behavior-list\s*\{[\s\S]*border-top:\s*0/);
  assert.match(stylesSource, /\.settings-recipe-row\s*\{[\s\S]*grid-template-columns:\s*minmax\(0, 1fr\) auto/);
  assert.match(stylesSource, /\.settings-recipe-row > span:first-child\s*\{[\s\S]*grid-column:\s*1[\s\S]*text-align:\s*left/);
  assert.match(stylesSource, /\.settings-recipe-row > \.settings-number-field\s*\{[\s\S]*grid-column:\s*2[\s\S]*justify-self:\s*end/);
  assert.match(stylesSource, /\.settings-number-field input\s*\{[\s\S]*text-align:\s*center/);
});

test("Focus Timer removes only Focus and Break row separators", () => {
  assert.match(settingsPanelSource, /data-duration=\{key\}/);
  assert.match(stylesSource, /\.settings-recipe-row\[data-duration="focusMinutes"\],\s*\.settings-recipe-row\[data-duration="breakMinutes"\]\s*\{[\s\S]*border-bottom:\s*0/);
});

test("Focus Timer notification permission and Preview stay user-action driven", () => {
  assert.match(settingsPanelSource, /visibilitychange/);
  assert.match(settingsPanelSource, /preferences\.notificationEnabled && notificationState === "granted"/);
  assert.match(settingsPanelSource, /requestNotificationPermission/);
  assert.match(settingsPanelSource, /playTimerAlert\(preferences\.alertSound, preferences\.alertVolume\)/);
  assert.match(settingsPanelSource, /Allow notifications for this site in browser settings/);
});

test("Focus Timer behavior rows stay transparent and omit the recipe note", () => {
  assert.doesNotMatch(settingsPanelSource, /Modes|Presets|Pomodoro, Countdown, Stopwatch, Animedoro, and 52\/17 are chosen from Focus/);
  assert.match(stylesSource, /\.settings-recipe-toggle\s*\{[\s\S]*background:\s*transparent/);
});

test("Settings does not expose a quote setting", () => {
  assert.doesNotMatch(settingsPanelSource, /showQuote|\["quotes", "Quotes"\]|section === "quotes"/);
});

test("settings does not render the obsolete registration label", () => {
  assert.doesNotMatch(stylesSource, /content:\s*["']REG \/ 01["']/);
});

test("Themes exposes the Studio Window contact-sheet contract", () => {
  assert.match(settingsPanelSource, /settings-content settings-themes/);
  assert.match(settingsPanelSource, /settings-theme-grid/);
  assert.match(settingsPanelSource, /settings-theme-card__preview/);
  assert.match(settingsPanelSource, /settings-theme-card__copy/);
  assert.match(settingsPanelSource, /settings-theme-card__mark/);
  assert.match(settingsPanelSource, /<CheckIcon[^>]*aria-hidden="true"/);
  assert.doesNotMatch(settingsPanelSource, />Selected</);
  assert.match(settingsPanelSource, /settings-theme-card__mark[^>]*aria-label="Selected theme"/);
  assert.match(stylesSource, /\.settings-theme-card__mark\s*\{[\s\S]*display:\s*inline-flex[\s\S]*border:\s*0[\s\S]*border-radius:\s*0[\s\S]*background:\s*transparent[\s\S]*padding:\s*0/);
  assert.match(stylesSource, /\.settings-theme-card__mark svg\s*\{[\s\S]*height:\s*1\.1rem[\s\S]*width:\s*1\.1rem/);
  assert.doesNotMatch(stylesSource, /\.settings-theme-card__mark\s*\{[\s\S]*width:\s*2\.25rem[\s\S]*height:\s*2\.25rem/);
  assert.match(settingsPanelSource, /aria-pressed=\{selected\}/);
});

test("Manga Editorial Desk keeps Settings opaque and readable", () => {
  assert.match(settingsPanelSource, /settings-folio/);
  assert.match(settingsPanelSource, /data-section=\{section\}/);
  assert.match(settingsPanelSource, /className="settings-select"/);
  assert.match(settingsPanelSource, /const sections/);
  assert.match(stylesSource, /--manga-charcoal:\s*#202226/i);
  assert.match(stylesSource, /--manga-paper:\s*#f3ead6/i);
  assert.match(stylesSource, /--manga-vermilion:\s*#c3442d/i);
  assert.match(stylesSource, /\.settings-folio\s*\{/);
  assert.match(stylesSource, /\.settings-nav__item::before/);
  assert.match(stylesSource, /background:\s*var\(--manga-paper\)/);
  assert.doesNotMatch(stylesSource, /settings-folio[\s\S]*backdrop-filter/i);
});

test("Music and Sub-tasks receive the frozen editorial hooks", () => {
  for (const token of [
    "music-shelf__channel", "music-shelf__frequency",
    "subtasks-context__folio",
  ]) {
    assert.match(stylesSource, new RegExp("\\." + token + "\\s*\\{"));
  }
  assert.doesNotMatch(stylesSource, /music-shelf__dial/);
  assert.match(stylesSource, /\.overlay-panel:has\(\.audio-overlay\) \.overlay-panel__surface\s*\{[\s\S]*background:\s*var\(--manga-charcoal\)/);
  assert.match(stylesSource, /\.music-shelf\s*\{[\s\S]*background:\s*var\(--manga-charcoal\)/);
  assert.match(stylesSource, /\.subtasks-panel\s*\{[\s\S]*background:\s*var\(--manga-charcoal\)/);
});
