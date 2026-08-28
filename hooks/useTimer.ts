"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { TimerStatus } from "@/types";
import { useBeep } from "./useBeep";

interface UseTimerProps {
  initialMinutes: number;
  onStart?: () => void | boolean | Promise<void | boolean>;
  onDone?: (seconds: number) => void;
  onStop?: (seconds: number) => void;
  onTick?: (elapsed: number, remaining: number) => void;
  autoNotificationTitle?: string;
  autoNotificationBody?: string;
  tabTitleLabel?: string;
}

export function useTimer({
  initialMinutes,
  onStart,
  onDone,
  onStop,
  onTick,
  autoNotificationTitle = "Timer Finished",
  autoNotificationBody = "Time is up!",
  tabTitleLabel = "Focus",
}: UseTimerProps) {
  const [minutes, setMinutes] = useState(initialMinutes);
  const [status, setStatus] = useState<TimerStatus>("Idle");
  
  const [targetSec, setTargetSec] = useState(initialMinutes * 60);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [remainingSec, setRemainingSec] = useState(initialMinutes * 60);
  const [startedAt, setStartedAt] = useState<Date | null>(null);

  const statusRef = useRef<TimerStatus>("Idle");
  const targetRef = useRef<number>(initialMinutes * 60);
  const timerRef = useRef<number | null>(null);
  const runStartedMsRef = useRef<number>(0);
  const elapsedBeforeRef = useRef<number>(0);

  const { primeAudio, beepTriple } = useBeep();

  const clear = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const computeElapsedNow = useCallback(() => {
    const base = elapsedBeforeRef.current;
    if (statusRef.current !== "Running") return base;
    const add = Math.floor((Date.now() - runStartedMsRef.current) / 1000);
    return Math.max(0, base + add);
  }, []);

  const syncUIFromRefs = useCallback(() => {
    const el = computeElapsedNow();
    const rem = Math.max(0, targetRef.current - el);
    setElapsedSec(el);
    setRemainingSec(rem);
  }, [computeElapsedNow]);

  const tickOnce = useCallback(() => {
    if (statusRef.current !== "Running") return;

    const el = computeElapsedNow();
    const rem = Math.max(0, targetRef.current - el);

    setElapsedSec(el);
    setRemainingSec(rem);
    onTick?.(el, rem);

    if (rem <= 0) {
      clear();
      statusRef.current = "Done";
      setStatus("Done");
      setElapsedSec(targetRef.current);
      setRemainingSec(0);

      if (onDone) onDone(targetRef.current);
      beepTriple();

      try {
        if (typeof Notification !== "undefined" && Notification.permission === "granted") {
          new Notification(autoNotificationTitle, { body: autoNotificationBody });
        }
      } catch {
        // ignore
      }
    }
  }, [clear, computeElapsedNow, onDone, onTick, autoNotificationTitle, autoNotificationBody, beepTriple]);

  const startInterval = useCallback(() => {
    clear();
    timerRef.current = window.setInterval(tickOnce, 250);
  }, [clear, tickOnce]);

  const startingRef = useRef(false);

  const start = useCallback(async () => {
    if (startingRef.current) return;
    primeAudio();

    if (statusRef.current === "Idle" || statusRef.current === "Done") {
      startingRef.current = true;
      try {
        const allowed = await onStart?.();
        if (allowed === false) return;
      } finally {
        startingRef.current = false;
      }
    }

    if (statusRef.current === "Paused" || statusRef.current === "Running") {
      const used = statusRef.current === "Running" ? computeElapsedNow() : elapsedBeforeRef.current;
      const u = Math.max(0, Math.floor(used));
      if (u > 0 && onStop) onStop(u);
    }

    const m = Math.max(1, Math.floor(minutes));
    const t = m * 60;

    targetRef.current = t;
    elapsedBeforeRef.current = 0;
    runStartedMsRef.current = Date.now();
    statusRef.current = "Running";

    setTargetSec(t);
    setStartedAt(new Date());
    setStatus("Running");
    setElapsedSec(0);
    setRemainingSec(t);

    tickOnce();
    startInterval();
  }, [minutes, primeAudio, computeElapsedNow, onStart, onStop, tickOnce, startInterval]);

  const pause = useCallback(() => {
    if (statusRef.current !== "Running") return;
    elapsedBeforeRef.current = computeElapsedNow();
    statusRef.current = "Paused";
    setStatus("Paused");
    clear();
    syncUIFromRefs();
  }, [computeElapsedNow, clear, syncUIFromRefs]);

  const resume = useCallback(() => {
    if (statusRef.current !== "Paused") return;
    runStartedMsRef.current = Date.now();
    statusRef.current = "Running";
    setStatus("Running");
    tickOnce();
    startInterval();
  }, [tickOnce, startInterval]);

  const stop = useCallback(() => {
    if (statusRef.current !== "Running" && statusRef.current !== "Paused") return;
    if (statusRef.current === "Running") {
      elapsedBeforeRef.current = computeElapsedNow();
    }
    clear();
    statusRef.current = "Idle";
    setStatus("Idle");
    syncUIFromRefs();

    const used = Math.max(0, elapsedBeforeRef.current);
    if (onStop) onStop(used);
  }, [clear, computeElapsedNow, syncUIFromRefs, onStop]);

  const reset = useCallback(() => {
    clear();
    statusRef.current = "Idle";
    setStatus("Idle");
    elapsedBeforeRef.current = 0;
    runStartedMsRef.current = 0;
    setStartedAt(null);
    setElapsedSec(0);
    setRemainingSec(targetRef.current);
  }, [clear]);

  useEffect(() => {
    return clear;
  }, [clear]);

  // Update browser tab title
  useEffect(() => {
    if (typeof document !== "undefined") {
      if (status === "Running" || status === "Paused") {
        const m = Math.floor(remainingSec / 60);
        const s = remainingSec % 60;
        const timeStr = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
        const prefix = status === "Paused" ? "⏸ " : "";
        const icon = tabTitleLabel.startsWith("Focus") ? "🎯 " : "☕ ";
        document.title = `${prefix}${icon}(${timeStr}) ${tabTitleLabel} | YoutubeDoro`;
      } else {
        document.title = "YoutubeDoro";
      }
    }
  }, [remainingSec, status, tabTitleLabel]);

  return {
    minutes,
    setMinutes,
    status,
    targetSec,
    elapsedSec,
    remainingSec,
    startedAt,
    start,
    pause,
    resume,
    stop,
    reset,
  };
}
