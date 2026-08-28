export function formatDuration(totalSeconds: number): string {
  const seconds = Number.isFinite(totalSeconds) ? Math.max(0, Math.floor(totalSeconds)) : 0;
  if (seconds === 0) return "0 minutes";
  if (seconds < 60) return `${seconds} second${seconds === 1 ? "" : "s"}`;

  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  const parts: string[] = [];

  if (hours > 0) parts.push(`${hours} hour${hours === 1 ? "" : "s"}`);
  if (remainingMinutes > 0) parts.push(`${remainingMinutes} minute${remainingMinutes === 1 ? "" : "s"}`);
  return parts.join(" ") || "0 minutes";
}
