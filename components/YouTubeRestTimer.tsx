"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { dayKey } from "@/lib/time";
import { formatDuration } from "@/lib/duration";
import { KEYS } from "@/lib/constants";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { useCloudTasks } from "@/hooks/useCloudTasks";
import { useSessionHistory } from "@/hooks/useSessionHistory";
import { useSessionRecorder } from "@/hooks/useSessionRecorder";
import type { SessionMeasurements } from "@/hooks/useSessionRecorder";
import { useFocusTimer, type TimerStartContext } from "@/hooks/useFocusTimer";
import { CozyAnimeTheme } from "@/types/theme";
import type { ThemeSlot, WorkspaceMode, WorkspacePanel } from "@/types/workspace";
import type { LearningSession } from "@/types/tracker";
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
import { MigrationPrompt, isMigrationSuppressed } from "./migration/MigrationPrompt";
import { BROWSER_MIGRATION_KEY, exportBrowserTrackerData, getBrowserMigrationKey, type BrowserMigrationExport } from "@/lib/browserMigration";
import { LoFiPlayer, MusicEngine } from "./audio/LoFiPlayer";
import { SettingsPanel } from "./settings/SettingsPanel";

export default function YouTubeRestTimer({ accountEmail, accountProvider }: { accountEmail?: string; accountProvider?: string } = {}) {
  const [today] = useState<string>(() => dayKey());

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
  const {
    tasks,
    activeTaskId,
    activeTask,
    setActiveTaskId,
    addTask,
    toggleTask,
    deleteTask,
    reorderTasks,
    moveTask,
    updateTask,
    addSubtask,
    toggleSubtask,
    deleteSubtask,
    resetTasks,
    reload: reloadTasks,
    loading: tasksLoading,
    error: taskError,
  } = useCloudTasks();
  const {
    session: recorderSession,
    error: recorderError,
    start: startSession,
    checkpoint: checkpointSession,
    breakStart: startBreak,
    breakCheckpoint: checkpointBreak,
    breakEnd: endBreak,
    finalize: finalizeSession,
    recover: recoverSessions,
    getLastMeasurements,
  } = useSessionRecorder();
  const { sessions: historySessions, reload: reloadHistory } = useSessionHistory({ limit: 100 });
  const [statsRevision, setStatsRevision] = useState(0);
  const [interruptedSessions, setInterruptedSessions] = useState<LearningSession[]>([]);
  const [showInterruptedNotice, setShowInterruptedNotice] = useState(true);
  const [migrationKey] = useLocalStorage(BROWSER_MIGRATION_KEY, "");
  const [migrationHidden, setMigrationHidden] = useState(false);
  const sessionNoteRef = useRef("");
  const topicToday = activeTask?.text ?? "";

  useEffect(() => {
    let cancelled = false;
    void recoverSessions().then((sessions) => {
      if (cancelled || sessions.length === 0) return;
      setInterruptedSessions(sessions);
      void reloadHistory();
    });
    return () => { cancelled = true; };
  }, [reloadHistory, recoverSessions]);

  useEffect(() => {
    if (migrationKey || typeof window === "undefined") return;
    getBrowserMigrationKey(window.localStorage);
    window.dispatchEvent(new Event("local-storage"));
  }, [migrationKey]);

  const migrationData = useMemo<BrowserMigrationExport | null>(() => {
    if (!migrationKey || migrationHidden || typeof window === "undefined") return null;
    const exported = exportBrowserTrackerData(window.localStorage, migrationKey);
    const hasTrackerData = exported.summary.tasks + exported.summary.subtasks + exported.summary.sessions + exported.summary.notes > 0;
    return hasTrackerData && !isMigrationSuppressed(exported.migrationKey) ? exported : null;
  }, [migrationHidden, migrationKey]);

  const visibleSessions = useMemo(() => {
    void statsRevision;
    const current = historySessions.slice();
    if (recorderSession && !current.some((session) => session.id === recorderSession.id)) {
      current.push({ ...recorderSession, ...getLastMeasurements() });
    }
    return current;
  }, [getLastMeasurements, historySessions, recorderSession, statsRevision]);
  const todaySessions = useMemo(() => visibleSessions.filter((session) => {
    const date = new Date(session.startedAt);
    return !Number.isNaN(date.getTime()) && dayKey(date) === today;
  }), [today, visibleSessions]);
  const totalLearnSec = todaySessions.reduce((sum, session) => sum + session.learningSeconds, 0);
  const totalRestSec = todaySessions.reduce((sum, session) => sum + session.breakSeconds, 0);

  const handleFocusStart = useCallback(async (context: TimerStartContext) => {
    if (recorderSession?.status === "active") {
      const closed = await finalizeSession("completed", getLastMeasurements(), sessionNoteRef.current);
      if (!closed) return false;
    }
    const task = tasks.find((item) => item.id === activeTaskId) ?? activeTask;
    const title = task?.text.trim() || "Untitled learning session";
    const created = await startSession({
      taskId: task?.id ?? null,
      taskTitleSnapshot: title,
      title,
      timerMode: context.mode,
      plannedSeconds: context.plannedSeconds,
    });
    if (!created) return false;
    sessionNoteRef.current = created.note;
    setStatsRevision((value) => value + 1);
    return true;
  }, [activeTask, activeTaskId, finalizeSession, getLastMeasurements, recorderSession?.status, startSession, tasks]);

  const handleBreakStart = useCallback(async () => startBreak(), [startBreak]);
  const handleBreakProgress = useCallback((seconds: number) => checkpointBreak(seconds), [checkpointBreak]);
  const handleProgress = useCallback((phase: "focus" | "break", elapsedSeconds: number, status: "idle" | "running" | "paused" | "done") => {
    const current: SessionMeasurements = getLastMeasurements();
    checkpointSession({
      ...current,
      learningSeconds: phase === "focus" ? elapsedSeconds : current.learningSeconds,
      breakSeconds: phase === "break" ? elapsedSeconds : current.breakSeconds,
    }, status === "paused");
    if (status === "paused") setStatsRevision((value) => value + 1);
  }, [checkpointSession, getLastMeasurements]);

  const refreshHistory = useCallback(() => {
    setStatsRevision((value) => value + 1);
    void reloadHistory();
  }, [reloadHistory]);

  const finishSession = useCallback((status: "completed" | "stopped", seconds: number) => {
    const current = getLastMeasurements();
    void finalizeSession(status, { ...current, learningSeconds: Math.max(0, Math.floor(seconds)) }, sessionNoteRef.current).then((saved) => {
      if (saved) refreshHistory();
    });
  }, [finalizeSession, getLastMeasurements, refreshHistory]);

  const handleLearnDone = useCallback((seconds: number, followedByBreak: boolean) => {
    const current = getLastMeasurements();
    checkpointSession({ ...current, learningSeconds: seconds }, true);
    if (!followedByBreak) finishSession("completed", seconds);
  }, [checkpointSession, finishSession, getLastMeasurements]);
  const handleLearnStop = useCallback((seconds: number) => finishSession("stopped", seconds), [finishSession]);
  const handleBreakDone = useCallback((seconds: number) => {
    endBreak(seconds);
    finishSession("completed", getLastMeasurements().learningSeconds);
  }, [endBreak, finishSession, getLastMeasurements]);
  const handleBreakStop = useCallback((seconds: number) => {
    endBreak(seconds);
    finishSession("stopped", getLastMeasurements().learningSeconds);
  }, [endBreak, finishSession, getLastMeasurements]);
  const focusTimer = useFocusTimer({
    onFocusStart: handleFocusStart,
    onBreakStart: handleBreakStart,
    onFocusDone: handleLearnDone,
    onFocusStop: handleLearnStop,
    onBreakDone: handleBreakDone,
    onBreakStop: handleBreakStop,
  });
  const handleRestDone = useCallback((seconds: number) => endBreak(seconds), [endBreak]);
  const handleRestStop = useCallback((seconds: number) => endBreak(seconds), [endBreak]);

  const handleTaskSelected = useCallback(
    (task: { id: string; text: string }) => {
      setActiveTaskId(task.id);
    },
    [setActiveTaskId]
  );

  // Global keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      if (e.key.toLowerCase() === "n") {
        toggleWorkspacePanel("history");
      }
      if (e.key.toLowerCase() === "f") {
        handleModeChange(workspaceMode === "focus" ? "home" : "focus");
      }
      if (e.key === "Escape") {
        if (openPanel) {
          closeWorkspacePanel();
        } else if (workspaceMode !== "home") {
          handleModeChange("home");
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [closeWorkspacePanel, handleModeChange, openPanel, toggleWorkspacePanel, workspaceMode]);

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
        <Header />

        <HomeHero
          hidden={!isHomeMode}
          use24Hour={use24Hour}
          showSeconds={showSeconds}
          name={dashboardName}
          greetingStyle={greetingStyle}
        />

        {(taskError || recorderError) && <aside className="session-recovery-notice session-recovery-notice--error" role="alert"><div><strong>Tracker save problem.</strong><p>{taskError || recorderError}</p></div><button type="button" onClick={() => { void reloadTasks(); void reloadHistory(); }}>Retry</button></aside>}
        {tasksLoading && <p className="tracker-loading" role="status">Loading your account tracker…</p>}

        {!isHomeMode && (
        <div className="workspace-stage no-scrollbar space-y-5">
          {showInterruptedNotice && interruptedSessions.length > 0 && (
            <aside className="session-recovery-notice" role="status">
              <div>
                <strong>Previous session stopped safely.</strong>
                <p>{interruptedSessions.length} session{interruptedSessions.length === 1 ? "" : "s"} recovered at the last saved point ({formatDuration(interruptedSessions.reduce((total, session) => total + session.learningSeconds, 0))} of learning).</p>
              </div>
              <button type="button" onClick={() => setShowInterruptedNotice(false)} aria-label="Dismiss recovery notice">Dismiss</button>
            </aside>
          )}
          <main
            id="focus"
            aria-label="Focus workspace"
            className={`workspace-stage__focus workspace-stage__focus--${workspaceMode} min-w-0 space-y-4`}
          >
            <LearningCard
              topicToday={topicToday}
              totalTodaySec={totalLearnSec}
              pipBackgroundUrl={COZY_THEMES[activeTheme].backgroundUrl}
              timer={focusTimer}
              onRunningChange={setFocusRunning}
              tasks={tasks}
              activeTaskId={activeTaskId}
              onOpenTasks={() => toggleWorkspacePanel("tasks")}
              onProgress={handleProgress}
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
        timerBusy={focusTimer.state.status === "running" || focusTimer.state.status === "paused"}
        timerMode={focusTimer.preferences.mode}
        onTimerModeChange={focusTimer.setMode}
        onFullscreen={handleFullscreen}
      />
      <MusicEngine />

      {/* ── Modals & Drawers ── */}
      <Modal open={openPanel === "rest"} onClose={closeWorkspacePanel} title="Break tools">
        <RestCardContainer totalTodaySec={totalRestSec} onBreakStart={handleBreakStart} onBreakProgress={handleBreakProgress} onRestDone={handleRestDone} onRestStop={handleRestStop} onYTDone={handleRestDone} onYTStop={handleRestStop} />
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
            sessions={visibleSessions}
            today={today}
          />
          <WeeklyHeatmap sessions={visibleSessions} />
        </div>
      </Modal>

      <SettingsPanel
        key={openPanel === "history" ? "history" : openPanel === "settings" ? "settings" : "closed"}
        open={openPanel === "settings" || openPanel === "history"}
        initialSection={openPanel === "history" ? "history" : undefined}
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
        accountEmail={accountEmail}
        accountProvider={accountProvider}
        tasks={tasks}
        sessions={visibleSessions}
        today={today}
        onOpenHistory={() => setOpenPanel("history")}
        onOpenRest={() => {
          closeWorkspacePanel();
          setOpenPanel("rest");
        }}
      />

      {migrationData && <MigrationPrompt data={migrationData} onCancel={() => setMigrationHidden(true)} onImported={() => { setMigrationHidden(true); void reloadTasks(); refreshHistory(); }} />}
    </div>
  );
}
