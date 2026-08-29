import assert from "node:assert/strict";
import { existsSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const source = readFileSync(join(process.cwd(), "lib/themeConfig.ts"), "utf8");
const ids = ["night-study", "rainy-evening", "sunset-study", "lantern-library",
  "rooftop-bluehour", "train-window", "forest-cabin", "cherry-dawn", "violet-sky",
  "forest-green", "anime-sky", "sakura-street", "ocean-horizon", "misty-mountains", "cozy-cafe"];

test("active themes use original anime WebP scenes", () => {
  assert.doesNotMatch(source, /backgroundUrl: "[^"\n]+\.jpg"/);
  assert.doesNotMatch(source, /sceneAlt: "Real /);
  for (const id of ids) {
    assert.match(source, new RegExp(`backgroundUrl: "/themes/${id}\\.webp"`));
    const file = join(process.cwd(), "public", "themes", `${id}.webp`);
    assert.equal(existsSync(file), true, `${id}.webp is missing`);
    assert.ok(statSync(file).size > 50_000, `${id}.webp is too small to be a rendered scene`);
  }
});

test("the former Cherry Dawn slot now presents Open Sky", () => {
  assert.match(source, /"cherry-dawn":\s*\{[\s\S]*name: "Open Sky"/);
  assert.match(source, /sceneAlt: "Illustrated rooftop study desk beneath a wide blue sky and layered clouds"/);
  assert.doesNotMatch(source, /name: "Cherry Dawn"/);
});
