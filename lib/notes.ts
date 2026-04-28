import { NoteKind, DailyNoteEntry } from "@/types";
import { dayKey } from "./time";

export function normalizeTitle(s: string) {
  return s.trim().replace(/\s+/g, " ").toLowerCase();
}

export function safeTitle(s: string) {
  const t = s.trim();
  return t ? t : "(Untitled)";
}

// cyrb53-ish hash (stable, fast) -> number
export function hashTo53(str: string) {
  let h1 = 0xdeadbeef ^ str.length;
  let h2 = 0x41c6ce57 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  const hi = (h2 >>> 0) & 0x1fffff; // 21 bits
  const lo = h1 >>> 0; // 32 bits
  return hi * 4294967296 + lo; // up to 53-bit
}

export function stableEntryId(day: string, title: string) {
  const t = normalizeTitle(title);
  const key = `${day}|${t || "(untitled)"}`;
  const h = hashTo53(key);
  return `n_${h.toString(36)}`;
}

export function shortId(id: string) {
  if (id.length <= 14) return id;
  return `${id.slice(0, 7)}…${id.slice(-5)}`;
}

export function kindLabel(kind: NoteKind): string {
  switch (kind) {
    case "learn_start": return "Started learning";
    case "topic_set": return "Topic saved";
    case "learn_done": return "Learning finished";
    case "learn_stop": return "Learning stopped";
    case "rest_done": return "Rest finished";
    case "rest_stop": return "Rest stopped";
    case "yt_rest_done": return "YouTube rest finished";
    case "yt_rest_stop": return "YouTube rest stopped";
    default: return "Note";
  }
}

export function sanitizeNotes(raw: unknown): DailyNoteEntry[] {
  const arr = Array.isArray(raw) ? raw : [];
  const out: DailyNoteEntry[] = [];

  for (const it of arr) {
    const obj = (it ?? {}) as Record<string, unknown>;

    const day = typeof obj.day === "string" ? obj.day : "";
    const title =
      typeof obj.title === "string"
        ? obj.title
        : typeof obj.topic === "string"
          ? obj.topic
          : "";

    const id =
      typeof obj.id === "string" && obj.id
        ? obj.id
        : stableEntryId(day || dayKey(), safeTitle(title));

    const ts = typeof obj.ts === "number" && Number.isFinite(obj.ts) ? obj.ts : Date.now();
    const kind = (typeof obj.kind === "string" ? obj.kind : "topic_set") as NoteKind;

    const deltaLearnSec = typeof obj.deltaLearnSec === "number" && Number.isFinite(obj.deltaLearnSec) ? obj.deltaLearnSec : 0;
    const deltaRestSec = typeof obj.deltaRestSec === "number" && Number.isFinite(obj.deltaRestSec) ? obj.deltaRestSec : 0;
    const totalLearnTitleSec = typeof obj.totalLearnTitleSec === "number" && Number.isFinite(obj.totalLearnTitleSec) ? obj.totalLearnTitleSec : 0;
    const totalRestTitleSec = typeof obj.totalRestTitleSec === "number" && Number.isFinite(obj.totalRestTitleSec) ? obj.totalRestTitleSec : 0;

    out.push({
      id,
      ts,
      day,
      kind,
      title: safeTitle(title),
      deltaLearnSec,
      deltaRestSec,
      totalLearnTitleSec,
      totalRestTitleSec,
    });
  }

  return out;
}
