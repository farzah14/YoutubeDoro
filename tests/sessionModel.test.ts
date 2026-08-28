import assert from "node:assert/strict";
import test from "node:test";
import { deriveTaskProgress, normalizeSessionPatch } from "../lib/trackerModel.ts";

test("derives task progress from active learning seconds", () => {
  assert.equal(deriveTaskProgress(1_800, 60), 50);
  assert.equal(deriveTaskProgress(7_200, 60), 100);
});

test("normalizes measurements and excludes paused time", () => {
  const patch = normalizeSessionPatch({
    learningSeconds: -3,
    breakCount: -1,
    breakSeconds: Number.NaN,
    pausedSeconds: 99,
  });

  assert.deepEqual(patch, {
    learningSeconds: 0,
    breakCount: 0,
    breakSeconds: 0,
  });
  assert.equal("pausedSeconds" in patch, false);
});
