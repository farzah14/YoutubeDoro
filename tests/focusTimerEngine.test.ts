import assert from "node:assert/strict";
import test from "node:test";

import {
  advanceTimer,
  createTimerState,
  getDisplaySeconds,
  pauseTimer,
  resetTimer,
  resumeTimer,
  selectTimerPhase,
  startTimer,
  syncTimer,
} from "../lib/focusTimerEngine.ts";
import type { FocusPreferences } from "../types/focus.ts";

const preferences: FocusPreferences = {
  mode: "pomodoro",
  focusMinutes: 25,
  breakMinutes: 5,
  countdownMinutes: 40,
  autoStartBreaks: false,
  notificationEnabled: false,
  alertSound: "soft",
  alertVolume: 70,
  showTaskInPip: false,
};

test("pomodoro advances focus to a generic break", () => {
  const running = startTimer(createTimerState(preferences), 1_000);
  const next = syncTimer(running, preferences, 1_000 + 25 * 60 * 1_000);

  assert.equal(next.phase, "break");
  assert.equal(next.targetSeconds, 5 * 60);
  assert.equal(next.completedFocusSessions, 1);
  assert.equal(next.status, "idle");
});

test("the fourth pomodoro still advances to the generic break", () => {
  const state = { ...createTimerState(preferences), completedFocusSessions: 3 };
  const next = advanceTimer(state, preferences);

  assert.equal(next.phase, "break");
  assert.equal(next.targetSeconds, 5 * 60);
  assert.equal(next.completedFocusSessions, 4);
});

test("both Pomodoro break phases use the single configured break length", () => {
  const configured = { ...preferences, breakMinutes: 7 };
  const state = { ...createTimerState(configured), completedFocusSessions: 3 };
  const next = advanceTimer(state, configured);

  assert.equal(next.phase, "break");
  assert.equal(next.targetSeconds, 7 * 60);
});

test("52/17 uses fixed focus and break lengths", () => {
  const configured = { ...preferences, mode: "52-17" as const };
  const state = createTimerState(configured);
  const next = advanceTimer(state, configured);

  assert.equal(state.targetSeconds, 52 * 60);
  assert.equal(next.phase, "break");
  assert.equal(next.targetSeconds, 17 * 60);
});

test("animedoro uses the shared break length as watch time", () => {
  const configured = { ...preferences, mode: "animedoro" as const, breakMinutes: 11 };
  const next = advanceTimer(createTimerState(configured), configured);

  assert.equal(next.phase, "break");
  assert.equal(next.targetSeconds, 11 * 60);
});

test("countdown completes without creating a break", () => {
  const configured = { ...preferences, mode: "countdown" as const };
  const running = startTimer(createTimerState(configured), 0);
  const done = syncTimer(running, configured, 40 * 60 * 1_000);

  assert.equal(done.phase, "focus");
  assert.equal(done.status, "done");
  assert.equal(getDisplaySeconds(done), 0);
});

test("stopwatch counts upward and never auto-completes", () => {
  const configured = { ...preferences, mode: "stopwatch" as const };
  const running = startTimer(createTimerState(configured), 10_000);
  const current = syncTimer(running, configured, 100_000);

  assert.equal(current.status, "running");
  assert.equal(getDisplaySeconds(current), 90);
});

test("pause and resume exclude paused wall-clock time", () => {
  const started = startTimer(createTimerState(preferences), 0);
  const paused = pauseTimer(started, 15_000);
  const resumed = resumeTimer(paused, 100_000);
  const current = syncTimer(resumed, preferences, 110_000);

  assert.equal(current.elapsedSeconds, 25);
  assert.equal(getDisplaySeconds(current), 25 * 60 - 25);
});

test("frequent sub-second syncs do not discard elapsed time", () => {
  let current = startTimer(createTimerState(preferences), 0);
  for (const now of [250, 500, 750, 1_000, 1_250]) {
    current = syncTimer(current, preferences, now);
  }

  assert.equal(current.elapsedSeconds, 1);
  assert.equal(getDisplaySeconds(current), 25 * 60 - 1);
});

test("reset restores the configured opening phase", () => {
  const changed = {
    ...createTimerState(preferences),
    phase: "break" as const,
    elapsedSeconds: 99,
    completedFocusSessions: 3,
    status: "paused" as const,
  };
  const reset = resetTimer(changed, preferences);

  assert.equal(reset.phase, "focus");
  assert.equal(reset.elapsedSeconds, 0);
  assert.equal(reset.completedFocusSessions, 0);
  assert.equal(reset.status, "idle");
});

test("manual phase selection resets only the active interval", () => {
  const state = { ...createTimerState(preferences), completedFocusSessions: 2 };
  const selected = selectTimerPhase(state, preferences, "break");

  assert.equal(selected.phase, "break");
  assert.equal(selected.targetSeconds, 5 * 60);
  assert.equal(selected.completedFocusSessions, 2);
  assert.equal(selected.elapsedSeconds, 0);
  assert.equal(selected.status, "idle");
});

test("auto-start breaks does not auto-start the next focus session", () => {
  const autoPreferences = { ...preferences, autoStartBreaks: true };
  const focusDone = syncTimer(startTimer(createTimerState(autoPreferences), 0), autoPreferences, 25 * 60_000);
  assert.equal(focusDone.phase, "break");
  assert.equal(focusDone.status, "running");

  const breakDone = syncTimer(focusDone, autoPreferences, 30 * 60_000);
  assert.equal(breakDone.phase, "focus");
  assert.equal(breakDone.status, "idle");
});
