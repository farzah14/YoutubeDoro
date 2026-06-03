"use client";

import { useState, useEffect, useCallback } from "react";
import { dayKey } from "@/lib/time";
import { readNumber, writeNumber, readString, writeString } from "@/lib/storage";
import { KEYS } from "@/lib/constants";
import { useDailyNotes } from "@/hooks/useDailyNotes";
import { useNotionSync } from "@/hooks/useNotionSync";
import { Header } from "./layout/Header";
import { DailyStats } from "./stats/DailyStats";
import { LearningCard } from "./timer/LearningCard";
import { RestCardContainer } from "./timer/RestCardContainer";
import { Modal } from "./ui/Modal";
import { NotesPanel } from "./notes/NotesPanel";
import { MarkdownScratchpad } from "./notes/MarkdownScratchpad";
import { NotionSettingsModal } from "./notion/NotionSettingsModal";

export default function YouTubeRestTimer() {
  const [today, setToday] = useState<string>("");
  const [topicToday, setTopicToday] = useState<string>("");
  const [totalLearnSec, setTotalLearnSec] = useState<number>(0);
  const [totalRestSec, setTotalRestSec] = useState<number>(0);
  const [notesOpen, setNotesOpen] = useState(false);

  const [focusMode, setFocusMode] = useState(false);

  const { upsertTitleNote, getNotes } = useDailyNotes(today);

  // ── Notion Integration ──
  const {
    syncState,
    settingsOpen,
    setSettingsOpen,
    validate,
    disconnect,
    syncDebounced,
    syncNow,
    pullFromNotion,
  } = useNotionSync();

  // Helper to build sync payload from current state
  const buildSyncPayload = useCallback(() => {
    const scratchpad = typeof window !== "undefined"
      ? window.localStorage.getItem("ytdoro:scratchpad") || ""
      : "";
    return {
      day: today,
      topic: topicToday,
      learnSec: totalLearnSec,
      restSec: totalRestSec,
      notes: getNotes(),
      scratchpad,
    };
  }, [today, topicToday, totalLearnSec, totalRestSec, getNotes]);

  // Auto-sync trigger (called after state updates)
  const triggerNotionSync = useCallback(() => {
    if (!syncState.connected || !today) return;
    // Use setTimeout to ensure state is updated before building payload
    setTimeout(() => {
      const payload = buildSyncPayload();
      syncDebounced(payload);
    }, 100);
  }, [syncState.connected, today, buildSyncPayload, syncDebounced]);

  // Manual sync handler
  const handleManualSync = useCallback(() => {
    if (!today) return;
    const payload = buildSyncPayload();
    syncNow(payload);
  }, [today, buildSyncPayload, syncNow]);

  // Pull handler
  const handlePull = useCallback(async () => {
    const result = await pullFromNotion(today);
    if (result?.success && result?.data) {
      const data = result.data;
      // Update local state with pulled data
      if (data.learnSec !== undefined) {
        setTotalLearnSec(data.learnSec);
        writeNumber(KEYS.learnByDay(today), data.learnSec);
      }
      if (data.restSec !== undefined) {
        setTotalRestSec(data.restSec);
        writeNumber(KEYS.restByDay(today), data.restSec);
      }
      if (data.topic) {
        setTopicToday(data.topic);
        writeString(KEYS.topicByDay(today), data.topic);
      }
      if (data.scratchpad) {
        try {
          window.localStorage.setItem("ytdoro:scratchpad", data.scratchpad);
        } catch {
          // ignore
        }
      }
    }
    return result;
  }, [today, pullFromNotion]);

  useEffect(() => {
    const d = dayKey();
    setToday(d);
    setTotalLearnSec(readNumber(KEYS.learnByDay(d)));
    setTotalRestSec(readNumber(KEYS.restByDay(d)) || readNumber(KEYS.legacyBreakByDay(d)));
    setTopicToday(readString(KEYS.topicByDay(d)));
  }, []);

  const handleStartWithTitle = useCallback((title: string) => {
    const t = title.trim() || "(Untitled)";
    writeString(KEYS.topicByDay(today), t);
    setTopicToday(t);
    upsertTitleNote({ kind: "learn_start", title: t, addLearn: 0, addRest: 0 });
    triggerNotionSync();
  }, [today, upsertTitleNote, triggerNotionSync]);

  const handleLearnDone = useCallback((sec: number) => {
    const next = totalLearnSec + sec;
    setTotalLearnSec(next);
    writeNumber(KEYS.learnByDay(today), next);
    upsertTitleNote({ kind: "learn_done", title: topicToday, addLearn: sec, addRest: 0 });
    triggerNotionSync();
  }, [today, topicToday, totalLearnSec, upsertTitleNote, triggerNotionSync]);

  const handleLearnStop = useCallback((sec: number) => {
    const next = totalLearnSec + sec;
    setTotalLearnSec(next);
    writeNumber(KEYS.learnByDay(today), next);
    upsertTitleNote({ kind: "learn_stop", title: topicToday, addLearn: sec, addRest: 0 });
    triggerNotionSync();
  }, [today, topicToday, totalLearnSec, upsertTitleNote, triggerNotionSync]);

  const handleRestDone = useCallback((sec: number) => {
    const next = totalRestSec + sec;
    setTotalRestSec(next);
    writeNumber(KEYS.restByDay(today), next);
    upsertTitleNote({ kind: "rest_done", title: topicToday, addLearn: 0, addRest: sec });
    triggerNotionSync();
  }, [today, topicToday, totalRestSec, upsertTitleNote, triggerNotionSync]);

  const handleRestStop = useCallback((sec: number) => {
    const next = totalRestSec + sec;
    setTotalRestSec(next);
    writeNumber(KEYS.restByDay(today), next);
    upsertTitleNote({ kind: "rest_stop", title: topicToday, addLearn: 0, addRest: sec });
    triggerNotionSync();
  }, [today, topicToday, totalRestSec, upsertTitleNote, triggerNotionSync]);

  const handleYTDone = useCallback((sec: number) => {
    const next = totalRestSec + sec;
    setTotalRestSec(next);
    writeNumber(KEYS.restByDay(today), next);
    upsertTitleNote({ kind: "yt_rest_done", title: topicToday, addLearn: 0, addRest: sec });
    triggerNotionSync();
  }, [today, topicToday, totalRestSec, upsertTitleNote, triggerNotionSync]);

  const handleYTStop = useCallback((sec: number) => {
    const next = totalRestSec + sec;
    setTotalRestSec(next);
    writeNumber(KEYS.restByDay(today), next);
    upsertTitleNote({ kind: "yt_rest_stop", title: topicToday, addLearn: 0, addRest: sec });
    triggerNotionSync();
  }, [today, topicToday, totalRestSec, upsertTitleNote, triggerNotionSync]);

  // Global keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      
      if (e.key.toLowerCase() === 'n') {
        setNotesOpen(prev => !prev);
      }
      if (e.key.toLowerCase() === 'f') {
        setFocusMode(prev => !prev);
      }
      if (e.key === 'Escape') {
        setFocusMode(false);
        setNotesOpen(false);
        setSettingsOpen(false);
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setSettingsOpen]);

  return (
    <div className={`min-h-screen bg-background text-foreground selection:bg-accent/30 flex flex-col items-center transition-all duration-500 ${focusMode ? 'justify-center py-0' : ''}`}>
      <div className={`w-full px-4 sm:px-6 lg:px-8 pb-12 transition-all duration-500 ${focusMode ? 'max-w-2xl' : 'max-w-5xl'}`}>
        {!focusMode && (
          <>
            <Header 
              today={today} 
              totalLearnSec={totalLearnSec} 
              totalRestSec={totalRestSec} 
              onOpenNotes={() => setNotesOpen(true)}
              notionSyncState={syncState}
              onNotionSync={handleManualSync}
              onNotionOpenSettings={() => setSettingsOpen(true)}
            />
            <DailyStats totalLearnSec={totalLearnSec} totalRestSec={totalRestSec} />
          </>
        )}

        <main className={`grid gap-8 mt-4 ${focusMode ? 'grid-cols-1' : 'grid-cols-1 lg:grid-cols-2'}`}>
          <LearningCard
            topicToday={topicToday}
            totalTodaySec={totalLearnSec}
            onStartWithTitle={handleStartWithTitle}
            onLearnDone={handleLearnDone}
            onLearnStop={handleLearnStop}
          />
          
          {!focusMode && (
            <RestCardContainer
              topicToday={topicToday}
              totalTodaySec={totalRestSec}
              onRestDone={handleRestDone}
              onRestStop={handleRestStop}
              onYTDone={handleYTDone}
              onYTStop={handleYTStop}
            />
          )}
        </main>
        
        {focusMode && (
          <div className="text-center mt-8 text-text-muted text-sm opacity-50 animate-pulse">
            Press <kbd className="px-2 py-1 bg-surface rounded font-mono text-xs mx-1">F</kbd> or <kbd className="px-2 py-1 bg-surface rounded font-mono text-xs mx-1">Esc</kbd> to exit focus mode
          </div>
        )}
      </div>

      <Modal open={notesOpen} onClose={() => setNotesOpen(false)} title="Daily Notes & Logs">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <NotesPanel initialDay={today} />
          <MarkdownScratchpad />
        </div>
      </Modal>

      {/* Notion Settings Modal */}
      <NotionSettingsModal
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        syncState={syncState}
        onValidate={validate}
        onDisconnect={disconnect}
        onPull={handlePull}
      />
    </div>
  );
}
