import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { fileURLToPath } from "node:url";

const readWorkspaceFile = (path: string) => readFileSync(
  fileURLToPath(new URL(path, import.meta.url)),
  "utf8"
);

const panelSource = readWorkspaceFile("../components/audio/SoundscapePanel.tsx");
const stylesSource = readWorkspaceFile("../app/globals.css");

test("soundscape tiles expose quiet studio state and volume anatomy", () => {
  assert.match(panelSource, /data-category=\{sound\.category\.toLowerCase\(\)\}/);
  assert.match(panelSource, /soundscape-sound__toggle/);
  assert.match(panelSource, /soundscape-sound__icon/);
  assert.match(panelSource, /soundscape-sound__copy/);
  assert.match(panelSource, /soundscape-sound__state/);
  assert.match(panelSource, /soundscape-sound__volume/);
  assert.match(panelSource, /soundscape\.toggleLayer\(sound\.id\)/);
  assert.match(panelSource, /soundscape\.setVolume\(sound\.id/);
});

test("soundscape tiles define category accents and a narrow layout", () => {
  assert.match(stylesSource, /\.soundscape-sound\[data-category="nature"\][\s\S]*--sound-accent/);
  assert.match(stylesSource, /\.soundscape-sound\[data-category="cozy"\][\s\S]*--sound-accent/);
  assert.match(stylesSource, /\.soundscape-sound\[data-category="noise"\][\s\S]*--sound-accent/);
  assert.match(stylesSource, /\.soundscape-sound__toggle[\s\S]*grid-template-columns/);
  assert.match(stylesSource, /@media \(max-width:\s*34rem\)[\s\S]*\.soundscape-grid[\s\S]*grid-template-columns:\s*1fr/);
});
