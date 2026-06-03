"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { readString, writeString, readJSON, writeJSON } from "@/lib/storage";
import { KEYS, NOTION_SYNC_DEBOUNCE_MS } from "@/lib/constants";
import type { NotionSyncState, SyncPayload, DailyNoteEntry } from "@/types";

export function useNotionSync() {
  const [syncState, setSyncState] = useState<NotionSyncState>({
    status: "idle",
    lastSync: null,
    connected: false,
    error: null,
  });

  const [settingsOpen, setSettingsOpen] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const syncingRef = useRef(false);

  // Load persisted state on mount
  useEffect(() => {
    const connected = readString(KEYS.notionConnected) === "true";
    const lastSync = readString(KEYS.notionLastSync) || null;
    setSyncState((prev) => ({ ...prev, connected, lastSync }));

    // Auto-detect connection if server-side env variables are set
    if (!connected) {
      fetch("/api/notion/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: "env" }),
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.connected && data.database?.id) {
            writeString(KEYS.notionDatabaseId, data.database.id);
            writeString(KEYS.notionConnected, "true");
            setSyncState((prev) => ({
              ...prev,
              connected: true,
              error: null,
            }));
          }
        })
        .catch(() => {
          // Silent catch for network or initialization issues
        });
    }
  }, []);

  // ── GET CONFIG ──
  const getConfig = useCallback(() => {
    return {
      token: readString(KEYS.notionConnected) === "true" ? "server" : "",
      databaseId: readString(KEYS.notionDatabaseId),
      connected: readString(KEYS.notionConnected) === "true",
    };
  }, []);

  // ── VALIDATE & CONNECT ──
  const validate = useCallback(
    async (token: string, parentPageId?: string) => {
      setSyncState((prev) => ({ ...prev, status: "syncing", error: null }));

      try {
        const res = await fetch("/api/notion/validate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token, parentPageId }),
        });

        const data = await res.json();

        if (data.valid) {
          // Save config
          if (data.databaseId) {
            writeString(KEYS.notionDatabaseId, data.databaseId);
          }
          writeString(KEYS.notionConnected, "true");

          setSyncState((prev) => ({
            ...prev,
            status: "success",
            connected: true,
            error: null,
          }));

          return { success: true, user: data.user, databaseId: data.databaseId };
        } else {
          setSyncState((prev) => ({
            ...prev,
            status: "error",
            error: data.error || "Validation failed",
          }));
          return { success: false, error: data.error };
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Network error";
        setSyncState((prev) => ({ ...prev, status: "error", error: msg }));
        return { success: false, error: msg };
      }
    },
    []
  );

  // ── DISCONNECT ──
  const disconnect = useCallback(() => {
    writeString(KEYS.notionConnected, "false");
    writeString(KEYS.notionDatabaseId, "");
    writeString(KEYS.notionLastSync, "");
    setSyncState({
      status: "idle",
      lastSync: null,
      connected: false,
      error: null,
    });
  }, []);

  // ── SYNC (PUSH) ──
  const syncNow = useCallback(
    async (payload: SyncPayload) => {
      const config = getConfig();
      if (!config.connected || !config.databaseId) {
        return { success: false, error: "Not connected to Notion" };
      }

      if (syncingRef.current) {
        return { success: false, error: "Sync already in progress" };
      }

      syncingRef.current = true;
      setSyncState((prev) => ({ ...prev, status: "syncing", error: null }));

      try {
        const pageId = readString(KEYS.notionPageIdByDay(payload.day)) || undefined;

        const res = await fetch("/api/notion/sync", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            token: "env", // signal to use server-side env token
            databaseId: config.databaseId,
            ...payload,
            existingPageId: pageId,
          }),
        });

        const data = await res.json();

        if (data.success) {
          const now = new Date().toISOString();
          writeString(KEYS.notionLastSync, now);
          if (data.pageId) {
            writeString(KEYS.notionPageIdByDay(payload.day), data.pageId);
          }
          setSyncState((prev) => ({
            ...prev,
            status: "success",
            lastSync: now,
            error: null,
          }));
          // Reset status after 3 seconds
          setTimeout(() => {
            setSyncState((prev) => {
              if (prev.status === "success") return { ...prev, status: "idle" };
              return prev;
            });
          }, 3000);
          return { success: true };
        } else {
          setSyncState((prev) => ({
            ...prev,
            status: "error",
            error: data.error || "Sync failed",
          }));
          return { success: false, error: data.error };
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Network error";
        setSyncState((prev) => ({ ...prev, status: "error", error: msg }));
        return { success: false, error: msg };
      } finally {
        syncingRef.current = false;
      }
    },
    [getConfig]
  );

  // ── DEBOUNCED SYNC ──
  const syncDebounced = useCallback(
    (payload: SyncPayload) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        syncNow(payload);
      }, NOTION_SYNC_DEBOUNCE_MS);
    },
    [syncNow]
  );

  // ── PULL (from Notion) ──
  const pullFromNotion = useCallback(
    async (day?: string) => {
      const config = getConfig();
      if (!config.connected || !config.databaseId) {
        return { success: false, error: "Not connected" };
      }

      try {
        const res = await fetch("/api/notion/pull", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            token: "env",
            databaseId: config.databaseId,
            day,
          }),
        });

        const data = await res.json();
        return data;
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Network error";
        return { success: false, error: msg };
      }
    },
    [getConfig]
  );

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  return {
    syncState,
    settingsOpen,
    setSettingsOpen,
    validate,
    disconnect,
    syncNow,
    syncDebounced,
    pullFromNotion,
    getConfig,
  };
}
