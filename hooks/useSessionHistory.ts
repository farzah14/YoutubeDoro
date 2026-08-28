"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { LearningSession, SessionFilters } from "@/types/tracker";
import { trackerApi } from "@/lib/trackerApi";

export function useSessionHistory(filters: SessionFilters = {}) {
  const { from, to, taskId, limit } = filters;
  const [sessions, setSessions] = useState<LearningSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const mounted = useRef(true);

  useEffect(() => () => { mounted.current = false; }, []);

  const reload = useCallback(async () => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    try {
      const result = await trackerApi.listSessions({ from, to, taskId, limit }, controller.signal);
      if (mounted.current) setSessions(result.sessions);
    } catch (cause) {
      if (cause instanceof DOMException && cause.name === "AbortError") return;
      if (mounted.current) setError(cause instanceof Error ? cause.message : "Could not load session history.");
    } finally {
      if (mounted.current) setLoading(false);
    }
  }, [from, to, taskId, limit]);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    setLoading(true);
    setError("");
    trackerApi.listSessions({ from, to, taskId, limit }, controller.signal).then((result) => {
      if (!cancelled) { setSessions(result.sessions); setError(""); }
    }).catch((cause: unknown) => {
      if (!cancelled && !(cause instanceof DOMException && cause.name === "AbortError")) setError(cause instanceof Error ? cause.message : "Could not load session history.");
    }).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; controller.abort(); };
  }, [from, to, taskId, limit]);

  return { sessions, loading, error, reload, empty: !loading && !error && sessions.length === 0 };
}
