"use client";

import { useState, useEffect, useCallback } from "react";
import { dayKey } from "@/lib/time";
import { readNumber, writeNumber, readString, writeString } from "@/lib/storage";
import { KEYS } from "@/lib/constants";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { useDailyNotes } from "@/hooks/useDailyNotes";
import { useNotionSync } from "@/hooks/useNotionSync";
import { useTasks } from "@/hooks/useTasks";
import { CozyAnimeTheme } from "@/types/theme";
import { DEFAULT_THEME } from "@/lib/themeConfig";
import { AmbientBackground } from "./anime/AmbientBackground";
import { Header } from "./layout/Header";
import { MobileNav, MobileTab } from "./layout/MobileNav";
import { DailyStats } from "./stats/DailyStats";
import { WeeklyHeatmap } from "./stats/WeeklyHeatmap";
import { LearningCard } from "./timer/LearningCard";
import { RestCardContainer } from "./timer/RestCardContainer";
import { TaskQueue } from "./tasks/TaskQueue";
import { Modal } from "./ui/Modal";
import { NotesPanel } from "./notes/NotesPanel";
import { MarkdownScratchpad } from "./notes/MarkdownScratchpad";
import { NotionSettingsModal } from "./notion/NotionSettingsModal";

export default function YouTubeRestTimer() {
  const [today] = useState<string>(() => dayKey());
  const [topicToday, setTopicToday] = useState<string>(() => {
    return readString(KEYS.topicByDay(dayKey())) || "";
  });
  const [totalLearnSec, setTotalLearnSec] = useState<number>(() => {
    return readNumber(KEYS.learnByDay(dayKey())) || 0;
  });
  const [totalRestSec, setTotalRestSec] = useState<number>(() => {
    return readNumber(KEYS.restByDay(dayKey())) || readNumber(KEYS.legacyBreakByDay(dayKey())) || 0;
  });
  const [topicLearnSec, setTopicLearnSec] = useState<number>(() => {
    const d = dayKey();
    const active = readString(KEYS.topicByDay(d)) || "";
    return readNumber(KEYS.learnByDayAndTopic(d, active)) || 0;
  });
  const [topicRestSec, setTopicRestSec] = useState<number>(() => {
    const d = dayKey();
    const active = readString(KEYS.topicByDay(d)) || "";
    return readNumber(KEYS.restByDayAndTopic(d, active)) || 0;
  });
  const [pomodoroRounds, setPomodoroRounds] = useState<number>(() => {
    return readNumber(KEYS.pomodoroRoundsByDay(dayKey())) || 0;
  });

  const [initialBreakMin, setInitialBreakMin] = useState<number>(5);
  const [notesOpen, setNotesOpen] = useState(false);
  const [focusMode, setFocusMode] = useState(false);
  const [mobileTab, setMobileTab] = useState<MobileTab>("focus");

  // ── Cozy Anime Theme System (Default: Night Study) ──
  const [currentTheme, setCurrentTheme] = useLocalStorage<CozyAnimeTheme>(
    KEYS.theme,
    DEFAULT_THEME
  );

  // Apply presentation-only theme state to the document root.
  useEffect(() => {
    const validTheme =
      currentTheme === "rainy-evening" || currentTheme === "sunset-study"
        ? currentTheme
        : "night-study";
    document.documentElement.dataset.theme = validTheme;
  }, [currentTheme]);

  const { upsertTitleNote, getNotes } = useDailyNotes(today);
  const {
    tasks,
    activeTaskId,
    setActiveTaskId,
    addTask,
    toggleTask,
    deleteTask,
    incrementTaskPomodoro,
  } = useTasks(today);

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
    const scratchpad =
      typeof window !== "undefined"
        ? window.localStorage.getItem("ytdoro:scratchpad") || ""
        : "";
    return {
      day: today,
      topic: topicToday,
      learnSec: topicLearnSec,
      restSec: topicRestSec,
      notes: getNotes(),
      scratchpad,
    };
  }, [today, topicToday, topicLearnSec, topicRestSec, getNotes]);

  // Auto-sync trigger
  const triggerNotionSync = useCallback(() => {
    if (!syncState.connected || !today) return;
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

      if (data.learnSec !== undefined) {
        const localTopicKey = KEYS.learnByDayAndTopic(today, topicToday);
        const prevTopicVal = readNumber(localTopicKey) || 0;
        setTopicLearnSec(data.learnSec);
        writeNumber(localTopicKey, data.learnSec);

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

  const handleStartWithTitle = useCallback(
    (title: string) => {
      const t = title.trim() || "(Untitled)";
      writeString(KEYS.topicByDay(today), t);
      setTopicToday(t);

      const newTopicLearn = readNumber(KEYS.learnByDayAndTopic(today, t)) || 0;
      const newTopicRest = readNumber(KEYS.restByDayAndTopic(today, t)) || 0;
      setTopicLearnSec(newTopicLearn);
      setTopicRestSec(newTopicRest);

      upsertTitleNote({ kind: "learn_start", title: t, addLearn: 0, addRest: 0 });
      triggerNotionSync();
    },
    [today, upsertTitleNote, triggerNotionSync]
  );

  const handleLearnDone = useCallback(
    (sec: number) => {
      const nextDaily = totalLearnSec + sec;
      setTotalLearnSec(nextDaily);
      writeNumber(KEYS.learnByDay(today), nextDaily);

      const nextTopic = topicLearnSec + sec;
      setTopicLearnSec(nextTopic);
      writeNumber(KEYS.learnByDayAndTopic(today, topicToday), nextTopic);

      const nextRounds = pomodoroRounds + 1;
      setPomodoroRounds(nextRounds);
      writeNumber(KEYS.pomodoroRoundsByDay(today), nextRounds);

      incrementTaskPomodoro(activeTaskId || topicToday);

      upsertTitleNote({ kind: "learn_done", title: topicToday, addLearn: sec, addRest: 0 });
      triggerNotionSync();
    },
    [
      today,
      topicToday,
      totalLearnSec,
      topicLearnSec,
      pomodoroRounds,
      activeTaskId,
      incrementTaskPomodoro,
      upsertTitleNote,
      triggerNotionSync,
    ]
  );

  const handleLearnStop = useCallback(
    (sec: number) => {
      const nextDaily = totalLearnSec + sec;
      setTotalLearnSec(nextDaily);
      writeNumber(KEYS.learnByDay(today), nextDaily);

      const nextTopic = topicLearnSec + sec;
      setTopicLearnSec(nextTopic);
      writeNumber(KEYS.learnByDayAndTopic(today, topicToday), nextTopic);

      upsertTitleNote({ kind: "learn_stop", title: topicToday, addLearn: sec, addRest: 0 });
      triggerNotionSync();
    },
    [today, topicToday, totalLearnSec, topicLearnSec, upsertTitleNote, triggerNotionSync]
  );

  const handleRestDone = useCallback(
    (sec: number) => {
      const nextDaily = totalRestSec + sec;
      setTotalRestSec(nextDaily);
      writeNumber(KEYS.restByDay(today), nextDaily);

      const nextTopic = topicRestSec + sec;
      setTopicRestSec(nextTopic);
      writeNumber(KEYS.restByDayAndTopic(today, topicToday), nextTopic);

      upsertTitleNote({ kind: "rest_done", title: topicToday, addLearn: 0, addRest: sec });
      triggerNotionSync();
    },
    [today, topicToday, totalRestSec, topicRestSec, upsertTitleNote, triggerNotionSync]
  );

  const handleRestStop = useCallback(
    (sec: number) => {
      const nextDaily = totalRestSec + sec;
      setTotalRestSec(nextDaily);
      writeNumber(KEYS.restByDay(today), nextDaily);

      const nextTopic = topicRestSec + sec;
      setTopicRestSec(nextTopic);
      writeNumber(KEYS.restByDayAndTopic(today, topicToday), nextTopic);

      upsertTitleNote({ kind: "rest_stop", title: topicToday, addLearn: 0, addRest: sec });
      triggerNotionSync();
    },
    [today, topicToday, totalRestSec, topicRestSec, upsertTitleNote, triggerNotionSync]
  );

  const handleYTDone = useCallback(
    (sec: number) => {
      const nextDaily = totalRestSec + sec;
      setTotalRestSec(nextDaily);
      writeNumber(KEYS.restByDay(today), nextDaily);

      const nextTopic = topicRestSec + sec;
      setTopicRestSec(nextTopic);
      writeNumber(KEYS.restByDayAndTopic(today, topicToday), nextTopic);

      upsertTitleNote({ kind: "yt_rest_done", title: topicToday, addLearn: 0, addRest: sec });
      triggerNotionSync();
    },
    [today, topicToday, totalRestSec, topicRestSec, upsertTitleNote, triggerNotionSync]
  );

  const handleYTStop = useCallback(
    (sec: number) => {
      const nextDaily = totalRestSec + sec;
      setTotalRestSec(nextDaily);
      writeNumber(KEYS.restByDay(today), nextDaily);

      const nextTopic = topicRestSec + sec;
      setTopicRestSec(nextTopic);
      writeNumber(KEYS.restByDayAndTopic(today, topicToday), nextTopic);

      upsertTitleNote({ kind: "yt_rest_stop", title: topicToday, addLearn: 0, addRest: sec });
      triggerNotionSync();
    },
    [today, topicToday, totalRestSec, topicRestSec, upsertTitleNote, triggerNotionSync]
  );

  const handleResetCycle = useCallback(() => {
    setPomodoroRounds(0);
    if (today) {
      writeNumber(KEYS.pomodoroRoundsByDay(today), 0);
    }
  }, [today]);

  const handleSelectLongBreak = useCallback(() => {
    setInitialBreakMin(15);
  }, []);

  const handleTaskSelected = useCallback(
    (task: { id: string; text: string }) => {
      setActiveTaskId(task.id);
      handleStartWithTitle(task.text);
    },
    [setActiveTaskId, handleStartWithTitle]
  );

  // Global keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      if (e.key.toLowerCase() === "n") {
        setNotesOpen((prev) => !prev);
      }
      if (e.key.toLowerCase() === "f") {
        setFocusMode((prev) => !prev);
      }
      if (e.key === "Escape") {
        setFocusMode(false);
        setNotesOpen(false);
        setSettingsOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [setSettingsOpen]);

  return (
    <div
      className={`relative flex min-h-screen w-full flex-col items-center overflow-x-hidden text-foreground selection:bg-accent/30 transition-all duration-400 ${
        focusMode ? "justify-center py-0" : ""
      }`}
    >
      {/* ── Layer 1, 2, 3: Environment Artwork, Ambience & Readability Overlay ── */}
      <AmbientBackground theme={currentTheme} />

      {/* ── Layer 4: Application Shell & Workspace ── */}
      <div
        className={`relative z-10 w-full px-4 pb-24 transition-all duration-400 sm:px-6 md:pb-14 lg:px-8 ${
          focusMode ? "max-w-2xl" : "max-w-[1440px]"
        }`}
      >
        {!focusMode && (
          <Header
            today={today}
            totalLearnSec={totalLearnSec}
            totalRestSec={totalRestSec}
            currentTheme={currentTheme}
            onSelectTheme={setCurrentTheme}
            onOpenNotes={() => setNotesOpen(true)}
            notionSyncState={syncState}
            onNotionSync={handleManualSync}
            onNotionOpenSettings={() => setSettingsOpen(true)}
          />
        )}

        {/* ── Adaptive responsive composition: one React tree instance ── */}
        {!focusMode ? (
          <div className="workspace-grid items-start pt-5 md:pt-6">
            <aside
              id="stats"
              aria-label="Today’s progress"
              className={`workspace-zone workspace-zone--stats min-w-0 space-y-4 ${
                mobileTab === "stats" ? "block" : "hidden md:block"
              }`}
            >
              <DailyStats
                totalLearnSec={totalLearnSec}
                totalRestSec={totalRestSec}
                pomodoroRounds={pomodoroRounds}
                today={today}
              />
            </aside>

            <main
              id="focus"
              aria-label="Focus workspace"
              className={`workspace-zone workspace-zone--focus min-w-0 space-y-4 ${
                mobileTab === "focus" ? "block" : "hidden md:block"
              }`}
            >
              <LearningCard
                topicToday={topicToday}
                totalTodaySec={topicLearnSec}
                pomodoroRounds={pomodoroRounds}
                tasks={tasks}
                activeTaskId={activeTaskId}
                hideEmbeddedTasks={true}
                onSelectTask={handleTaskSelected}
                onAddTask={addTask}
                onToggleTask={toggleTask}
                onDeleteTask={deleteTask}
                onResetCycle={handleResetCycle}
                onSelectLongBreak={handleSelectLongBreak}
                onStartWithTitle={handleStartWithTitle}
                onLearnDone={handleLearnDone}
                onLearnStop={handleLearnStop}
              />

              <RestCardContainer
                totalTodaySec={topicRestSec}
                initialBreakMin={initialBreakMin}
                onRestDone={handleRestDone}
                onRestStop={handleRestStop}
                onYTDone={handleYTDone}
                onYTStop={handleYTStop}
              />
            </main>

            <aside
              id="tasks"
              aria-label="Task queue"
              className={`workspace-zone workspace-zone--tasks min-w-0 space-y-4 ${
                mobileTab === "tasks" ? "block" : "hidden md:block"
              }`}
            >
              <TaskQueue
                tasks={tasks}
                activeTaskId={activeTaskId}
                currentTopic={topicToday}
                onSelectTask={handleTaskSelected}
                onAddTask={addTask}
                onToggleTask={toggleTask}
                onDeleteTask={deleteTask}
              />
            </aside>

            <section
              id="activity"
              aria-label="Focus activity"
              className={`workspace-zone workspace-zone--activity min-w-0 pt-1 ${
                mobileTab === "stats" ? "block" : "hidden md:block"
              }`}
            >
              <WeeklyHeatmap />
            </section>
          </div>
        ) : (
          <div className="w-full space-y-5 pt-6">
            <LearningCard
              topicToday={topicToday}
              totalTodaySec={topicLearnSec}
              pomodoroRounds={pomodoroRounds}
              tasks={tasks}
              activeTaskId={activeTaskId}
              hideEmbeddedTasks={true}
              onSelectTask={handleTaskSelected}
              onAddTask={addTask}
              onToggleTask={toggleTask}
              onDeleteTask={deleteTask}
              onResetCycle={handleResetCycle}
              onSelectLongBreak={handleSelectLongBreak}
              onStartWithTitle={handleStartWithTitle}
              onLearnDone={handleLearnDone}
              onLearnStop={handleLearnStop}
            />
            <div className="text-center text-xs text-text-muted">
              Press <kbd className="px-2 py-1 bg-surface-secondary rounded font-mono text-xs mx-1">F</kbd> or{" "}
              <kbd className="px-2 py-1 bg-surface-secondary rounded font-mono text-xs mx-1">Esc</kbd> to exit focus mode
            </div>
          </div>
        )}
      </div>

      {/* ── Mobile Bottom Navigation Bar (Mobile only) ── */}
      {!focusMode && (
        <MobileNav
          activeTab={mobileTab}
          onSelectTab={setMobileTab}
          onOpenNotes={() => setNotesOpen(true)}
        />
      )}

      {/* ── Modals & Drawers ── */}
      <Modal open={notesOpen} onClose={() => setNotesOpen(false)} title="Daily Notes & Scratchpad">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <NotesPanel initialDay={today} />
          <MarkdownScratchpad />
        </div>
      </Modal>

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
