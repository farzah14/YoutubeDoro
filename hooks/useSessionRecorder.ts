"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { LearningSession, SessionStatus } from "@/types/tracker";
import { trackerApi } from "@/lib/trackerApi";

export interface SessionStartInput {
  taskId?: string | null;
  taskTitleSnapshot: string;
  title: string;
  timerMode: "pomodoro" | "countdown" | "stopwatch" | "animedoro" | "52-17";
  plannedSeconds?: number | null;
}

export interface SessionMeasurements {
  learningSeconds: number;
  breakCount: number;
  breakSeconds: number;
}

const EMPTY_MEASUREMENTS: SessionMeasurements = { learningSeconds: 0, breakCount: 0, breakSeconds: 0 };

export function useSessionRecorder() {
  const sessionId = useRef<string | null>(null);
  const finalized = useRef(false);
  const finalizing = useRef(false);
  const saveQueue = useRef(Promise.resolve());
  const measurements = useRef<SessionMeasurements>(EMPTY_MEASUREMENTS);
  const [session, setSession] = useState<LearningSession | null>(null);
  const [error, setError] = useState("");

  const enqueueUpdate = useCallback((id: string, payload: Record<string, unknown>) => {
    const request = saveQueue.current.then(() => trackerApi.updateSession(id, payload));
    saveQueue.current = request.then(() => undefined, () => undefined);
    return request;
  }, []);

  const flush = useCallback(async () => {
    if (!sessionId.current || finalized.current) return false;
    try {
      await enqueueUpdate(sessionId.current, { ...measurements.current });
      setError("");
      return true;
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not save the session checkpoint.");
      return false;
    }
  }, [enqueueUpdate]);

  useEffect(() => {
    const interval = window.setInterval(() => { void flush(); }, 5_000);
    return () => window.clearInterval(interval);
  }, [flush]);

  const start = useCallback(async (input: SessionStartInput) => {
    if (sessionId.current && !finalized.current) return session;
    try {
      const result = await trackerApi.createSession(input);
      sessionId.current = result.session.id;
      finalized.current = false;
      finalizing.current = false;
      measurements.current = { ...EMPTY_MEASUREMENTS };
      setSession(result.session);
      setError("");
      return result.session;
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not create the learning session.");
      return null;
    }
  }, [session]);

  const checkpoint = useCallback((next: SessionMeasurements, immediate = false) => {
    measurements.current = {
      learningSeconds: Math.max(0, Math.floor(next.learningSeconds)),
      breakCount: Math.max(0, Math.floor(next.breakCount)),
      breakSeconds: Math.max(0, Math.floor(next.breakSeconds)),
    };
    if (immediate) void flush();
  }, [flush]);

  const breakStart = useCallback(async () => {
    if (!sessionId.current || finalized.current) return false;
    measurements.current = { ...measurements.current, breakCount: measurements.current.breakCount + 1 };
    await flush();
    return true;
  }, [flush]);
  const breakCheckpoint = useCallback((breakSeconds: number, immediate = false) => {
    measurements.current = { ...measurements.current, breakSeconds: Math.max(0, Math.floor(breakSeconds)) };
    if (immediate) void flush();
  }, [flush]);
  const breakEnd = useCallback((breakSeconds: number) => {
    breakCheckpoint(breakSeconds, true);
  }, [breakCheckpoint]);

  const finalize = useCallback(async (status: Exclude<SessionStatus, "active" | "legacy">, next: SessionMeasurements, note = "") => {
    if (!sessionId.current || finalized.current || finalizing.current) return false;
    finalizing.current = true;
    measurements.current = { ...next };
    try {
      const result = await enqueueUpdate(sessionId.current, {
        ...measurements.current,
        status,
        note,
      });
      setSession(result.session);
      finalized.current = true;
      setError("");
      return true;
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not finalize the learning session.");
      return false;
    } finally {
      finalizing.current = false;
    }
  }, [enqueueUpdate]);

  const updateMetadata = useCallback(async (next: { title?: string; taskId?: string | null; note?: string }) => {
    if (!sessionId.current) return false;
    try {
      const result = await enqueueUpdate(sessionId.current, next);
      setSession(result.session);
      setError("");
      return true;
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not save session details.");
      return false;
    }
  }, [enqueueUpdate]);

  const recover = useCallback(async () => {
    try {
      const result = await trackerApi.recoverSessions();
      setError("");
      return result.sessions;
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not recover the previous session.");
      return [];
    }
  }, []);

  const getLastMeasurements = useCallback(() => ({ ...measurements.current }), []);

  return {
    session,
    sessionId: sessionId.current,
    error,
    start,
    checkpoint,
    breakStart,
    breakCheckpoint,
    breakEnd,
    finalize,
    updateMetadata,
    recover,
    getLastMeasurements,
  };
}
