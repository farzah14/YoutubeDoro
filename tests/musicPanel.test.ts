import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL("../components/audio/LoFiPlayer.tsx", import.meta.url), "utf8");
const stylesSource = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");

test("Music exposes a simplified accessible station list", () => {
  assert.doesNotMatch(source, /music-shelf__dial/);
  assert.doesNotMatch(source, />STREAM</);
  assert.doesNotMatch(source, /STATIONS \/\//);
  assert.doesNotMatch(source, />CH /);
  assert.doesNotMatch(source, />BAND /);
  assert.match(source, /music-shelf__channel/);
  assert.match(source, /music-shelf__frequency/);
  assert.match(source, /const band =/);
  assert.match(source, /ON AIR/);
  assert.doesNotMatch(source, />Broadcast desk</);
  assert.match(source, /music-shelf__now-playing/);
  assert.match(source, /aria-pressed=\{selected\}/);
  assert.match(source, /music-shelf__volume/);
  assert.match(source, /music-shelf__track-state/);
});

test("Music exposes only Stations and My Music", () => {
  assert.match(source, /\[\["stations", "Stations"\], \["my-music", "My Music"\]\]/);
  assert.doesNotMatch(source, /Playlist Library|tab === "library"|type MusicTab = [^;]*library/);
});

test("Music removes the Broadcast Desk label and inner surface outline", () => {
  assert.doesNotMatch(source, /Broadcast desk/i);
  assert.match(stylesSource, /\.music-shelf\s*\{[\s\S]*border:\s*0/);
  assert.match(stylesSource, /\.music-shelf\s*\{[\s\S]*background:\s*transparent/);
});

test("Music uses the red underline only for source tabs", () => {
  assert.match(stylesSource, /\.music-shelf__tab\.is-active\s*\{[\s\S]*border-bottom-color:\s*var\(--manga-vermilion\)/);
  assert.match(stylesSource, /\.music-shelf__tab\.is-active\s*\{[\s\S]*background:\s*transparent/);
  assert.doesNotMatch(stylesSource, /\.music-shelf__tab\.is-active,\s*\.music-shelf__track\.is-active/);
  assert.match(stylesSource, /\.music-shelf__track\.is-active\s*\{[\s\S]*border-color:\s*var\(--manga-rule\)/);
});
