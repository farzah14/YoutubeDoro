// src/app/page.tsx
"use client";

import dynamic from "next/dynamic";
import type { ComponentType, ReactNode } from "react";
import { startTransition, useEffect, useMemo, useRef, useState } from "react";

/* =========================
   Helpers (ONE FILE)
========================= */

function extractYouTubeVideoId(input: string): string | null {
  const raw = input.trim();

  if (/^[a-zA-Z0-9_-]{11}$/.test(raw)) return raw;

  try {
    const url = new URL(raw);

    if (url.hostname.includes("youtu.be")) {
      const id = url.pathname.split("/").filter(Boolean)[0];
      return id && /^[a-zA-Z0-9_-]{11}$/.test(id) ? id : null;
    }

    const v = url.searchParams.get("v");
    if (v && /^[a-zA-Z0-9_-]{11}$/.test(v)) return v;

    const parts = url.pathname.split("/").filter(Boolean);
    const embedIdx = parts.indexOf("embed");
    if (embedIdx >= 0 && parts[embedIdx + 1] && /^[a-zA-Z0-9_-]{11}$/.test(parts[embedIdx + 1])) {
      return parts[embedIdx + 1];
    }
    const shortsIdx = parts.indexOf("shorts");
    if (shortsIdx >= 0 && parts[shortsIdx + 1] && /^[a-zA-Z0-9_-]{11}$/.test(parts[shortsIdx + 1])) {
      return parts[shortsIdx + 1];
    }

    return null;
  } catch {
    return null;
  }
}

