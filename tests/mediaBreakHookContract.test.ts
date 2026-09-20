import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL("../hooks/useFocusTimer.ts", import.meta.url), "utf8");

test("focus timer exposes one media-break lifecycle", () => {
  for (const token of [
    "prepareMediaBreak",
    "startMediaBreak",
    "updateMediaBreak",
    "finishMediaBreak",
    "stopMediaBreak",
    "mediaBreakStartedRef",
  ]) {
    assert.match(source, new RegExp(token));
  }
  assert.match(source, /onBreakDone\?\.\(watchedSeconds\)/);
  assert.match(source, /onBreakStop\?\.\(watchedSeconds\)/);
});
