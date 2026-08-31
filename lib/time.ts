export function formatMMSS(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const mm = Math.floor(s / 60);
  const ss = s % 60;
  return `${String(mm).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;
}

export function formatClock(date: Date, use24Hour: boolean, showSeconds: boolean): string {
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: showSeconds ? "2-digit" : undefined,
    hour12: !use24Hour,
  })
    .formatToParts(date)
    .filter((part) => part.type !== "literal" || part.value === ":")
    .map((part) => part.type === "dayPeriod" ? ` ${part.value}` : part.value)
    .join("")
    .trim();
}

export function pad2(n: number) {
  return String(n).padStart(2, "0");
}

export function dayKey(d = new Date()) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}