function formatMMSS(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const mm = Math.floor(s / 60);
  const ss = s % 60;
  return `${String(mm).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;
}

function pad2(n: number) {
  return String(n).padStart(2, "0");
}
function dayKey(d = new Date()) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function readNumber(key: string): number {
  try {
    const v = window.localStorage.getItem(key);
    const n = v ? Number(v) : 0;
    return Number.isFinite(n) ? n : 0;
  } catch {
    return 0;
  }
}
function writeNumber(key: string, value: number) {
  try {
    window.localStorage.setItem(key, String(Math.max(0, Math.floor(value))));
  } catch {
    // ignore
  }
}

function readJSON<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}
function writeJSON(key: string, value: unknown) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore
  }
}

function removeKey(key: string) {
  try {
    window.localStorage.removeItem(key);
  } catch {
    // ignore
  }
}

function makeId(): string {
  const c = (globalThis as unknown as { crypto?: Crypto }).crypto;
  if (c?.randomUUID) return c.randomUUID();
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

/* =========================
   Storage keys by day
========================= */

function learnKeyByDay(day: string) {
  return `ytdoro:${day}:learnSec`;
}
function restKeyByDay(day: string) {
  return `ytdoro:${day}:restSec`;
}
function legacyBreakKeyByDay(day: string) {
  return `ytdoro:${day}:breakSec`;
}
function topicKeyByDay(day: string) {
  return `ytdoro:${day}:topic`;
}
function notesKeyByDay(day: string) {
  return `ytdoro:${day}:notes`;
}

/* =========================
   Notes types
========================= */

type NoteKind =
  | "topic_set"
  | "learn_done"
  | "learn_stop"
  | "rest_done"
  | "rest_stop"
  | "yt_rest_done"
  | "yt_rest_stop";

type DailyNoteEntry = {
  id: string;
  ts: number;
  day: string;
  kind: NoteKind;
  topic: string;
  deltaLearnSec: number;
  deltaRestSec: number;
  totalLearnSec: number;
  totalRestSec: number;
};

function kindLabel(kind: NoteKind): string {
  switch (kind) {
    case "topic_set":
      return "Topik disimpan";
    case "learn_done":
      return "Learning selesai";
    case "learn_stop":
      return "Learning dihentikan";
    case "rest_done":
      return "Rest selesai";
    case "rest_stop":
      return "Rest dihentikan";
    case "yt_rest_done":
      return "Rest YouTube selesai";
    case "yt_rest_stop":
      return "Rest YouTube dihentikan";
    default:
      return "Catatan";
  }
}

/* =========================
   Icons (inline SVG)
========================= */

function IconNotebook({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden="true">
      <path
        d="M7 4h10a2 2 0 0 1 2 2v14a1 1 0 0 1-1 1H7a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <path d="M8 7h8M8 10h8M8 13h8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M5.5 6.5h-1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M5.5 10h-1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M5.5 13.5h-1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function kindIcon(kind: NoteKind) {
  const base = "grid h-10 w-10 place-items-center rounded-xl border border-white/10 bg-white/5 text-white/80";
  const svg = (path: ReactNode) => (
    <div className={base}>
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden="true">
        {path}
      </svg>
    </div>
  );

  switch (kind) {
    case "topic_set":
      return svg(
        <>
          <path
            d="M4 20h4l10.5-10.5a1.5 1.5 0 0 0 0-2.1L16.6 5.5a1.5 1.5 0 0 0-2.1 0L4 16v4Z"
            stroke="currentColor"
            strokeWidth="1.6"
          />
          <path d="M13.5 6.5l4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </>
      );
    case "learn_done":
      return svg(
        <>
          <path
            d="M20 6 9 17l-5-5"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </>
      );
    case "learn_stop":
      return svg(
        <>
          <path d="M7 7h10v10H7z" stroke="currentColor" strokeWidth="1.8" />
        </>
      );
    case "rest_done":
      return svg(
        <>
          <path
            d="M7 8h9a4 4 0 0 1 0 8H7V8Z"
            stroke="currentColor"
            strokeWidth="1.6"
          />
          <path d="M7 16h10" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          <path d="M6 6v14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </>
      );
    case "rest_stop":
      return svg(
        <>
          <path d="M7 6v12M17 6v12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </>
      );
    case "yt_rest_done":
      return svg(
        <>
          <path
            d="M10 8.5v7l6-3.5-6-3.5Z"
            fill="currentColor"
          />
          <path
            d="M4.5 9.3c.2-1.1 1-2 2.2-2.2A64 64 0 0 1 12 7c1.7 0 3.4.1 5.3.3 1.1.2 2 .9 2.2 2.2.2 1 .3 1.8.3 2.7 0 .9-.1 1.7-.3 2.7-.2 1.1-1 2-2.2 2.2-1.9.2-3.6.3-5.3.3-1.7 0-3.4-.1-5.3-.3-1.1-.2-2-.9-2.2-2.2-.2-1-.3-1.8-.3-2.7 0-.9.1-1.7.3-2.7Z"
            stroke="currentColor"
            strokeWidth="1.4"
          />
        </>
      );
    case "yt_rest_stop":
      return svg(
        <>
          <path
            d="M10 8.5v7l6-3.5-6-3.5Z"
            fill="currentColor"
          />
          <path d="M7 6v12M17 6v12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </>
      );
    default:
      return svg(<path d="M12 6v6l4 2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />);
  }
}

/* =========================
   YouTube wrapper typing
========================= */

type PlayerLike = {
  playVideo: () => void;
  pauseVideo: () => void;
  stopVideo: () => void;
  seekTo: (seconds: number, allowSeekAhead: boolean) => void;
  getDuration: () => number;
  getCurrentTime: () => number;
};

type YouTubeReadyEvent = { target: PlayerLike };
type YouTubeStateChangeEvent = { target: PlayerLike; data: number };

type YouTubeComponentProps = {
  videoId: string;
  opts?: {
    width?: string | number;
    height?: string | number;
    playerVars?: Record<string, string | number>;
  };
  onReady?: (event: YouTubeReadyEvent) => void;
  onPlay?: () => void;
  onPause?: () => void;
  onEnd?: () => void;
  onError?: () => void;
  onStateChange?: (event: YouTubeStateChangeEvent) => void;
};

const YouTube = dynamic(() => import("react-youtube"), { ssr: false }) as unknown as ComponentType<YouTubeComponentProps>;

/* =========================
   UI atoms
========================= */

function Pill({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/80">
      {children}
    </span>
  );
}

function IconButton({
  title,
  onClick,
  children,
}: {
  title: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className="inline-flex h-9 w-9 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-white/80 shadow-[0_18px_70px_rgba(0,0,0,0.45)] backdrop-blur-xl transition hover:bg-white/10"
    >
      {children}
    </button>
  );
}

function SoftButton({
  children,
  onClick,
  disabled,
  variant = "primary",
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  variant?: "primary" | "ghost" | "danger";
}) {
  const base =
    "inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm font-semibold transition border";
  const primary =
    "border-white/10 bg-white/10 hover:bg-white/15 active:bg-white/20 text-white";
  const ghost =
    "border-white/10 bg-transparent hover:bg-white/10 active:bg-white/15 text-white/80";
  const danger =
    "border-red-500/25 bg-red-500/10 hover:bg-red-500/15 active:bg-red-500/20 text-red-100";
  const dis = "opacity-40 cursor-not-allowed";

  const cls =
    variant === "danger" ? danger : variant === "ghost" ? ghost : primary;

  return (
    <button
      onClick={disabled ? undefined : onClick}
      className={`${base} ${cls} ${disabled ? dis : ""}`}
      type="button"
    >
      {children}
    </button>
  );
}

function TinyPreset({ children, onClick }: { children: ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm font-semibold text-white/80 hover:bg-white/10"
    >
      {children}
    </button>
  );
}

function Segmented({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: Array<{ label: string; value: string }>;
}) {
  return (
    <div className="inline-flex rounded-2xl border border-white/10 bg-white/5 p-1">
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            className={`rounded-xl px-3 py-2 text-sm font-semibold transition ${
              active ? "bg-white/10 text-white" : "text-white/70 hover:bg-white/10"
            }`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

function GlassCard({
  title,
  subtitle,
  status,
  children,
}: {
  title: string;
  subtitle: string;
  status: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/[0.05] p-6 shadow-[0_20px_80px_rgba(0,0,0,0.55)] backdrop-blur-xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-lg font-bold text-white">{title}</div>
          <div className="mt-1 text-sm text-white/60">{subtitle}</div>
        </div>
        <Pill>
          <span className="text-white/60">Status:</span>
          <span className="font-semibold text-white">{status}</span>
        </Pill>
      </div>
      <div className="mt-5">{children}</div>
    </div>
  );
}

function Divider() {
  return <div className="my-5 h-px w-full bg-white/10" />;
}

/* =========================
   Modal
========================= */

function Modal({
  open,
  title,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  useEffect(() => {
    if (!open) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      <div
        className="absolute inset-0 bg-black/60"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="absolute inset-0 p-4 md:p-8">
        <div className="mx-auto h-full max-w-6xl overflow-hidden rounded-3xl border border-white/10 bg-zinc-950/80 shadow-[0_30px_120px_rgba(0,0,0,0.75)] backdrop-blur-xl">
          <div className="flex items-center justify-between gap-3 border-b border-white/10 px-5 py-4">
            <div className="text-lg font-bold text-white">{title}</div>
            <SoftButton variant="ghost" onClick={onClose}>
              Tutup
            </SoftButton>
          </div>
          <div className="h-[calc(100%-64px)] overflow-y-auto px-5 py-5">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

/* =========================
   Beep hook (LOUD)
========================= */

function useBeep() {
  const audioCtxRef = useRef<AudioContext | null>(null);

  function getAudioContext(): AudioContext | null {
    const W = window as unknown as {
      AudioContext?: typeof AudioContext;
      webkitAudioContext?: typeof AudioContext;
    };
    const Ctx = W.AudioContext ?? W.webkitAudioContext;
    if (!Ctx) return null;
    if (!audioCtxRef.current) audioCtxRef.current = new Ctx();
    return audioCtxRef.current;
  }

  async function primeAudio() {
    try {
      const ctx = getAudioContext();
      if (!ctx) return;
      if (ctx.state === "suspended") await ctx.resume();
    } catch {
      // ignore
    }
  }

  function beepOnce(freq = 880, ms = 260) {
    try {
      const ctx = getAudioContext();
      if (!ctx) return;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "square";
      osc.frequency.value = freq;

      const t = ctx.currentTime;
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(0.9, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + ms / 1000);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(t);
      osc.stop(t + ms / 1000 + 0.03);
    } catch {
      // ignore
    }
  }

  function beepTriple() {
    beepOnce(880, 260);
    window.setTimeout(() => beepOnce(880, 260), 300);
    window.setTimeout(() => beepOnce(880, 260), 600);
  }

  function cleanup() {
    try {
      audioCtxRef.current?.close?.();
    } catch {
      // ignore
    }
    audioCtxRef.current = null;
  }

  return { primeAudio, beepTriple, cleanup };
}

/* =========================
   PAGE
========================= */

export default function Page() {
  // hydration-safe initial render
  const [today, setToday] = useState<string>("");
  const [topicToday, setTopicToday] = useState<string>("");
  const [totalLearnSec, setTotalLearnSec] = useState<number>(0);
  const [totalRestSec, setTotalRestSec] = useState<number>(0);

  const [notesOpen, setNotesOpen] = useState(false);
  const [notesBump, setNotesBump] = useState<number>(0);

  // refs (avoid stale)
  const todayRef = useRef<string>("");
  const topicRef = useRef<string>("");
  const learnRef = useRef<number>(0);
  const restRef = useRef<number>(0);

  useEffect(() => {
    todayRef.current = today;
  }, [today]);
  useEffect(() => {
    topicRef.current = topicToday;
  }, [topicToday]);
  useEffect(() => {
    learnRef.current = totalLearnSec;
  }, [totalLearnSec]);
  useEffect(() => {
    restRef.current = totalRestSec;
  }, [totalRestSec]);

  // load initial data on client
  useEffect(() => {
    const d = dayKey();
    const lk = learnKeyByDay(d);
    const rk = restKeyByDay(d);
    const bk = legacyBreakKeyByDay(d);
    const tk = topicKeyByDay(d);

    startTransition(() => {
      setToday(d);

      const learn = readNumber(lk);
      const legacy = readNumber(bk);
      const rest = readNumber(rk) || legacy;

      const t = (window.localStorage.getItem(tk) || "").trim();

      setTotalLearnSec(learn);
      setTotalRestSec(rest);
      setTopicToday(t);

      // migrate legacy break if needed
      if (readNumber(rk) === 0 && legacy > 0) writeNumber(rk, legacy);
    });
  }, []);

  function appendNote(day: string, entry: DailyNoteEntry) {
    const nk = notesKeyByDay(day);
    const list = readJSON<DailyNoteEntry[]>(nk, []);
    list.unshift(entry);
    writeJSON(nk, list);
    setNotesBump((v) => v + 1);
  }

  function saveTopicForToday(topic: string) {
    const day = todayRef.current;
    if (!day) return;

    const t = topic.trim();
    window.localStorage.setItem(topicKeyByDay(day), t);

    setTopicToday(t);
    topicRef.current = t;

    const learn = readNumber(learnKeyByDay(day));
    const rest = readNumber(restKeyByDay(day)) || readNumber(legacyBreakKeyByDay(day));

    appendNote(day, {
      id: makeId(),
      ts: Date.now(),
      day,
      kind: "topic_set",
      topic: t,
      deltaLearnSec: 0,
      deltaRestSec: 0,
      totalLearnSec: learn,
      totalRestSec: rest,
    });
  }

  function logLearn(kind: "learn_done" | "learn_stop", seconds: number) {
    const day = todayRef.current;
    if (!day) return;

    const delta = Math.max(0, Math.floor(seconds));
    const nextLearn = learnRef.current + delta;

    learnRef.current = nextLearn;
    setTotalLearnSec(nextLearn);
    writeNumber(learnKeyByDay(day), nextLearn);

    appendNote(day, {
      id: makeId(),
      ts: Date.now(),
      day,
      kind,
      topic: topicRef.current || "",
      deltaLearnSec: delta,
      deltaRestSec: 0,
      totalLearnSec: nextLearn,
      totalRestSec: restRef.current,
    });
  }

  function logRest(kind: NoteKind, seconds: number) {
    const day = todayRef.current;
    if (!day) return;

    const delta = Math.max(0, Math.floor(seconds));
    const nextRest = restRef.current + delta;

    restRef.current = nextRest;
    setTotalRestSec(nextRest);
    writeNumber(restKeyByDay(day), nextRest);

    appendNote(day, {
      id: makeId(),
      ts: Date.now(),
      day,
      kind,
      topic: topicRef.current || "",
      deltaLearnSec: 0,
      deltaRestSec: delta,
      totalLearnSec: learnRef.current,
      totalRestSec: nextRest,
    });
  }

  function clearNotesForDay(day: string) {
    // remove ONLY entries (not totals, not topic)
    writeJSON(notesKeyByDay(day), []);
    setNotesBump((v) => v + 1);
  }

  function resetTodayAll() {
    const day = todayRef.current;
    if (!day) return;

    setTotalLearnSec(0);
    setTotalRestSec(0);
    learnRef.current = 0;
    restRef.current = 0;

    writeNumber(learnKeyByDay(day), 0);
    writeNumber(restKeyByDay(day), 0);
    writeNumber(legacyBreakKeyByDay(day), 0);

    // notes + topic tetap (tidak dihapus)
    setNotesBump((v) => v + 1);
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-zinc-950 text-white">
      {/* background blobs */}
      <div className="pointer-events-none absolute -top-24 -left-24 h-[420px] w-[420px] rounded-full bg-indigo-500/25 blur-3xl" />
      <div className="pointer-events-none absolute top-1/3 -right-28 h-[520px] w-[520px] rounded-full bg-purple-500/20 blur-3xl" />
      <div className="pointer-events-none absolute bottom-[-140px] left-1/3 h-[520px] w-[520px] rounded-full bg-sky-500/15 blur-3xl" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(255,255,255,0.08),transparent_60%)]" />

      <div className="relative mx-auto max-w-6xl px-6 py-10">
        {/* header */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="text-3xl font-extrabold tracking-tight">youtubedoro</div>
            <div className="mt-1 text-sm text-white/60">
              Learning countdown + Rest (biasa / YouTube) + Daily Notes.
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* ICON notes terpisah (tidak menyatu dengan pill tanggal) */}
            <IconButton title="Daily Notes" onClick={() => setNotesOpen(true)}>
              <IconNotebook className="h-5 w-5" />
            </IconButton>

            <Pill>{today ? `Tanggal: ${today}` : "Tanggal: --"}</Pill>

            <Pill>
              <span className="text-white/60">Total Learning:</span>
              <span className="font-semibold">{formatMMSS(totalLearnSec)}</span>
            </Pill>

            <Pill>
              <span className="text-white/60">Total Rest:</span>
              <span className="font-semibold">{formatMMSS(totalRestSec)}</span>
            </Pill>
          </div>
        </div>

        {/* main cards */}
        <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
          <LearningCard
            topicToday={topicToday}
            onSaveTopic={saveTopicForToday}
            totalTodaySec={totalLearnSec}
            onLearnDone={(sec) => logLearn("learn_done", sec)}
            onLearnStop={(sec) => logLearn("learn_stop", sec)}
            onResetToday={resetTodayAll}
          />

          <RestCard
            topicToday={topicToday}
            totalTodaySec={totalRestSec}
            onRestDone={(sec) => logRest("rest_done", sec)}
            onRestStop={(sec) => logRest("rest_stop", sec)}
            onYTDone={(sec) => logRest("yt_rest_done", sec)}
            onYTStop={(sec) => logRest("yt_rest_stop", sec)}
          />
        </div>
      </div>

      {/* DAILY NOTES MODAL */}
      <Modal open={notesOpen} title="Daily Notes" onClose={() => setNotesOpen(false)}>
        <NotesPanel
          today={today}
          notesBump={notesBump}
          onClearNotesForDay={clearNotesForDay}
        />
      </Modal>
    </div>
  );
}

/* =========================
   Learning Card
========================= */

function LearningCard({
  topicToday,
  onSaveTopic,
  totalTodaySec,
  onLearnDone,
  onLearnStop,
  onResetToday,
}: {
  topicToday: string;
  onSaveTopic: (topic: string) => void;
  totalTodaySec: number;
  onLearnDone: (seconds: number) => void;
  onLearnStop: (seconds: number) => void;
  onResetToday: () => void;
}) {
  const [topicDraft, setTopicDraft] = useState<string>(topicToday);

  const [minutes, setMinutes] = useState<number>(25);
  const [status, setStatus] = useState<"Idle" | "Running" | "Paused" | "Done">("Idle");

  const [startedAt, setStartedAt] = useState<Date | null>(null);
  const [targetSec, setTargetSec] = useState<number>(25 * 60);

  const [elapsedSec, setElapsedSec] = useState<number>(0);
  const [remainingSec, setRemainingSec] = useState<number>(0);

  const timerRef = useRef<number | null>(null);
  const { primeAudio, beepTriple, cleanup } = useBeep();

  useEffect(() => {
    setTopicDraft(topicToday);
  }, [topicToday]);

  function clear() {
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }

  function saveTopic() {
    onSaveTopic(topicDraft);
  }

  function start() {
    primeAudio();
    clear();

    const m = Math.max(1, Math.floor(minutes));
    const t = m * 60;

    setTargetSec(t);
    setElapsedSec(0);
    setRemainingSec(t);
    setStartedAt(new Date());
    setStatus("Running");

    const startTs = Date.now();

    timerRef.current = window.setInterval(() => {
      const el = Math.floor((Date.now() - startTs) / 1000);
      const rem = Math.max(0, t - el);

      setElapsedSec(el);
      setRemainingSec(rem);

      if (rem <= 0) {
        clear();
        setStatus("Done");

        onLearnDone(t);
        beepTriple();

        try {
          if (typeof Notification !== "undefined" && Notification.permission === "granted") {
            new Notification("Learning selesai", { body: "Waktunya rest." });
          }
        } catch {
          // ignore
        }
      }
    }, 250);
  }

  function stop() {
    if (status !== "Running") return;
    clear();
    setStatus("Paused");
    onLearnStop(elapsedSec);
  }

  useEffect(() => {
    return () => {
      clear();
      cleanup();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <GlassCard title="Learning" subtitle="Isi topik dulu, lalu mulai. Catatan otomatis dibuat saat selesai/stop." status={status}>
      <div>
        <div className="text-xs text-white/60">Belajar apa?</div>
        <textarea
          value={topicDraft}
          onChange={(e) => setTopicDraft(e.target.value)}
          placeholder="Contoh: React Hooks, Next.js routing, dsb."
          rows={3}
          className="mt-2 w-full resize-none rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none placeholder:text-white/30 focus:border-white/20"
        />
        <div className="mt-3 flex flex-wrap gap-3">
          <SoftButton onClick={saveTopic}>Simpan topik</SoftButton>
          <Pill>
            <span className="text-white/60">Topik tersimpan:</span>
            <span className="font-semibold text-white">{topicToday?.trim() ? topicToday : "-"}</span>
          </Pill>
        </div>
      </div>

      <Divider />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-[1fr_auto] md:items-end">
        <div>
          <div className="text-xs text-white/60">Durasi learning (menit)</div>
          <input
            type="number"
            value={minutes}
            min={1}
            onChange={(e) => setMinutes(Number(e.target.value))}
            className="mt-2 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none placeholder:text-white/30 focus:border-white/20"
          />
        </div>

        <div className="md:text-right">
          <div className="text-xs text-white/60">Preset</div>
          <div className="mt-2 flex gap-2 md:justify-end">
            <TinyPreset onClick={() => setMinutes(25)}>25</TinyPreset>
            <TinyPreset onClick={() => setMinutes(50)}>50</TinyPreset>
          </div>
        </div>
      </div>

      <div className="mt-6 text-6xl font-extrabold tracking-tight tabular-nums">{formatMMSS(remainingSec)}</div>

      <div className="mt-4 flex flex-wrap gap-3 text-xs text-white/60">
        <span>
          Started at: <span className="text-white/80">{startedAt ? startedAt.toLocaleTimeString() : "-"}</span>
        </span>
        <span>
          Elapsed: <span className="text-white/80">{formatMMSS(elapsedSec)}</span>
        </span>
        <span>
          Target: <span className="text-white/80">{formatMMSS(targetSec)}</span>
        </span>
      </div>

      <div className="mt-5 flex flex-wrap gap-3">
        <SoftButton onClick={start} disabled={status === "Running"}>
          Start learning
        </SoftButton>
        <SoftButton onClick={stop} disabled={status !== "Running"} variant="ghost">
          Stop
        </SoftButton>
        <SoftButton onClick={onResetToday} variant="ghost">
          Reset hari ini
        </SoftButton>
      </div>

      <Divider />

      <div className="text-sm text-white/70">
        Total learning hari ini: <span className="font-semibold text-white">{formatMMSS(totalTodaySec)}</span>
      </div>
      <div className="mt-2 text-xs text-white/50">Beep lebih besar saat timer selesai (pastikan tab tidak mute).</div>
    </GlassCard>
  );
}

/* =========================
   Rest Card
========================= */

function RestCard({
  topicToday,
  totalTodaySec,
  onRestDone,
  onRestStop,
  onYTDone,
  onYTStop,
}: {
  topicToday: string;
  totalTodaySec: number;
  onRestDone: (sec: number) => void;
  onRestStop: (sec: number) => void;
  onYTDone: (sec: number) => void;
  onYTStop: (sec: number) => void;
}) {
  const [mode, setMode] = useState<"plain" | "youtube">("plain");
  const statusLabel = mode === "plain" ? "Rest biasa" : "Rest YouTube";

  return (
    <GlassCard title="Rest" subtitle="Rest biasa atau rest dengan YouTube. Catatan otomatis dibuat saat selesai/stop." status={statusLabel}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Segmented
          value={mode}
          onChange={(v) => setMode(v as "plain" | "youtube")}
          options={[
            { label: "Rest biasa", value: "plain" },
            { label: "Rest (YouTube)", value: "youtube" },
          ]}
        />
        <Pill>
          <span className="text-white/60">Topik:</span>
          <span className="font-semibold text-white">{topicToday?.trim() ? topicToday : "-"}</span>
        </Pill>
      </div>

      <Divider />

      {mode === "plain" ? (
        <PlainRestPanel totalTodaySec={totalTodaySec} onDone={onRestDone} onStop={onRestStop} />
      ) : (
        <YouTubeRestPanel totalTodaySec={totalTodaySec} onDone={onYTDone} onStop={onYTStop} />
      )}
    </GlassCard>
  );
}

/* =========================
   Plain Rest Panel
========================= */

function PlainRestPanel({
  totalTodaySec,
  onDone,
  onStop,
}: {
  totalTodaySec: number;
  onDone: (sec: number) => void;
  onStop: (sec: number) => void;
}) {
  const [minutes, setMinutes] = useState<number>(5);
  const [status, setStatus] = useState<"Idle" | "Running" | "Paused" | "Done">("Idle");

  const [targetSec, setTargetSec] = useState<number>(5 * 60);
  const [elapsedSec, setElapsedSec] = useState<number>(0);
  const [remainingSec, setRemainingSec] = useState<number>(0);

  const timerRef = useRef<number | null>(null);
  const { primeAudio, beepTriple, cleanup } = useBeep();

  function clear() {
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }

  function start() {
    primeAudio();
    clear();

    const m = Math.max(1, Math.floor(minutes));
    const t = m * 60;

    setTargetSec(t);
    setElapsedSec(0);
    setRemainingSec(t);
    setStatus("Running");

    const startTs = Date.now();

    timerRef.current = window.setInterval(() => {
      const el = Math.floor((Date.now() - startTs) / 1000);
      const rem = Math.max(0, t - el);

      setElapsedSec(el);
      setRemainingSec(rem);

      if (rem <= 0) {
        clear();
        setStatus("Done");
        onDone(t);
        beepTriple();
      }
    }, 250);
  }

  function stop() {
    if (status !== "Running") return;
    clear();
    setStatus("Paused");
    onStop(elapsedSec);
  }

  function reset() {
    clear();
    setStatus("Idle");
    setElapsedSec(0);
    setRemainingSec(0);
  }

  useEffect(() => {
    return () => {
      clear();
      cleanup();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-[1fr_auto] md:items-end">
        <div>
          <div className="text-xs text-white/60">Durasi rest (menit)</div>
          <input
            type="number"
            value={minutes}
            min={1}
            onChange={(e) => setMinutes(Number(e.target.value))}
            className="mt-2 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none placeholder:text-white/30 focus:border-white/20"
          />
        </div>

        <div className="md:text-right">
          <div className="text-xs text-white/60">Preset</div>
          <div className="mt-2 flex gap-2 md:justify-end">
            <TinyPreset onClick={() => setMinutes(5)}>5</TinyPreset>
            <TinyPreset onClick={() => setMinutes(10)}>10</TinyPreset>
            <TinyPreset onClick={() => setMinutes(15)}>15</TinyPreset>
          </div>
        </div>
      </div>

      <div className="mt-6 text-6xl font-extrabold tracking-tight tabular-nums">{formatMMSS(remainingSec)}</div>

      <div className="mt-4 flex flex-wrap gap-3 text-xs text-white/60">
        <span>
          Elapsed: <span className="text-white/80">{formatMMSS(elapsedSec)}</span>
        </span>
        <span>
          Target: <span className="text-white/80">{formatMMSS(targetSec)}</span>
        </span>
        <span>
          Status: <span className="text-white/80">{status}</span>
        </span>
      </div>

      <div className="mt-5 flex flex-wrap gap-3">
        <SoftButton onClick={start} disabled={status === "Running"}>
          Start rest
        </SoftButton>
        <SoftButton onClick={stop} disabled={status !== "Running"} variant="ghost">
          Stop
        </SoftButton>
        <SoftButton onClick={reset} variant="ghost">
          Reset
        </SoftButton>
      </div>

      <Divider />

      <div className="text-sm text-white/70">
        Total rest hari ini: <span className="font-semibold text-white">{formatMMSS(totalTodaySec)}</span>
      </div>
    </div>
  );
}

/* =========================
   YouTube Rest Panel
========================= */

function YouTubeRestPanel({
  totalTodaySec,
  onDone,
  onStop,
}: {
  totalTodaySec: number;
  onDone: (sec: number) => void;
  onStop: (sec: number) => void;
}) {
  const [input, setInput] = useState("");
  const [status, setStatus] = useState<"Idle" | "Playing" | "Paused" | "Ended" | "Error">("Idle");

  const [videoId, setVideoId] = useState<string | null>(null);
  const [durationSec, setDurationSec] = useState<number>(0);
  const [remainingSec, setRemainingSec] = useState<number>(0);
  const [errorMsg, setErrorMsg] = useState<string>("");

  const playerRef = useRef<PlayerLike | null>(null);
  const tickRef = useRef<number | null>(null);

  // prevent double count (onEnd + onStateChange(0))
  const countedRef = useRef<boolean>(false);

  function clearTick() {
    if (tickRef.current !== null) {
      window.clearInterval(tickRef.current);
      tickRef.current = null;
    }
  }

  function tickOnce() {
    const p = playerRef.current;
    if (!p) return;

    const d = p.getDuration?.() ?? 0;
    const t = p.getCurrentTime?.() ?? 0;

    if (d > 0) setDurationSec(Math.floor(d));
    if (d > 0) setRemainingSec(Math.max(0, Math.floor(d - t)));
  }

  function startTick() {
    clearTick();
    tickRef.current = window.setInterval(tickOnce, 250);
  }

  function startRestYoutube() {
    setErrorMsg("");
    clearTick();

    const id = extractYouTubeVideoId(input);
    if (!id) {
      setStatus("Error");
      setErrorMsg("URL/ID YouTube tidak valid.");
      return;
    }

    countedRef.current = false;
    setVideoId(id);
    setDurationSec(0);
    setRemainingSec(0);
    setStatus("Idle");
  }

  function stopRestYoutube() {
    const p = playerRef.current;
    if (!p) return;

    if (!countedRef.current) {
      const used = Math.max(0, Math.floor(p.getCurrentTime?.() ?? 0));
      if (used > 0) onStop(used);
      countedRef.current = true;
    }

    clearTick();
    p.stopVideo?.();
    setStatus("Idle");
    setVideoId(null);
    setDurationSec(0);
    setRemainingSec(0);
  }

  function openInYouTube() {
    const id = extractYouTubeVideoId(input) || videoId;
    if (!id) return;
    window.open(`https://www.youtube.com/watch?v=${id}`, "_blank", "noopener,noreferrer");
  }

  useEffect(() => () => clearTick(), []);

  function handleEndedCount() {
    if (countedRef.current) return;
    countedRef.current = true;

    const p = playerRef.current;
    const d = durationSec || Math.floor(p?.getDuration?.() ?? 0);
    if (d > 0) onDone(d);
  }

  return (
    <div>
      <input
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="Tempel link YouTube lalu Start rest"
        className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none placeholder:text-white/30 focus:border-white/20"
      />

      <div className="mt-3 flex flex-wrap gap-3">
        <SoftButton onClick={startRestYoutube}>Start rest</SoftButton>
        <SoftButton onClick={stopRestYoutube} variant="ghost" disabled={!videoId}>
          Stop
        </SoftButton>
        <SoftButton onClick={openInYouTube} variant="ghost">
          Open in YouTube
        </SoftButton>
      </div>

      {status === "Error" && <div className="mt-3 text-sm text-red-300">{errorMsg}</div>}

      <Divider />

      <div className="text-6xl font-extrabold tracking-tight tabular-nums">{formatMMSS(remainingSec)}</div>

      <div className="mt-3 text-xs text-white/60">
        Video ID: <span className="text-white/80">{videoId ?? "-"}</span>
        &nbsp;&nbsp; Duration: <span className="text-white/80">{durationSec ? formatMMSS(durationSec) : "-"}</span>
        &nbsp;&nbsp; Status: <span className="text-white/80">{status}</span>
      </div>

      {videoId && (
        <div className="mt-5 overflow-hidden rounded-2xl border border-white/10">
          <YouTube
            key={videoId}
            videoId={videoId}
            opts={{
              width: "100%",
              height: 300,
              playerVars: { rel: 0, modestbranding: 1 },
            }}
            onReady={(event) => {
              playerRef.current = event.target;
              setStatus("Idle");
              tickOnce();
            }}
            onPlay={() => {
              setStatus("Playing");
              tickOnce();
              startTick();
            }}
            onPause={() => {
              setStatus("Paused");
              clearTick();
              tickOnce();
            }}
            onEnd={() => {
              setStatus("Ended");
              clearTick();
              setRemainingSec(0);
              handleEndedCount();
            }}
            onError={() => {
              setStatus("Error");
              clearTick();
              setErrorMsg("Video gagal diputar (embed dibatasi / region / jaringan).");
            }}
            onStateChange={(event) => {
              if (event.data === 1) {
                setStatus("Playing");
                startTick();
              } else if (event.data === 2) {
                setStatus("Paused");
                clearTick();
              } else if (event.data === 0) {
                setStatus("Ended");
                clearTick();
                setRemainingSec(0);
                handleEndedCount();
              }
            }}
          />
        </div>
      )}

      <Divider />

      <div className="text-sm text-white/70">
        Total rest hari ini: <span className="font-semibold text-white">{formatMMSS(totalTodaySec)}</span>
      </div>
    </div>
  );
}

