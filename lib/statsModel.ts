export interface DailyHistory {
  focusSeconds: number;
  breakSeconds: number;
  tasksCompleted: number;
  sessions: number;
}

export interface AggregatedStats extends DailyHistory {
  currentStreak: number;
  longestStreak: number;
  days: string[];
}

const emptyDay: DailyHistory = { focusSeconds: 0, breakSeconds: 0, tasksCompleted: 0, sessions: 0 };

export function dateKeys(today: string, days: number): string[] {
  const [year, month, day] = today.split("-").map(Number);
  const cursor = new Date(year, month - 1, day);
  return Array.from({ length: Math.max(0, days) }, (_, index) => {
    const value = new Date(cursor);
    value.setDate(cursor.getDate() - (days - index - 1));
    return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;
  });
}

export function aggregateStats(history: Record<string, DailyHistory>, today: string, days: number): AggregatedStats {
  const keys = dateKeys(today, days);
  const totals = keys.reduce((result, key) => {
    const item = history[key] ?? emptyDay;
    result.focusSeconds += Math.max(0, item.focusSeconds || 0);
    result.breakSeconds += Math.max(0, item.breakSeconds || 0);
    result.tasksCompleted += Math.max(0, item.tasksCompleted || 0);
    result.sessions += Math.max(0, item.sessions || 0);
    return result;
  }, { ...emptyDay });

  let currentStreak = 0;
  for (let index = keys.length - 1; index >= 0 && (history[keys[index]]?.focusSeconds ?? 0) > 0; index -= 1) currentStreak += 1;
  let longestStreak = 0;
  let run = 0;
  for (const key of keys) {
    run = (history[key]?.focusSeconds ?? 0) > 0 ? run + 1 : 0;
    longestStreak = Math.max(longestStreak, run);
  }
  return { ...totals, currentStreak, longestStreak, days: keys };
}

export function percentChange(current: number, previous: number): number {
  if (previous === 0) return current === 0 ? 0 : 100;
  return Math.round(((current - previous) / previous) * 100);
}
