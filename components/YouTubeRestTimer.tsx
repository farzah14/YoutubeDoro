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
import type { TimerStartContext } from "@/hooks/useFocusTimer";
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
import { SessionNoteEditor } from "./session/SessionNoteEditor";
import { HistoryPanel } from "./history/HistoryPanel";
import { MigrationPrompt, isMigrationSuppressed } from "./migration/MigrationPrompt";
import { exportBrowserTrackerData, type BrowserMigrationExport } from "@/lib/browserMigration";
import { LoFiPlayer, MusicEngine } from "./audio/LoFiPlayer";
import { getQuoteForDate } from "@/lib/quotes";
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
  const recorder = useSessionRecorder();
  const history = useSessionHistory({ limit: 100 });
  const [statsRevision, setStatsRevision] = useState(0);
  const [interruptedSessions, setInterruptedSessions] = useState<LearningSession[]>([]);
  const [showInterruptedNotice, setShowInterruptedNotice] = useState(true);
  const [migrationData, setMigrationData] = useState<BrowserMigrationExport | null>(null);
  const sessionNoteRef = useRef("");
  const topicToday = activeTask?.text ?? "";

  useEffect(() => {
    let cancelled = false;
    void recorder.recover().then((sessions) => {
      if (cancelled || sessions.length === 0) return;
      setInterruptedSessions(sessions);
      void history.reload();
    });
    return () => { cancelled = true; };
  }, [history.reload, recorder.recover]);

  useEffect(() => {
    const exported = exportBrowserTrackerData(window.localStorage);
    const hasTrackerData = exported.summary.tasks + exported.summary.subtasks + exported.summary.sessions + exported.summary.notes > 0;
    if (hasTrackerData && !isMigrationSuppressed(exported.migrationKey)) setMigrationData(exported);
  }, []);

  const visibleSessions = useMemo(() => {
    void statsRevision;
    const current = history.sessions.slice();
    if (recorder.session && !current.some((session) => session.id === recorder.session?.id)) {
      current.push({ ...recorder.session, ...recorder.getLastMeasurements() });
    }
    return current;
  }, [history.sessions, recorder.getLastMeasurements, recorder.session, statsRevision]);
  const todaySessions = useMemo(() => visibleSessions.filter((session) => {
    const date = new Date(session.startedAt);
    return !Number.isNaN(date.getTime()) && dayKey(date) === today;
  }), [today, visibleSessions]);
  const totalLearnSec = todaySessions.reduce((sum, session) => sum + session.learningSeconds, 0);
  const totalRestSec = todaySessions.reduce((sum, session) => sum + session.breakSeconds, 0);

  const handleFocusStart = useCallback(async (context: TimerStartContext) => {
    if (recorder.session?.status === "active") {
      const closed = await recorder.finalize("completed", recorder.getLastMeasurements(), sessionNoteRef.current);
      if (!closed) return false;
    }
    const task = tasks.find((item) => item.id === activeTaskId) ?? activeTask;
    const title = task?.text.trim() || "Untitled learning session";
    const created = await recorder.start({
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
  }, [activeTask, activeTaskId, recorder.finalize, recorder.getLastMeasurements, recorder.session?.status, recorder.start, tasks]);

  const handleBreakStart = useCallback(async () => recorder.breakStart(), [recorder.breakStart]);
  const handleBreakProgress = useCallback((seconds: number) => recorder.breakCheckpoint(seconds), [recorder.breakCheckpoint]);
  const handleProgress = useCallback((phase: "focus" | "break", elapsedSeconds: number, status: "idle" | "running" | "paused" | "done") => {
    const current: SessionMeasurements = recorder.getLastMeasurements();
    recorder.checkpoint({
      ...current,
      learningSeconds: phase === "focus" ? elapsedSeconds : current.learningSeconds,
      breakSeconds: phase === "break" ? elapsedSeconds : current.breakSeconds,
    }, status === "paused");
    if (status === "paused") setStatsRevision((value) => value + 1);
  }, [recorder.checkpoint, recorder.getLastMeasurements]);

  const refreshHistory = useCallback(() => {
    setStatsRevision((value) => value + 1);
    void history.reload();
  }, [history.reload]);

  const finishSession = useCallback((status: "completed" | "stopped", seconds: number) => {
    const current = recorder.getLastMeasurements();
    void recorder.finalize(status, { ...current, learningSeconds: Math.max(0, Math.floor(seconds)) }, sessionNoteRef.current).then((saved) => {
      if (saved) refreshHistory();
    });
  }, [recorder.finalize, recorder.getLastMeasurements, refreshHistory]);

  const handleLearnDone = useCallback((seconds: number, followedByBreak: boolean) => {
    const current = recorder.getLastMeasurements();
    recorder.checkpoint({ ...current, learningSeconds: seconds }, true);
    if (!followedByBreak) finishSession("completed", seconds);
  }, [finishSession, recorder.checkpoint, recorder.getLastMeasurements]);
  const handleLearnStop = useCallback((seconds: number) => finishSession("stopped", seconds), [finishSession]);
  const handleBreakDone = useCallback((seconds: number) => {
    recorder.breakEnd(seconds);
    finishSession("completed", recorder.getLastMeasurements().learningSeconds);
  }, [finishSession, recorder.breakEnd, recorder.getLastMeasurements]);
  const handleBreakStop = useCallback((seconds: number) => {
    recorder.breakEnd(seconds);
    finishSession("stopped", recorder.getLastMeasurements().learningSeconds);
  }, [finishSession, recorder.breakEnd, recorder.getLastMeasurements]);
  const handleRestDone = useCallback((seconds: number) => recorder.breakEnd(seconds), [recorder.breakEnd]);
  const handleRestStop = useCallback((seconds: number) => recorder.breakEnd(seconds), [recorder.breakEnd]);

  const saveSessionNote = useCallback((note: string) => {
    sessionNoteRef.current = note;
    return recorder.updateMetadata({ note });
  }, [recorder.updateMetadata]);
  const saveSessionTitle = useCallback((title: string) => recorder.updateMetadata({ title }), [recorder.updateMetadata]);

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
        <Header quote={getQuoteForDate(today)} showQuote={showQuote} accountEmail={accountEmail} accountProvider={accountProvider} />

        <HomeHero
          hidden={!isHomeMode}
          use24Hour={use24Hour}
          showSeconds={showSeconds}
          name={dashboardName}
          greetingStyle={greetingStyle}
        />

        {(taskError || recorder.error) && <aside className="session-recovery-notice session-recovery-notice--error" role="alert"><div><strong>Tracker save problem.</strong><p>{taskError || recorder.error}</p></div><button type="button" onClick={() => { void reloadTasks(); void history.reload(); }}>Retry</button></aside>}
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
              onRunningChange={setFocusRunning}
              tasks={tasks}
              activeTaskId={activeTaskId}
              onOpenTasks={() => toggleWorkspacePanel("tasks")}
              onFocusStart={handleFocusStart}
              onBreakStart={handleBreakStart}
              onProgress={handleProgress}
              onLearnDone={handleLearnDone}
              onLearnStop={handleLearnStop}
              onBreakDone={handleBreakDone}
              onBreakStop={handleBreakStop}
            />
            <SessionNoteEditor
              sessionId={recorder.sessionId}
              initialValue={recorder.session?.note ?? ""}
              title={recorder.session?.title ?? ""}
              learningSeconds={recorder.getLastMeasurements().learningSeconds}
              status={recorder.session?.status ?? "idle"}
              onSave={saveSessionNote}
              onTitleSave={saveSessionTitle}
              onValueChange={(note) => { sessionNoteRef.current = note; }}
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
      <Modal open={openPanel === "history"} onClose={closeWorkspacePanel} title="Session history" className="history-modal">
        <HistoryPanel tasks={tasks} />
      </Modal>

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
        sessions={visibleSessions}
        today={today}
        onOpenHistory={() => {
          closeWorkspacePanel();
          setOpenPanel("history");
        }}
        onOpenRest={() => {
          closeWorkspacePanel();
          setOpenPanel("rest");
        }}
      />

      {migrationData && <MigrationPrompt data={migrationData} onCancel={() => setMigrationData(null)} onImported={() => { setMigrationData(null); void reloadTasks(); refreshHistory(); }} />}
    </div>
  );
}
