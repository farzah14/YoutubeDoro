import assert from "node:assert/strict";
import test from "node:test";
import { addSoundLayer, sanitizeSoundMix, SOUNDSCAPE_CATALOG } from "../lib/soundscapes.ts";

test("ships the six required procedural sounds", () => {
  assert.deepEqual(
    SOUNDSCAPE_CATALOG.map((sound) => sound.label),
    ["Light Rain", "Campfire", "Wind", "White Noise", "Pink Noise", "Brown Noise"]
  );
  assert.equal(SOUNDSCAPE_CATALOG.every((sound) => typeof sound.create === "function"), true);
});

test("sanitizes a mix and enforces five unique layers", () => {
  const safe = sanitizeSoundMix([
    { id: "rain", volume: 150 },
    { id: "rain", volume: 20 },
    { id: "campfire", volume: -10 },
    { id: "unknown", volume: 50 },
  ]);
  assert.deepEqual(safe, [{ id: "rain", volume: 100 }, { id: "campfire", volume: 0 }]);

  const five = ["rain", "campfire", "wind", "white-noise", "pink-noise"]
    .reduce((mix, id) => addSoundLayer(mix, id), [] as Array<{ id: string; volume: number }>);
  assert.equal(five.length, 5);
  assert.deepEqual(addSoundLayer(five, "brown-noise"), five);
});
