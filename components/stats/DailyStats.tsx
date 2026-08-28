"use client";

import { useMemo, useState } from "react";
import { KEYS, PRESETS } from "@/lib/constants";
import { formatDuration } from "@/lib/duration";
import { aggregateStats, dateKeys, historyFromSessions, percentChange } from "@/lib/statsModel";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { useSessionHistory } from "@/hooks/useSessionHistory";
import type { LearningSession } from "@/types/tracker";
import { Card } from "../ui/Card";
import { StatsChart } from "./StatsChart";

type StatsRange = 1 | 7 | 28;

export function DailyStats({ sessions, today = "" }: { sessions?: LearningSession[]; today?: string }) {
  const [range, setRange] = useState<StatsRange>(1);
  const defaultGoalSec = PRESETS.defaultGoalHours * 60 * 60;
  const [goalSec, setGoalSec] = useLocalStorage(KEYS.dailyGoalSec, defaultGoalSec);
  const cloudHistory = useSessionHistory({ limit: 100 });
  const records = sessions ?? cloudHistory.sessions;
  const history = useMemo(() => historyFromSessions(records), [records]);
  const stats = useMemo(() => aggregateStats(history, today, range), [history, range, today]);
  const previousEnd = dateKeys(today, 56).at(-range - 1);
  const previous = previousEnd ? aggregateStats(history, previousEnd, range) : aggregateStats({}, today, range);
  const change = percentChange(stats.focusSeconds, previous.focusSeconds);
  const todayFocus = history[today]?.focusSeconds ?? 0;
  const todayBreak = history[today]?.breakSeconds ?? 0;
  const todayProgress = goalSec > 0 ? Math.min(todayFocus / goalSec, 1) : 0;
  const rangeLabels = range === 1 ? ["Today", "Today"] : [stats.days[0], stats.days.at(-1) ?? ""];
  const metrics = [
    ["Focus", formatDuration(range === 1 ? todayFocus : stats.focusSeconds), `${change >= 0 ? "+" : ""}${change}% vs prior`],
    ["Breaks", formatDuration(range === 1 ? todayBreak : stats.breakSeconds), "recovery time"],
    ["Sessions", String(stats.sessions), "completed focus blocks"],
    ["Tasks done", String(stats.tasksCompleted), "completed transitions"],
    ["Streak", `${stats.currentStreak}d`, `best ${stats.longestStreak}d`],
  ];

  return (
    <Card className="stats-card stats-dashboard p-5 sm:p-6">
      <header className="stats-dashboard__header"><div><p className="eyebrow">Focus record</p><h2>Stats</h2><p>Measure the return, not the performance.</p></div><div className="stats-range-tabs" role="tablist" aria-label="Stats range">{([[1, "Today"], [7, "1 Week"], [28, "4 Weeks"]] as const).map(([value, label]) => <button key={value} type="button" role="tab" aria-selected={range === value} onClick={() => setRange(value)}>{label}</button>)}</div></header>
      <div className="stats-metric-grid">{metrics.map(([label, value, detail]) => <div key={label} className="stats-metric"><span>{label}</span><strong>{value}</strong><small>{detail}</small></div>)}</div>
      <div className="stats-chart-card"><div className="stats-chart-card__heading"><span>Recent productivity</span><span>{rangeLabels[0]} → {rangeLabels[1]}</span></div><StatsChart values={stats.days.map((day) => history[day]?.focusSeconds ?? 0)} labels={rangeLabels} /></div>
      {range === 1 && <div className="stats-goal"><div><span>Daily goal</span><strong>{formatDuration(todayFocus)} / {formatDuration(goalSec)}</strong></div><label htmlFor="daily-goal">Goal hours<select id="daily-goal" value={goalSec / 3600} onChange={(event) => setGoalSec(Number(event.target.value) * 3600)} aria-label="Change daily focus goal">{[0.5, 1, 1.5, 2, 3, 4, 6, 8].map((hours) => <option key={hours} value={hours}>{hours}h</option>)}</select></label><div className="stats-goal__bar" role="progressbar" aria-valuenow={Math.round(todayProgress * 100)}><i style={{ width: `${todayProgress * 100}%` }} /></div></div>}
    </Card>
  );
}
