import assert from "node:assert/strict";
import test from "node:test";
import { formatDuration } from "../lib/duration.ts";

test("formats hours and minutes with correct grammar", () => {
  assert.equal(formatDuration(60), "1 minute");
  assert.equal(formatDuration(3600), "1 hour");
  assert.equal(formatDuration(5400), "1 hour 30 minutes");
  assert.equal(formatDuration(7200), "2 hours");
});

test("uses seconds below one minute and clamps invalid input", () => {
  assert.equal(formatDuration(45), "45 seconds");
  assert.equal(formatDuration(0), "0 minutes");
  assert.equal(formatDuration(-1), "0 minutes");
  assert.equal(formatDuration(Number.NaN), "0 minutes");
});