/* =========================
   Notes Panel (NO TOPIC INPUT)
========================= */

function NotesPanel({
  today,
  notesBump,
  onClearNotesForDay,
}: {
  today: string;
  notesBump: number;
  onClearNotesForDay: (day: string) => void;
}) {
  const [selectedDay, setSelectedDay] = useState<string>("");
  const [learnTotal, setLearnTotal] = useState<number>(0);
  const [restTotal, setRestTotal] = useState<number>(0);
  const [entries, setEntries] = useState<DailyNoteEntry[]>([]);

  // default day = today
  useEffect(() => {
    if (!today) return;
    if (selectedDay) return;
    startTransition(() => setSelectedDay(today));
  }, [today, selectedDay]);

  // load data
  useEffect(() => {
    if (!selectedDay) return;

    startTransition(() => {
      const learn = readNumber(learnKeyByDay(selectedDay));
      const rest = readNumber(restKeyByDay(selectedDay)) || readNumber(legacyBreakKeyByDay(selectedDay));
      const list = readJSON<DailyNoteEntry[]>(notesKeyByDay(selectedDay), []);

      setLearnTotal(learn);
      setRestTotal(rest);
      setEntries(list);
    });
  }, [selectedDay, notesBump]);

  function removeNotes() {
    if (!selectedDay) return;
    if (entries.length === 0) return;

    const ok = window.confirm(`Hapus semua notes untuk tanggal ${selectedDay}? (Tidak menghapus total waktu & topik tersimpan)`);
    if (!ok) return;

    onClearNotesForDay(selectedDay);
    setEntries([]);
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="text-xs text-white/60">Tanggal</div>
            <input
              type="date"
              value={selectedDay}
              onChange={(e) => setSelectedDay(e.target.value)}
              className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none"
            />
          </div>

          <Pill>
            <span className="text-white/60">Total Belajar:</span>
            <span className="font-semibold text-white">{formatMMSS(learnTotal)}</span>
          </Pill>

          <Pill>
            <span className="text-white/60">Total Rest:</span>
            <span className="font-semibold text-white">{formatMMSS(restTotal)}</span>
          </Pill>
        </div>

        <SoftButton variant="danger" onClick={removeNotes} disabled={!selectedDay || entries.length === 0}>
          Remove Notes
        </SoftButton>
      </div>

      <Divider />

      <div>
        <div className="flex items-center justify-between gap-3">
          <div className="text-sm font-semibold text-white">Entries</div>
          <div className="text-xs text-white/50">Tampilan rapat: icon kiri + info ringkas</div>
        </div>

        {entries.length === 0 ? (
          <div className="mt-2 text-sm text-white/60">Belum ada catatan pada tanggal ini.</div>
        ) : (
          <div className="mt-3 space-y-2">
            {entries.map((e) => {
              const time = new Date(e.ts).toLocaleTimeString();
              const topicText = e.topic?.trim() ? e.topic : "-";

              return (
                <div key={e.id} className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/5 p-3">
                  {kindIcon(e.kind)}

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="text-sm font-semibold text-white">
                        {kindLabel(e.kind)}
                        <span className="ml-2 text-xs font-normal text-white/50">{time}</span>
                      </div>
                      <div className="text-xs text-white/60">
                        ΔL <span className="text-white/80">{formatMMSS(e.deltaLearnSec)}</span> · ΔR{" "}
                        <span className="text-white/80">{formatMMSS(e.deltaRestSec)}</span>
                      </div>
                    </div>

                    <div className="mt-1 min-w-0 text-sm text-white/80">
                      <span className="text-white/60">Topik:</span>{" "}
                      <span className="inline-block max-w-full truncate align-bottom">{topicText}</span>
                    </div>

                    <div className="mt-1 text-xs text-white/60">
                      Total Belajar: <span className="text-white/80">{formatMMSS(e.totalLearnSec)}</span> · Total Rest:{" "}
                      <span className="text-white/80">{formatMMSS(e.totalRestSec)}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="mt-4 text-xs text-white/50">
          “Remove Notes” hanya menghapus entries pada tanggal itu. Total waktu & topik tersimpan tidak ikut terhapus.
        </div>
      </div>
    </div>
  );
}
