import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

import test from "node:test";

const cardPath = new URL("../components/timer/AnimeBreakCard.tsx", import.meta.url);
const restPath = new URL("../components/timer/RestCardContainer.tsx", import.meta.url);
const timer = readFileSync(new URL("../components/YouTubeRestTimer.tsx", import.meta.url), "utf8");

test("Break tools expose an in-app provider-neutral Anime Break", () => {
  assert.equal(existsSync(cardPath), true);
  const card = readFileSync(cardPath, "utf8");
  const rest = readFileSync(restPath, "utf8");

  assert.match(rest, /Anime video/);
  assert.match(rest, /<AnimeBreakCard/);
  assert.match(card, /Anime Break/);
  assert.match(card, /YouTube, Vimeo, MP4, or WebM/);
  assert.match(card, /parseBreakMediaInput/);
  assert.match(card, /migrateSavedBreakMedia/);
  assert.match(card, /YouTubeBreakPlayer/);
  assert.match(card, /VimeoBreakPlayer/);
  assert.match(card, /DirectBreakPlayer/);
  assert.doesNotMatch(rest, /YouTubeRestCard|label: "YouTube"/);
});

test("completed Pomodoro opens and wires Anime Break", () => {
  assert.match(timer, /followedByBreak\s*&&\s*mode === "pomodoro"/);
  assert.match(timer, /setOpenPanel\("rest"\)/);
  assert.match(timer, /defaultMode="anime"/);
  for (const token of [
    "prepareMediaBreak",
    "startMediaBreak",
    "updateMediaBreak",
    "finishMediaBreak",
    "stopMediaBreak",
  ]) {
    assert.match(timer, new RegExp(`focusTimer\\.${token}`));
  }
});
