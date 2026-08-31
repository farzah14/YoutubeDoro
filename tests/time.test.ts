import assert from "node:assert/strict";
import test from "node:test";
import { formatClock } from "../lib/time.ts";

test("formats the home clock with AM/PM when 24-hour mode is off", () => {
  const date = new Date(2026, 0, 1, 17, 5, 9);

  assert.equal(formatClock(date, false, false), "5:05 PM");
  assert.equal(formatClock(date, false, true), "5:05:09 PM");
  assert.equal(formatClock(date, true, false), "17:05");
});
