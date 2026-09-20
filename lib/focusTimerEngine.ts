import type { FocusPreferences, TimerMode, TimerPhase } from "../types/focus.ts";

export const POMODORO_FOCUS_MINUTES = 25;
export const ANIMEDORO_FOCUS_MINUTES = 50;

export type TimerDriver = "clock" | "media";
export type MediaBreakStatus = "idle" | "running" | "paused";

export interface FocusTimerState {
  mode: TimerMode;
  phase: TimerPhase;
  driver: TimerDriver;
  status: "idle" | "running" | "paused" | "done";
  targetSeconds: number;
  elapsedSeconds: number;
  completedFocusSessions: number;
  startedAtMs: number | null;
  runStartedElapsedSeconds: number;
}

function phaseSeconds(mode: TimerMode, phase: TimerPhase, preferences: FocusPreferences): number {
  if (phase === "focus") {
    if (mode === "stopwatch") return 0;
    if (mode === "countdown") return preferences.countdownMinutes * 60;
    if (mode === "52-17") return 52 * 60;
    if (mode === "pomodoro") return POMODORO_FOCUS_MINUTES * 60;
    if (mode === "animedoro") return ANIMEDORO_FOCUS_MINUTES * 60;
    return preferences.focusMinutes * 60;
  }
  return (mode === "52-17" ? 17 : preferences.breakMinutes) * 60;
}

export function createTimerState(preferences: FocusPreferences): FocusTimerState {
  return {
    mode: preferences.mode,
    phase: "focus",
    driver: "clock",
    status: "idle",
    targetSeconds: phaseSeconds(preferences.mode, "focus", preferences),
    elapsedSeconds: 0,
    completedFocusSessions: 0,
    startedAtMs: null,
    runStartedElapsedSeconds: 0,
  };
}

export function advanceTimer(state: FocusTimerState, preferences: FocusPreferences): FocusTimerState {
  if (state.mode === "countdown" || state.mode === "stopwatch") {
    return { ...state, status: "done", startedAtMs: null };
  }

  let phase: TimerPhase = "focus";
  let completedFocusSessions = state.completedFocusSessions;
  if (state.phase === "focus") {
    completedFocusSessions += 1;
    phase = "break";
  }

  return {
    ...state,
    phase,
    driver: "clock",
    status: state.phase === "focus" && state.mode !== "animedoro" && preferences.autoStartBreaks ? "running" : "idle",
    targetSeconds: phaseSeconds(state.mode, phase, preferences),
    elapsedSeconds: 0,
    completedFocusSessions,
    startedAtMs: null,
    runStartedElapsedSeconds: 0,
  };
}

export function startTimer(state: FocusTimerState, nowMs: number): FocusTimerState {
  const elapsedSeconds = state.status === "done" ? 0 : state.elapsedSeconds;
  return {
    ...state,
    status: "running",
    elapsedSeconds,
    startedAtMs: nowMs,
    runStartedElapsedSeconds: elapsedSeconds,
  };
}

function elapsedAt(state: FocusTimerState, nowMs: number): number {
  if (state.status !== "running" || state.startedAtMs === null) return state.elapsedSeconds;
  return state.runStartedElapsedSeconds + Math.max(0, Math.floor((nowMs - state.startedAtMs) / 1000));
}

export function syncTimer(
  state: FocusTimerState,
  preferences: FocusPreferences,
  nowMs: number
): FocusTimerState {
  if (state.driver === "media" || state.status !== "running") return state;

  const elapsedSeconds = elapsedAt(state, nowMs);
  if (state.mode === "stopwatch" || elapsedSeconds < state.targetSeconds) {
    return { ...state, elapsedSeconds };
  }

  const next = advanceTimer(
    { ...state, elapsedSeconds: state.targetSeconds, status: "done", startedAtMs: null },
    preferences
  );
  return next.status === "running"
    ? { ...next, startedAtMs: nowMs, runStartedElapsedSeconds: 0 }
    : next;
}

export function pauseTimer(state: FocusTimerState, nowMs: number): FocusTimerState {
  if (state.status !== "running") return state;
  const elapsedSeconds = elapsedAt(state, nowMs);
  return {
    ...state,
    status: "paused",
    elapsedSeconds,
    startedAtMs: null,
    runStartedElapsedSeconds: elapsedSeconds,
  };
}

export function resumeTimer(state: FocusTimerState, nowMs: number): FocusTimerState {
  if (state.status !== "paused") return state;
  return {
    ...state,
    status: "running",
    startedAtMs: nowMs,
    runStartedElapsedSeconds: state.elapsedSeconds,
  };
}

export function resetTimer(_state: FocusTimerState, preferences: FocusPreferences): FocusTimerState {
  return createTimerState(preferences);
}

function safeMediaSeconds(value: number, fallback = 0): number {
  return Number.isFinite(value) ? Math.max(0, Math.floor(value)) : fallback;
}

export function prepareMediaBreak(state: FocusTimerState, durationSeconds: number): FocusTimerState {
  const targetSeconds = Math.max(1, safeMediaSeconds(durationSeconds, 1));
  return {
    ...state,
    driver: "media",
    phase: "break",
    status: "idle",
    targetSeconds,
    elapsedSeconds: 0,
    startedAtMs: null,
    runStartedElapsedSeconds: 0,
  };
}

export function syncMediaBreak(
  state: FocusTimerState,
  elapsedSeconds: number,
  status: MediaBreakStatus,
): FocusTimerState {
  if (state.driver !== "media" || state.phase !== "break") return state;
  return {
    ...state,
    status,
    elapsedSeconds: Math.min(state.targetSeconds, safeMediaSeconds(elapsedSeconds)),
    startedAtMs: null,
    runStartedElapsedSeconds: 0,
  };
}

export function finishMediaBreak(
  state: FocusTimerState,
  preferences: FocusPreferences,
): FocusTimerState {
  const next = createTimerState({ ...preferences, mode: state.mode });
  return { ...next, completedFocusSessions: state.completedFocusSessions };
}

export function selectTimerPhase(
  state: FocusTimerState,
  preferences: FocusPreferences,
  phase: TimerPhase
): FocusTimerState {
  return {
    ...state,
    phase,
    driver: "clock",
    status: "idle",
    targetSeconds: phaseSeconds(state.mode, phase, preferences),
    elapsedSeconds: 0,
    startedAtMs: null,
    runStartedElapsedSeconds: 0,
  };
}

export function getDisplaySeconds(state: FocusTimerState): number {
  return state.mode === "stopwatch"
    ? state.elapsedSeconds
    : Math.max(0, state.targetSeconds - state.elapsedSeconds);
}
