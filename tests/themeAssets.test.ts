import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { fileURLToPath } from "node:url";

const themeConfigSource = readFileSync(
  fileURLToPath(new URL("../lib/themeConfig.ts", import.meta.url)),
  "utf8"
);
const themeIds = [
  "night-study",
  "rainy-evening",
  "sunset-study",
  "lantern-library",
  "rooftop-bluehour",
  "train-window",
  "forest-cabin",
  "cherry-dawn",
  "violet-sky",
  "forest-green",
  "anime-sky",
  "sakura-street",
  "ocean-horizon",
  "misty-mountains",
  "cozy-cafe",
];

test("theme backgrounds point to downloaded JPEG photographs", () => {
  assert.doesNotMatch(themeConfigSource, /backgroundUrl: "[^"\n]+\.svg"/);

  for (const id of themeIds) {
    assert.match(themeConfigSource, new RegExp(`backgroundUrl: "/themes/${id}\\.jpg"`));
  }
});
