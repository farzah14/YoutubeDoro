"use client";

import { useState } from "react";
import { useTimer } from "@/hooks/useTimer";
import { PRESETS } from "@/lib/constants";
import { formatMMSS } from "@/lib/time";
import { TaskItem } from "@/types";
import { Badge } from "../ui/Badge";
import { Input } from "../ui/Input";
import { CardFooter } from "../ui/Card";
import { TargetIcon } from "../icons";
import { TimerDisplay } from "./TimerDisplay";
import { TimerControls } from "./TimerControls";
import { Segmented } from "../ui/Segmented";
import { PomodoroCycleTracker } from "./PomodoroCycleTracker";
import { TaskQueue } from "../tasks/TaskQueue";

interface LearningCardProps {
  topicToday: string;
  totalTodaySec: number;
  pomodoroRounds: number;
  tasks: TaskItem[];
  activeTaskId: string | null;
  hideEmbeddedTasks?: boolean;
  onSelectTask: (task: TaskItem) => void;
  onAddTask: (text: string, estimatedPomos: number) => void;
  onToggleTask: (id: string) => void;
  onDeleteTask: (id: string) => void;
  onResetCycle: () => void;
  onSelectLongBreak: () => void;
  onStartWithTitle: (title: string) => void;
  onLearnDone: (seconds: number) => void;
  onLearnStop: (seconds: number) => void;
}

export function LearningCard({
  topicToday,
  totalTodaySec,
  pomodoroRounds,
  tasks,
  activeTaskId,
  hideEmbeddedTasks = false,
  onSelectTask,
  onAddTask,
  onToggleTask,
  onDeleteTask,
  onResetCycle,
  onSelectLongBreak,
  onStartWithTitle,
  onLearnDone,
  onLearnStop,
}: LearningCardProps) {
  const [topicDraftState, setTopicDraftState] = useState(() => ({
    source: topicToday,
    value: topicToday,
  }));
  const topicDraft =
    topicDraftState.source === topicToday ? topicDraftState.value : topicToday;
  const setTopicDraft = (value: string) =>
    setTopicDraftState({ source: topicToday, value });

  const timer = useTimer({
    initialMinutes: PRESETS.learning[0],
    onDone: onLearnDone,
    onStop: onLearnStop,
    tabTitleLabel: topicToday ? `Focus: ${topicToday}` : "Focus",
    autoNotificationTitle: "Focus Complete",
    autoNotificationBody: "Great job! Time to take a break.",
  });

  const handleStart = () => {
    onStartWithTitle(topicDraft);
    timer.start();
  };

  const handleTaskPicked = (task: TaskItem) => {
    setTopicDraft(task.text);
    onSelectTask(task);
  };

  const selectedTask = tasks.find((task) => task.id === activeTaskId);
  const focusLabel = selectedTask?.text || topicDraft.trim() || "Choose one small task";
  const isRunningOrPaused = timer.status === "Running" || timer.status === "Paused";

  return (
    <section
      aria-labelledby="focus-stage-title"
      className="flat-anime-card focus-stage flex flex-col overflow-hidden"
    >
      <header className="flex items-start justify-between gap-4 border-b border-border-subtle px-5 py-5 sm:px-7">
        <div className="min-w-0">
          <p className="eyebrow">Focus workspace · 集中</p>
          <h2 id="focus-stage-title" className="mt-2 text-xl font-bold tracking-tight text-foreground">
            Stay with one small thing
          </h2>
          <p className="mt-1 text-xs text-text-muted">A quiet desk for the next focused interval.</p>
        </div>
        <Badge
          variant={
            timer.status === "Running"
              ? "success"
              : timer.status === "Paused"
              ? "warning"
              : "secondary"
          }
          className="shrink-0"
        >
          {timer.status}
        </Badge>
      </header>

      <div className="flex flex-1 flex-col gap-6 px-5 py-6 sm:px-7 sm:py-7">
        <TimerDisplay
          remainingSec={timer.remainingSec}
          totalSec={timer.targetSec}
          variant="focus"
        />

        <div className="focus-context quiet-panel flex items-center gap-3 px-4 py-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center border border-border-subtle bg-surface-secondary text-accent" aria-hidden="true">
            <TargetIcon className="h-4 w-4" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="eyebrow">Current focus</p>
            <p className="mt-1 truncate text-sm font-semibold text-foreground" title={focusLabel}>
              {focusLabel}
            </p>
          </div>
          <span className="hidden shrink-0 text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-text-muted sm:block">
            {isRunningOrPaused ? "In session" : "Ready"}
          </span>
        </div>

        <TimerControls
          status={timer.status}
          onStart={handleStart}
          onPause={timer.pause}
          onResume={timer.resume}
          onStop={timer.stop}
          onReset={timer.reset}
        />

        <PomodoroCycleTracker
          completedRounds={pomodoroRounds}
          maxRoundsPerCycle={4}
          onResetCycle={onResetCycle}
          onSelectLongBreak={onSelectLongBreak}
        />

        {!isRunningOrPaused && (
          <div className="grid gap-4 border-t border-border-subtle pt-5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
            <div className="flex min-w-0 flex-col gap-2">
              <label htmlFor="focus-topic" className="eyebrow">
                Active topic / focus goal
              </label>
              <Input
                id="focus-topic"
                value={topicDraft}
                onChange={(e) => setTopicDraft(e.target.value)}
                placeholder="Name the next small thing"
                className="text-sm"
              />
            </div>

            <div className="flex items-center justify-between gap-3 sm:flex-col sm:items-start sm:gap-2">
              <span className="eyebrow">Duration</span>
              <Segmented
                aria-label="Focus duration"
                value={timer.minutes.toString()}
                onChange={(value) => timer.setMinutes(Number(value))}
                options={PRESETS.learning.map((minutes) => ({
                  label: `${minutes}m`,
                  value: minutes.toString(),
                }))}
              />
            </div>
          </div>
        )}

        {!hideEmbeddedTasks && (
          <div className="border-t border-border-subtle pt-5">
            <TaskQueue
              tasks={tasks}
              activeTaskId={activeTaskId}
              currentTopic={topicDraft}
              onSelectTask={handleTaskPicked}
              onAddTask={onAddTask}
              onToggleTask={onToggleTask}
              onDeleteTask={onDeleteTask}
            />
          </div>
        )}
      </div>

      <CardFooter className="justify-between px-5 py-3 text-xs sm:px-7">
        <span>
          Today&apos;s focus: <strong className="font-mono text-foreground">{formatMMSS(totalTodaySec)}</strong>
        </span>
        {topicToday.trim() && (
          <span className="max-w-[45%] truncate text-right">
            Active: <strong className="text-accent">{topicToday}</strong>
          </span>
        )}
      </CardFooter>
    </section>
  );
}
