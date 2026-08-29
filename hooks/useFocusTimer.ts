"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { KEYS } from "@/lib/constants";
import {
  createTimerState,
  getDisplaySeconds,
  pauseTimer,
  resetTimer,
  resumeTimer,
  selectTimerPhase,
  startTimer,
  syncTimer,
  type FocusTimerState,
} from "@/lib/focusTimerEngine";
import { DEFAULT_FOCUS_PREFERENCES, migrateFocusPreferences } from "@/lib/migrations";
import type { FocusPreferences, TimerMode, TimerPhase } from "@/types/focus";
import { useLocalStorage } from "./useLocalStorage";
import { notifyTimerComplete, playTimerAlert, primeTimerAlertAudio, requestScreenWakeLock, type WakeLockHandle } from "@/lib/browserFeatures";

export interface TimerStartContext {
  mode: TimerMode;
  phase: TimerPhase;
  plannedSeconds: number | null;
}

type StartBoundary = (context: TimerStartContext) => void | boolean | Promise<void | boolean>;

interface UseFocusTimerOptions {
  onFocusStart?: StartBoundary;
  onBreakStart?: StartBoundary;
  onFocusDone?: (seconds: number, followedByBreak: boolean) => void;
  onFocusStop?: (seconds: number) => void;
  onBreakDone?: (seconds: number) => void;
  onBreakStop?: (seconds: number) => void;
}

export function useFocusTimer(options: UseFocusTimerOptions = {}) {
  const [storedPreferences, setStoredPreferences] = useLocalStorage(
    KEYS.focusPreferences,
    DEFAULT_FOCUS_PREFERENCES
  );
  const preferences = useMemo(
    () => migrateFocusPreferences(storedPreferences),
    [storedPreferences]
  );
  const [state, setState] = useState<FocusTimerState>(() => createTimerState(preferences));
  const previousState = useRef(state);
  const stateRef = useRef(state);
  const callbacks = useRef(options);
  const wakeLock = useRef<WakeLockHandle | null>(null);
  const startingRef = useRef(false);

  stateRef.current = state;

  useEffect(() => {
    callbacks.current = options;
  }, [options]);

  useEffect(() => {
    if (state.status !== "running") return;
    const interval = window.setInterval(() => {
      setState((current) => syncTimer(current, preferences, Date.now()));
    }, 250);
    return () => window.clearInterval(interval);
  }, [preferences, state.status]);

  useEffect(() => {
    if (state.status !== "running") return;
    let active = true;
    void requestScreenWakeLock().then((handle) => {
      if (active) wakeLock.current = handle;
      else void handle?.release();
    });
    return () => {
      active = false;
      const handle = wakeLock.current;
      wakeLock.current = null;
      void handle?.release();
    };
  }, [state.status]);

  useEffect(() => {
    const previous = previousState.current;
    const completed = previous.status === "running" &&
      (previous.phase !== state.phase || state.status === "done");
    if (completed) {
      if (preferences.notificationEnabled) notifyTimerComplete(previous.phase === "focus" ? "Your focus interval is complete." : "Your break is complete.");
      void playTimerAlert(preferences.alertSound, preferences.alertVolume);
      if (previous.phase === "focus") callbacks.current.onFocusDone?.(previous.targetSeconds, state.phase === "break");
      else callbacks.current.onBreakDone?.(previous.targetSeconds);
      if (previous.phase === "focus" && state.phase === "break" && state.status === "running") {
        callbacks.current.onBreakStart?.({ mode: state.mode, phase: "break", plannedSeconds: state.targetSeconds });
      }
    }
    previousState.current = state;
  }, [preferences.alertSound, preferences.alertVolume, preferences.notificationEnabled, state]);

  const start = useCallback(async () => {
    if (startingRef.current) return;
    const current = stateRef.current;
    if (current.status === "running" || current.status === "paused") return;
    startingRef.current = true;
    void primeTimerAlertAudio();
    try {
      const boundary = current.phase === "focus" ? callbacks.current.onFocusStart : callbacks.current.onBreakStart;
      const allowed = await boundary?.({
        mode: current.mode,
        phase: current.phase,
        plannedSeconds: current.targetSeconds > 0 ? current.targetSeconds : null,
      });
      if (allowed === false) return;
      setState((latest) => latest.status === "running" || latest.status === "paused" ? latest : startTimer(latest, Date.now()));
    } finally {
      startingRef.current = false;
    }
  }, []);
  const pause = useCallback(() => setState((current) => pauseTimer(current, Date.now())), []);
  const resume = useCallback(() => setState((current) => resumeTimer(current, Date.now())), []);
  const reset = useCallback(() => {
    setState((current) => {
      const stopped = current.status === "running" ? pauseTimer(current, Date.now()) : current;
      if (current.status === "running" || current.status === "paused") {
        if (stopped.phase === "focus") callbacks.current.onFocusStop?.(stopped.elapsedSeconds);
        else callbacks.current.onBreakStop?.(stopped.elapsedSeconds);
      }
      return resetTimer(stopped, preferences);
    });
  }, [preferences]);
  const selectPhase = useCallback(
    (phase: TimerPhase) => setState((current) => {
      if (current.status === "running" || current.status === "paused") {
        const elapsed = current.status === "paused" ? current.elapsedSeconds : current.elapsedSeconds;
        if (current.phase === "focus") callbacks.current.onFocusStop?.(elapsed);
        else callbacks.current.onBreakStop?.(elapsed);
      }
      return selectTimerPhase(current, preferences, phase);
    }),
    [preferences]
  );
  const setMode = useCallback((mode: TimerMode) => {
    const next = { ...preferences, mode };
    setStoredPreferences(next);
    setState(createTimerState(next));
  }, [preferences, setStoredPreferences]);
  const updatePreferences = useCallback((next: FocusPreferences) => {
    const safe = migrateFocusPreferences(next);
    setStoredPreferences(safe);
    setState((current) => current.status === "idle" ? createTimerState(safe) : current);
  }, [setStoredPreferences]);

  return {
    state,
    preferences,
    displaySeconds: getDisplaySeconds(state),
    start,
    pause,
    resume,
    reset,
    selectPhase,
    setMode,
    updatePreferences,
  };
}

export type FocusTimer = ReturnType<typeof useFocusTimer>;
