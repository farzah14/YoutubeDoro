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
  const [totalLearnSec, setTotalLearnSec] = useState<number>(0); // daily total
  const [totalRestSec, setTotalRestSec] = useState<number>(0);   // daily total
  const [topicLearnSec, setTopicLearnSec] = useState<number>(0); // topic-specific total
  const [topicRestSec, setTopicRestSec] = useState<number>(0);   // topic-specific total
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
      learnSec: topicLearnSec, // Send topic-specific focus time
      restSec: topicRestSec,   // Send topic-specific rest time
      notes: getNotes(),       // notes will be filtered on the backend by topic
      scratchpad,
    };
  }, [today, topicToday, topicLearnSec, topicRestSec, getNotes]);

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
    const result = await pullFromNotion(today, topicToday);
    if (result?.success && result?.data) {
      const data = result.data;
      
      // Update topic-specific state and localStorage
      if (data.learnSec !== undefined) {
        const localTopicKey = KEYS.learnByDayAndTopic(today, topicToday);
        const prevTopicVal = readNumber(localTopicKey) || 0;
        setTopicLearnSec(data.learnSec);
        writeNumber(localTopicKey, data.learnSec);
        
        // Adjust the daily total by the difference
        const diff = data.learnSec - prevTopicVal;
        if (diff !== 0) {
          const nextDaily = Math.max(0, totalLearnSec + diff);
          setTotalLearnSec(nextDaily);
          writeNumber(KEYS.learnByDay(today), nextDaily);
        }
      }
      
      if (data.restSec !== undefined) {
        const localTopicKey = KEYS.restByDayAndTopic(today, topicToday);
        const prevTopicVal = readNumber(localTopicKey) || 0;
        setTopicRestSec(data.restSec);
        writeNumber(localTopicKey, data.restSec);
        
        const diff = data.restSec - prevTopicVal;
        if (diff !== 0) {
          const nextDaily = Math.max(0, totalRestSec + diff);
          setTotalRestSec(nextDaily);
          writeNumber(KEYS.restByDay(today), nextDaily);
        }
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
  }, [today, topicToday, totalLearnSec, totalRestSec, pullFromNotion]);

  useEffect(() => {
    const d = dayKey();
    setToday(d);
    
    // Load daily totals
    setTotalLearnSec(readNumber(KEYS.learnByDay(d)));
    setTotalRestSec(readNumber(KEYS.restByDay(d)) || readNumber(KEYS.legacyBreakByDay(d)));
    
    // Load active topic
    const activeTopic = readString(KEYS.topicByDay(d));
    setTopicToday(activeTopic);

    // Load active topic totals
    setTopicLearnSec(readNumber(KEYS.learnByDayAndTopic(d, activeTopic)) || 0);
    setTopicRestSec(readNumber(KEYS.restByDayAndTopic(d, activeTopic)) || 0);
  }, []);

  const handleStartWithTitle = useCallback((title: string) => {
    const t = title.trim() || "(Untitled)";
    writeString(KEYS.topicByDay(today), t);
    setTopicToday(t);

    // Load topic-specific times from localStorage
    const newTopicLearn = readNumber(KEYS.learnByDayAndTopic(today, t)) || 0;
    const newTopicRest = readNumber(KEYS.restByDayAndTopic(today, t)) || 0;
    setTopicLearnSec(newTopicLearn);
    setTopicRestSec(newTopicRest);

    upsertTitleNote({ kind: "learn_start", title: t, addLearn: 0, addRest: 0 });
    triggerNotionSync();
  }, [today, upsertTitleNote, triggerNotionSync]);

  const handleLearnDone = useCallback((sec: number) => {
    // 1. Update daily total
    const nextDaily = totalLearnSec + sec;
    setTotalLearnSec(nextDaily);
    writeNumber(KEYS.learnByDay(today), nextDaily);

    // 2. Update topic total
    const nextTopic = topicLearnSec + sec;
    setTopicLearnSec(nextTopic);
    writeNumber(KEYS.learnByDayAndTopic(today, topicToday), nextTopic);

    upsertTitleNote({ kind: "learn_done", title: topicToday, addLearn: sec, addRest: 0 });
    triggerNotionSync();
  }, [today, topicToday, totalLearnSec, topicLearnSec, upsertTitleNote, triggerNotionSync]);

  const handleLearnStop = useCallback((sec: number) => {
    // 1. Update daily total
    const nextDaily = totalLearnSec + sec;
    setTotalLearnSec(nextDaily);
    writeNumber(KEYS.learnByDay(today), nextDaily);

    // 2. Update topic total
    const nextTopic = topicLearnSec + sec;
    setTopicLearnSec(nextTopic);
    writeNumber(KEYS.learnByDayAndTopic(today, topicToday), nextTopic);

    upsertTitleNote({ kind: "learn_stop", title: topicToday, addLearn: sec, addRest: 0 });
    triggerNotionSync();
  }, [today, topicToday, totalLearnSec, topicLearnSec, upsertTitleNote, triggerNotionSync]);

  const handleRestDone = useCallback((sec: number) => {
    // 1. Update daily total
    const nextDaily = totalRestSec + sec;
    setTotalRestSec(nextDaily);
    writeNumber(KEYS.restByDay(today), nextDaily);

    // 2. Update topic total
    const nextTopic = topicRestSec + sec;
    setTopicRestSec(nextTopic);
    writeNumber(KEYS.restByDayAndTopic(today, topicToday), nextTopic);

    upsertTitleNote({ kind: "rest_done", title: topicToday, addLearn: 0, addRest: sec });
    triggerNotionSync();
  }, [today, topicToday, totalRestSec, topicRestSec, upsertTitleNote, triggerNotionSync]);

  const handleRestStop = useCallback((sec: number) => {
    // 1. Update daily total
    const nextDaily = totalRestSec + sec;
    setTotalRestSec(nextDaily);
    writeNumber(KEYS.restByDay(today), nextDaily);

    // 2. Update topic total
    const nextTopic = topicRestSec + sec;
    setTopicRestSec(nextTopic);
    writeNumber(KEYS.restByDayAndTopic(today, topicToday), nextTopic);

    upsertTitleNote({ kind: "rest_stop", title: topicToday, addLearn: 0, addRest: sec });
    triggerNotionSync();
  }, [today, topicToday, totalRestSec, topicRestSec, upsertTitleNote, triggerNotionSync]);

  const handleYTDone = useCallback((sec: number) => {
    // 1. Update daily total
    const nextDaily = totalRestSec + sec;
    setTotalRestSec(nextDaily);
    writeNumber(KEYS.restByDay(today), nextDaily);

    // 2. Update topic total
    const nextTopic = topicRestSec + sec;
    setTopicRestSec(nextTopic);
    writeNumber(KEYS.restByDayAndTopic(today, topicToday), nextTopic);

    upsertTitleNote({ kind: "yt_rest_done", title: topicToday, addLearn: 0, addRest: sec });
    triggerNotionSync();
  }, [today, topicToday, totalRestSec, topicRestSec, upsertTitleNote, triggerNotionSync]);

  const handleYTStop = useCallback((sec: number) => {
    // 1. Update daily total
    const nextDaily = totalRestSec + sec;
    setTotalRestSec(nextDaily);
    writeNumber(KEYS.restByDay(today), nextDaily);

    // 2. Update topic total
    const nextTopic = topicRestSec + sec;
    setTopicRestSec(nextTopic);
    writeNumber(KEYS.restByDayAndTopic(today, topicToday), nextTopic);

    upsertTitleNote({ kind: "yt_rest_stop", title: topicToday, addLearn: 0, addRest: sec });
    triggerNotionSync();
  }, [today, topicToday, totalRestSec, topicRestSec, upsertTitleNote, triggerNotionSync]);

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
            totalTodaySec={topicLearnSec}
            onStartWithTitle={handleStartWithTitle}
            onLearnDone={handleLearnDone}
            onLearnStop={handleLearnStop}
          />
          
          {!focusMode && (
            <RestCardContainer
              topicToday={topicToday}
              totalTodaySec={topicRestSec}
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
