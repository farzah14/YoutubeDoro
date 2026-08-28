"use client";

import { useCallback, useMemo, useState, useSyncExternalStore } from "react";
import { KEYS, PRESETS } from "@/lib/constants";
import { readNumber } from "@/lib/storage";
import { formatMMSS } from "@/lib/time";
import { aggregateStats, dateKeys, percentChange, type DailyHistory } from "@/lib/statsModel";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { Card } from "../ui/Card";
import { StatsChart } from "./StatsChart";

type StatsRange = 1 | 7 | 28;

function subscribe(callback: () => void) {
  if (typeof window === "undefined") return () => {};
  window.addEventListener("storage", callback);
  window.addEventListener("local-storage", callback);
  return () => { window.removeEventListener("storage", callback); window.removeEventListener("local-storage", callback); };
}

function readHistory(today: string): Record<string, DailyHistory> {
  return Object.fromEntries(dateKeys(today, 56).map((day) => [day, {
    focusSeconds: readNumber(KEYS.learnByDay(day)),
    breakSeconds: readNumber(KEYS.restByDay(day)),
    tasksCompleted: readNumber(KEYS.taskCompletionsByDay(day)),
    sessions: readNumber(KEYS.pomodoroRoundsByDay(day)),
  }]));
}

export function DailyStats({ totalLearnSec, totalRestSec, pomodoroRounds = 0, today = "" }: { totalLearnSec: number; totalRestSec: number; pomodoroRounds?: number; today?: string }) {
  const [range, setRange] = useState<StatsRange>(1);
  const defaultGoalSec = PRESETS.defaultGoalHours * 60 * 60;
  const [goalSec, setGoalSec] = useLocalStorage(KEYS.dailyGoalSec, defaultGoalSec);
  const getSnapshot = useCallback(() => today ? JSON.stringify(readHistory(today)) : "{}", [today]);
  const historySnapshot = useSyncExternalStore(subscribe, getSnapshot, () => "{}");
  const history = useMemo<Record<string, DailyHistory>>(() => { try { return JSON.parse(historySnapshot); } catch { return {}; } }, [historySnapshot]);
  const stats = useMemo(() => aggregateStats(history, today, range), [history, range, today]);
  const previousEnd = dateKeys(today, 56).at(-range - 1);
  const previous = previousEnd ? aggregateStats(history, previousEnd, range) : aggregateStats({}, today, range);
  const change = percentChange(stats.focusSeconds, previous.focusSeconds);
  const todayProgress = goalSec > 0 ? Math.min(totalLearnSec / goalSec, 1) : 0;
  const rangeLabels = range === 1 ? ["Today", "Today"] : [stats.days[0], stats.days.at(-1) ?? ""];
  const metrics = [
    ["Focus", formatMMSS(range === 1 ? totalLearnSec : stats.focusSeconds), `${change >= 0 ? "+" : ""}${change}% vs prior`],
    ["Breaks", formatMMSS(range === 1 ? totalRestSec : stats.breakSeconds), "recovery time"],
    ["Sessions", range === 1 ? pomodoroRounds : String(stats.sessions), "completed focus blocks"],
    ["Tasks done", String(stats.tasksCompleted), "completed transitions"],
    ["Streak", `${stats.currentStreak}d`, `best ${stats.longestStreak}d`],
  ];

  return (
    <Card className="stats-card stats-dashboard p-5 sm:p-6">
      <header className="stats-dashboard__header"><div><p className="eyebrow">Focus record</p><h2>Stats</h2><p>Measure the return, not the performance.</p></div><div className="stats-range-tabs" role="tablist" aria-label="Stats range">{([[1, "Today"], [7, "1 Week"], [28, "4 Weeks"]] as const).map(([value, label]) => <button key={value} type="button" role="tab" aria-selected={range === value} onClick={() => setRange(value)}>{label}</button>)}</div></header>
      <div className="stats-metric-grid">{metrics.map(([label, value, detail]) => <div key={label} className="stats-metric"><span>{label}</span><strong>{value}</strong><small>{detail}</small></div>)}</div>
      <div className="stats-chart-card"><div className="stats-chart-card__heading"><span>Recent productivity</span><span>{rangeLabels[0]} → {rangeLabels[1]}</span></div><StatsChart values={stats.days.map((day) => history[day]?.focusSeconds ?? 0)} labels={rangeLabels} /></div>
      {range === 1 && <div className="stats-goal"><div><span>Daily goal</span><strong>{formatMMSS(totalLearnSec)} / {formatMMSS(goalSec)}</strong></div><label htmlFor="daily-goal">Goal hours<select id="daily-goal" value={goalSec / 3600} onChange={(event) => setGoalSec(Number(event.target.value) * 3600)} aria-label="Change daily focus goal">{[0.5, 1, 1.5, 2, 3, 4, 6, 8].map((hours) => <option key={hours} value={hours}>{hours}h</option>)}</select></label><div className="stats-goal__bar" role="progressbar" aria-valuenow={Math.round(todayProgress * 100)}><i style={{ width: `${todayProgress * 100}%` }} /></div></div>}
    </Card>
  );
}
