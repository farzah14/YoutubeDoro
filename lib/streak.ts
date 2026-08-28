import { readNumber } from "./storage";
import { KEYS } from "./constants";
import { dayKey } from "./time";

/**
 * Format a Date object to YYYY-MM-DD
 */
export function formatDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * Calculates current streak (in consecutive days) based on localStorage records
 */
export function calculateStreak(todayStr: string = dayKey()): { currentStreak: number; bestStreak: number } {
  if (typeof window === "undefined" || !todayStr) {
    return { currentStreak: 0, bestStreak: 0 };
  }

  const [year, month, day] = todayStr.split("-").map(Number);
  if (!year || !month || !day) return { currentStreak: 0, bestStreak: 0 };

  const todayDate = new Date(year, month - 1, day);
  const todayLearnSec = readNumber(KEYS.learnByDay(todayStr));

  let currentStreak = 0;
  const cursor = new Date(todayDate);

  // If user focused today, count today and walk backward
  if (todayLearnSec > 0) {
    currentStreak = 1;
    cursor.setDate(cursor.getDate() - 1);
  } else {
    // Check if streak was active up through yesterday
    cursor.setDate(cursor.getDate() - 1);
    const yesterdayKey = formatDateKey(cursor);
    if (readNumber(KEYS.learnByDay(yesterdayKey)) > 0) {
      currentStreak = 0; // Streak is pending today's session
    }
  }

  // Walk backward to count consecutive days
  while (true) {
    const key = formatDateKey(cursor);
    const sec = readNumber(KEYS.learnByDay(key));
    if (sec > 0) {
      currentStreak++;
      cursor.setDate(cursor.getDate() - 1);
    } else {
      break;
    }
  }

  // Calculate best streak over past 60 days
  let bestStreak = currentStreak;
  let tempStreak = 0;
  const scanCursor = new Date(todayDate);
  scanCursor.setDate(scanCursor.getDate() - 60);

  for (let i = 0; i <= 60; i++) {
    const key = formatDateKey(scanCursor);
    const sec = readNumber(KEYS.learnByDay(key));
    if (sec > 0) {
      tempStreak++;
      if (tempStreak > bestStreak) bestStreak = tempStreak;
    } else {
      tempStreak = 0;
    }
    scanCursor.setDate(scanCursor.getDate() + 1);
  }

  return { currentStreak, bestStreak };
}
