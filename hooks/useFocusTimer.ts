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

interface UseFocusTimerOptions {
  onFocusDone?: (seconds: number) => void;
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
  const callbacks = useRef(options);
  const wakeLock = useRef<WakeLockHandle | null>(null);

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
      if (previous.phase === "focus") callbacks.current.onFocusDone?.(previous.targetSeconds);
      else callbacks.current.onBreakDone?.(previous.targetSeconds);
    }
    previousState.current = state;
  }, [preferences.alertSound, preferences.alertVolume, preferences.notificationEnabled, state]);

  const start = useCallback(() => {
    void primeTimerAlertAudio();
    setState((current) => startTimer(current, Date.now()));
  }, []);
  const pause = useCallback(() => setState((current) => pauseTimer(current, Date.now())), []);
  const resume = useCallback(() => setState((current) => resumeTimer(current, Date.now())), []);
  const reset = useCallback(() => {
    setState((current) => {
      const stopped = current.status === "running" ? pauseTimer(current, Date.now()) : current;
      if (stopped.elapsedSeconds > 0) {
        if (stopped.phase === "focus") callbacks.current.onFocusStop?.(stopped.elapsedSeconds);
        else callbacks.current.onBreakStop?.(stopped.elapsedSeconds);
      }
      return resetTimer(stopped, preferences);
    });
  }, [preferences]);
  const selectPhase = useCallback(
    (phase: TimerPhase) => setState((current) => selectTimerPhase(current, preferences, phase)),
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
