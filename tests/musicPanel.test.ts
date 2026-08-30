import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL("../components/audio/LoFiPlayer.tsx", import.meta.url), "utf8");

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
  assert.match(source, />Broadcast desk</);
  assert.match(source, /music-shelf__now-playing/);
  assert.match(source, /aria-pressed=\{selected\}/);
  assert.match(source, /music-shelf__volume/);
  assert.match(source, /music-shelf__track-state/);
});

test("Music exposes only Stations and My Music", () => {
  assert.match(source, /\[\["stations", "Stations"\], \["my-music", "My Music"\]\]/);
  assert.doesNotMatch(source, /Playlist Library|tab === "library"|type MusicTab = [^;]*library/);
});
