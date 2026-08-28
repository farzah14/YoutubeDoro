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
import type { ThemeSlot, WorkspaceMode, WorkspacePanel } from "@/types/workspace";
import { COZY_THEMES, DEFAULT_THEME, THEME_ORDER } from "@/lib/themeConfig";
import { AmbientBackground } from "./anime/AmbientBackground";
import { Header } from "./layout/Header";
import { HomeHero } from "./layout/HomeHero";
import { WorkspaceDock } from "./layout/WorkspaceDock";
import { DailyStats } from "./stats/DailyStats";
import { WeeklyHeatmap } from "./stats/WeeklyHeatmap";
import { LearningCard } from "./timer/LearningCard";
import { TaskQueue } from "./tasks/TaskQueue";
import { SubtaskPanel } from "./tasks/SubtaskPanel";
import { RestCardContainer } from "./timer/RestCardContainer";
import { Modal } from "./ui/Modal";
import { NotesPanel } from "./notes/NotesPanel";
import { MarkdownScratchpad } from "./notes/MarkdownScratchpad";
import { NotionSettingsModal } from "./notion/NotionSettingsModal";
import { LoFiPlayer, MusicEngine } from "./audio/LoFiPlayer";
import { getQuoteForDate } from "@/lib/quotes";
import { SettingsPanel } from "./settings/SettingsPanel";

export default function YouTubeRestTimer() {
  const [today] = useState<string>(() => dayKey());
  const [topicToday, setTopicToday] = useState<string>("");
  const [totalLearnSec, setTotalLearnSec] = useState<number>(0);
  const [totalRestSec, setTotalRestSec] = useState<number>(0);
  const [topicLearnSec, setTopicLearnSec] = useState<number>(0);
  const [topicRestSec, setTopicRestSec] = useState<number>(0);
  const [pomodoroRounds, setPomodoroRounds] = useState<number>(0);

  const [workspaceMode, setWorkspaceMode] = useState<WorkspaceMode>("home");
  const [activeThemeSlot, setActiveThemeSlot] = useState<ThemeSlot>("home");
  const [openPanel, setOpenPanel] = useState<WorkspacePanel | null>(null);
  const [focusRunning, setFocusRunning] = useState(false);
  const [clearMode, setClearMode] = useLocalStorage(KEYS.clearMode, false);
  const isHomeMode = workspaceMode === "home";

  useEffect(() => {
    if (!clearMode) return;
    const reveal = () => setClearMode(false);
    window.addEventListener("pointermove", reveal, { once: true });
    window.addEventListener("focusin", reveal, { once: true });
    return () => {
      window.removeEventListener("pointermove", reveal);
      window.removeEventListener("focusin", reveal);
    };
  }, [clearMode, setClearMode]);

  const closeWorkspacePanel = useCallback(() => {
    setOpenPanel(null);
  }, []);

  const toggleWorkspacePanel = useCallback((panel: WorkspacePanel) => {
    setOpenPanel((current) => (current === panel ? null : panel));
  }, []);

  const handleModeChange = useCallback((mode: WorkspaceMode) => {
    setWorkspaceMode(mode);
    setActiveThemeSlot(mode);
  }, []);

  // Browser storage is hydrated after the server/client markup has matched.
  useEffect(() => {
    const activeTopic = readString(KEYS.topicByDay(today)) || "";

    /* eslint-disable react-hooks/set-state-in-effect */
    setTopicToday(activeTopic);
    setTotalLearnSec(readNumber(KEYS.learnByDay(today)) || 0);
    setTotalRestSec(
      readNumber(KEYS.restByDay(today)) || readNumber(KEYS.legacyBreakByDay(today)) || 0
    );
    setTopicLearnSec(readNumber(KEYS.learnByDayAndTopic(today, activeTopic)) || 0);
    setTopicRestSec(readNumber(KEYS.restByDayAndTopic(today, activeTopic)) || 0);
    setPomodoroRounds(readNumber(KEYS.pomodoroRoundsByDay(today)) || 0);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [today]);

  // ── Cozy Anime Theme System (Default: Night Study) ──
  const [legacyTheme, setLegacyTheme] = useLocalStorage<CozyAnimeTheme>(
    KEYS.theme,
    DEFAULT_THEME
  );
  const [homeTheme, setHomeTheme] = useLocalStorage<CozyAnimeTheme>(
    KEYS.themeBySlot("home"),
    legacyTheme
  );
  const [focusTheme, setFocusTheme] = useLocalStorage<CozyAnimeTheme>(
    KEYS.themeBySlot("focus"),
    DEFAULT_THEME
  );
  const [customThemeIds, setCustomThemeIds] = useLocalStorage<Record<ThemeSlot, string | null>>(
    KEYS.themeSlots,
    { home: null, focus: null }
  );
  const [themeOverlays, setThemeOverlays] = useLocalStorage<Record<ThemeSlot, number>>(
    KEYS.themeSlots + ":overlay",
    { home: 42, focus: 42 }
  );
  const [use24Hour, setUse24Hour] = useLocalStorage(KEYS.clock24Hour, false);
  const [showSeconds, setShowSeconds] = useLocalStorage(KEYS.clockShowSeconds, false);
  const [showQuote, setShowQuote] = useLocalStorage(KEYS.showQuote, true);
  const [dashboardName] = useLocalStorage(KEYS.dashboardName, "");
  const [greetingStyle] = useLocalStorage<"dynamic" | "generic" | "hidden">(
    KEYS.greetingStyle,
    "dynamic"
  );

  const normalizeTheme = useCallback((theme: CozyAnimeTheme): CozyAnimeTheme => {
    return THEME_ORDER.includes(theme) ? theme : DEFAULT_THEME;
  }, []);
  const themePreferences = {
    home: normalizeTheme(homeTheme),
    focus: normalizeTheme(focusTheme),
  };
  const activeTheme = workspaceMode === "focus" ? themePreferences.focus : themePreferences.home;
  const handleThemeSlotChange = useCallback(
    (slot: ThemeSlot, theme: CozyAnimeTheme) => {
      if (slot === "home") {
        setLegacyTheme(theme);
        setHomeTheme(theme);
      } else {
        setFocusTheme(theme);
      }
      setCustomThemeIds((current) => ({ ...current, [slot]: null }));
    },
    [setCustomThemeIds, setFocusTheme, setHomeTheme, setLegacyTheme]
  );
  const { upsertTitleNote, getNotes } = useDailyNotes(today);
  const {
    tasks,
    activeTaskId,
    activeTask,
    setActiveTaskId,
    addTask,
    toggleTask,
    deleteTask,
    recordTaskFocus,
    reorderTasks,
    moveTask,
    updateTask,
    addSubtask,
    toggleSubtask,
    deleteSubtask,
    resetTasks,
  } = useTasks(today);

  // ── Notion Integration ──
  const {
    syncState,
    settingsOpen,
    setSettingsOpen,
    validate,
    disconnect,
    syncDebounced,
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

      recordTaskFocus(activeTaskId || topicToday, sec, true);

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
      recordTaskFocus,
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

      recordTaskFocus(activeTaskId || topicToday, sec);

      upsertTitleNote({ kind: "learn_stop", title: topicToday, addLearn: sec, addRest: 0 });
      triggerNotionSync();
    },
    [activeTaskId, recordTaskFocus, today, topicToday, totalLearnSec, topicLearnSec, upsertTitleNote, triggerNotionSync]
  );

  const logBreak = useCallback((sec: number, kind: "rest_done" | "rest_stop" | "yt_rest_done" | "yt_rest_stop") => {
    const nextDaily = totalRestSec + sec;
    const nextTopic = topicRestSec + sec;
    setTotalRestSec(nextDaily);
    setTopicRestSec(nextTopic);
    writeNumber(KEYS.restByDay(today), nextDaily);
    writeNumber(KEYS.restByDayAndTopic(today, topicToday), nextTopic);
    upsertTitleNote({ kind, title: topicToday, addLearn: 0, addRest: sec });
    triggerNotionSync();
  }, [today, topicToday, topicRestSec, totalRestSec, triggerNotionSync, upsertTitleNote]);

  const handleBreakDone = useCallback((sec: number) => logBreak(sec, "rest_done"), [logBreak]);
  const handleBreakStop = useCallback((sec: number) => logBreak(sec, "rest_stop"), [logBreak]);

  const handleYouTubeRest = useCallback((sec: number, kind: "yt_rest_done" | "yt_rest_stop") => logBreak(sec, kind), [logBreak]);

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
        toggleWorkspacePanel("notes");
      }
      if (e.key.toLowerCase() === "f") {
        handleModeChange(workspaceMode === "focus" ? "home" : "focus");
      }
      if (e.key === "Escape") {
        if (openPanel) {
          closeWorkspacePanel();
        } else if (workspaceMode !== "home") {
          handleModeChange("home");
        } else {
          setSettingsOpen(false);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [closeWorkspacePanel, handleModeChange, openPanel, setSettingsOpen, toggleWorkspacePanel, workspaceMode]);

  const handleFullscreen = useCallback(() => {
    if (document.fullscreenElement) {
      void document.exitFullscreen();
    } else {
      void document.documentElement.requestFullscreen();
    }
  }, []);

  return (
    <div
      className={`workspace-shell workspace-mode--${workspaceMode} ${clearMode ? "workspace-clear-mode" : ""} relative flex h-[100dvh] w-full flex-col overflow-hidden text-foreground selection:bg-accent/30`}
    >
      {/* ── Layer 1, 2, 3: Environment Artwork, Ambience & Readability Overlay ── */}
      <AmbientBackground key={customThemeIds[workspaceMode] ?? "built-in"} theme={activeTheme} customThemeId={customThemeIds[workspaceMode]} overlay={themeOverlays[workspaceMode]} />

      {/* ── Layer 4: Application Shell & Workspace ── */}
      <div
        className="workspace-scene relative z-10 flex min-h-0 flex-1 flex-col px-5 py-5 sm:px-8 sm:py-7"
      >
        <Header quote={getQuoteForDate(today)} showQuote={showQuote} />

        <HomeHero
          hidden={!isHomeMode}
          use24Hour={use24Hour}
          showSeconds={showSeconds}
          name={dashboardName}
          greetingStyle={greetingStyle}
        />

        {!isHomeMode && (
        <div className="workspace-stage no-scrollbar space-y-5">
          <main
            id="focus"
            aria-label="Focus workspace"
            className={`workspace-stage__focus workspace-stage__focus--${workspaceMode} min-w-0 space-y-4`}
          >
            <LearningCard
              topicToday={topicToday}
              totalTodaySec={topicLearnSec}
              pipBackgroundUrl={COZY_THEMES[activeTheme].backgroundUrl}
              onRunningChange={setFocusRunning}
              tasks={tasks}
              activeTaskId={activeTaskId}
              onOpenTasks={() => toggleWorkspacePanel("tasks")}
              onStartWithTitle={handleStartWithTitle}
              onLearnDone={handleLearnDone}
              onLearnStop={handleLearnStop}
              onBreakDone={handleBreakDone}
              onBreakStop={handleBreakStop}
            />
          </main>
        </div>
        )}
      </div>

      <WorkspaceDock
        mode={workspaceMode}
        openPanel={openPanel}
        onModeChange={handleModeChange}
        onPanelToggle={toggleWorkspacePanel}
        timerRunning={focusRunning}
        onFullscreen={handleFullscreen}
      />
      <MusicEngine />

      {/* ── Modals & Drawers ── */}
      <Modal open={openPanel === "notes"} onClose={closeWorkspacePanel} title="Priority Notebook" className="notes-modal">
        <div className="notes-workspace">
          <NotesPanel initialDay={today} tasks={tasks} activeTaskId={activeTaskId} />
          <MarkdownScratchpad />
        </div>
      </Modal>

      <Modal open={openPanel === "rest"} onClose={closeWorkspacePanel} title="YouTube Rest">
        <RestCardContainer totalTodaySec={totalRestSec} onRestDone={handleBreakDone} onRestStop={handleBreakStop} onYTDone={(sec) => handleYouTubeRest(sec, "yt_rest_done")} onYTStop={(sec) => handleYouTubeRest(sec, "yt_rest_stop")} />
      </Modal>

      <Modal open={openPanel === "tasks"} onClose={closeWorkspacePanel} title="Focus Priorities" className="priorities-modal">
        <TaskQueue
          tasks={tasks}
          activeTaskId={activeTaskId}
          currentTopic={topicToday}
          onSelectTask={handleTaskSelected}
          onAddTask={addTask}
          onToggleTask={toggleTask}
          onDeleteTask={deleteTask}
          onReorderTasks={reorderTasks}
          onMoveTask={moveTask}
          onUpdateTask={updateTask}
          onResetTasks={resetTasks}
        />
      </Modal>

      <Modal open={openPanel === "subtasks"} onClose={closeWorkspacePanel} title="Sub-tasks" className="audio-overlay">
        <SubtaskPanel
          activeTask={activeTask}
          onAddSubtask={addSubtask}
          onToggleSubtask={toggleSubtask}
          onDeleteSubtask={deleteSubtask}
          onOpenTasks={() => setOpenPanel("tasks")}
        />
      </Modal>

      <Modal open={openPanel === "music"} onClose={closeWorkspacePanel} title="Music" className="audio-overlay">
        <LoFiPlayer />
      </Modal>

      <Modal open={openPanel === "stats"} onClose={closeWorkspacePanel} title="Focus stats">
        <div className="space-y-4">
          <DailyStats
            totalLearnSec={totalLearnSec}
            totalRestSec={totalRestSec}
            pomodoroRounds={pomodoroRounds}
            today={today}
          />
          <WeeklyHeatmap />
        </div>
      </Modal>

      <SettingsPanel
        open={openPanel === "settings"}
        onClose={closeWorkspacePanel}
        activeThemeSlot={activeThemeSlot}
        onThemeSlotChange={setActiveThemeSlot}
        themePreferences={themePreferences}
        onThemeChange={(theme) => handleThemeSlotChange(activeThemeSlot, theme)}
        customThemeIds={customThemeIds}
        onCustomThemeChange={(id) => setCustomThemeIds((current) => ({ ...current, [activeThemeSlot]: id }))}
        themeOverlays={themeOverlays}
        onThemeOverlayChange={(value) => setThemeOverlays((current) => ({ ...current, [activeThemeSlot]: value }))}
        use24Hour={use24Hour}
        onUse24HourChange={setUse24Hour}
        showSeconds={showSeconds}
        onShowSecondsChange={setShowSeconds}
        showQuote={showQuote}
        onShowQuoteChange={setShowQuote}
        totalLearnSec={totalLearnSec}
        totalRestSec={totalRestSec}
        pomodoroRounds={pomodoroRounds}
        today={today}
        onOpenNotion={() => {
          closeWorkspacePanel();
          setSettingsOpen(true);
        }}
        onOpenNotes={() => {
          closeWorkspacePanel();
          setOpenPanel("notes");
        }}
        onOpenRest={() => {
          closeWorkspacePanel();
          setOpenPanel("rest");
        }}
      />

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
