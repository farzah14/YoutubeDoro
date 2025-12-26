// src/app/page.tsx
"use client";

import dynamic from "next/dynamic";
import type { ComponentType, ReactNode } from "react";
import { useEffect, useMemo, useRef, useState } from "react";

/* =========================
   Helpers (ONE FILE)
========================= */

function extractYouTubeVideoId(input: string): string | null {
  const raw = input.trim();

  // direct videoId (umumnya 11 chars)
  if (/^[a-zA-Z0-9_-]{11}$/.test(raw)) return raw;

  try {
    const url = new URL(raw);

    // youtu.be/<id>
    if (url.hostname.includes("youtu.be")) {
      const id = url.pathname.split("/").filter(Boolean)[0];
      return id && /^[a-zA-Z0-9_-]{11}$/.test(id) ? id : null;
    }

    // youtube.com/watch?v=<id>
    const v = url.searchParams.get("v");
    if (v && /^[a-zA-Z0-9_-]{11}$/.test(v)) return v;

    // youtube.com/embed/<id> or /shorts/<id>
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

function SoftButton({
  children,
  onClick,
  disabled,
  variant = "primary",
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  variant?: "primary" | "ghost";
}) {
  const base = "inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm font-semibold transition border";
  const primary = "border-white/10 bg-white/10 hover:bg-white/15 active:bg-white/20 text-white";
  const ghost = "border-white/10 bg-transparent hover:bg-white/10 active:bg-white/15 text-white/80";
  const dis = "opacity-40 cursor-not-allowed";

  return (
    <button
      onClick={disabled ? undefined : onClick}
      className={`${base} ${variant === "primary" ? primary : ghost} ${disabled ? dis : ""}`}
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
   PAGE
========================= */

export default function Page() {
  // IMPORTANT: untuk menghindari hydration mismatch:
  // - Render awal selalu 0 (server & client sama)
  // - Setelah mount, baru baca localStorage dan update state
  const [today, setToday] = useState<string>(""); // ditampilkan setelah mount
  const [totalLearnSec, setTotalLearnSec] = useState<number>(0);
  const [totalBreakSec, setTotalBreakSec] = useState<number>(0);

  const keys = useMemo(() => {
    const d = today || ""; // jika belum mount, keys kosong dulu
    return {
      learn: d ? `ytdoro:${d}:learnSec` : "",
      brk: d ? `ytdoro:${d}:breakSec` : "",
    };
  }, [today]);

  useEffect(() => {
    const d = dayKey();

    const learnKey = `ytdoro:${d}:learnSec`;
    const breakKey = `ytdoro:${d}:breakSec`;

    const defer = (fn: () => void) => {
      if (typeof queueMicrotask === "function") queueMicrotask(fn);
      else window.setTimeout(fn, 0);
    };

    defer(() => {
      setToday(d);
      setTotalLearnSec(readNumber(learnKey));
      setTotalBreakSec(readNumber(breakKey));
    });
  }, []);

  function addLearn(seconds: number) {
    const delta = Math.max(0, Math.floor(seconds));
    setTotalLearnSec((prev) => {
      const next = prev + delta;
      if (keys.learn) writeNumber(keys.learn, next);
      return next;
    });
  }

  function addBreak(seconds: number) {
    const delta = Math.max(0, Math.floor(seconds));
    setTotalBreakSec((prev) => {
      const next = prev + delta;
      if (keys.brk) writeNumber(keys.brk, next);
      return next;
    });
  }

  function resetToday() {
    setTotalLearnSec(0);
    setTotalBreakSec(0);
    if (keys.learn) writeNumber(keys.learn, 0);
    if (keys.brk) writeNumber(keys.brk, 0);
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
            <div className="mt-1 text-sm text-white/60">Learning countdown + break mengikuti durasi video YouTube.</div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Pill>{today ? `Tanggal: ${today}` : "Tanggal: --"}</Pill>
            <Pill>
              <span className="text-white/60">Total Learning:</span>
              <span className="font-semibold">{formatMMSS(totalLearnSec)}</span>
            </Pill>
            <Pill>
              <span className="text-white/60">Total Break:</span>
              <span className="font-semibold">{formatMMSS(totalBreakSec)}</span>
            </Pill>
          </div>
        </div>

        {/* grid */}
        <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
          <LearningCard totalTodaySec={totalLearnSec} onAddLearn={addLearn} onResetToday={resetToday} />
          <BreakCard totalTodaySec={totalBreakSec} onAddBreak={addBreak} />
        </div>
      </div>
    </div>
  );
}

/* =========================
   Learning Card (with sound)
========================= */

function LearningCard({
  totalTodaySec,
  onAddLearn,
  onResetToday,
}: {
  totalTodaySec: number;
  onAddLearn: (seconds: number) => void;
  onResetToday: () => void;
}) {
  const [minutes, setMinutes] = useState<number>(25);
  const [status, setStatus] = useState<"Idle" | "Running" | "Paused" | "Done">("Idle");

  const [startedAt, setStartedAt] = useState<Date | null>(null);
  const [targetSec, setTargetSec] = useState<number>(25 * 60);

  const [elapsedSec, setElapsedSec] = useState<number>(0);
  const [remainingSec, setRemainingSec] = useState<number>(0);

  const timerRef = useRef<number | null>(null);

  // ---- SOUND ----
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
    // dipanggil saat klik Start (user gesture)
    try {
      const ctx = getAudioContext();
      if (!ctx) return;
      if (ctx.state === "suspended") await ctx.resume();
    } catch {
      // ignore
    }
  }

  function beepOnce(freq = 880, ms = 220) {
    try {
      const ctx = getAudioContext();
      if (!ctx) return;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.value = freq;

      const t = ctx.currentTime;
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(0.18, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + ms / 1000);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(t);
      osc.stop(t + ms / 1000 + 0.02);
    } catch {
      // ignore
    }
  }

  function playDoneBeep() {
    // 3x
    beepOnce(880, 220);
    window.setTimeout(() => beepOnce(880, 220), 260);
    window.setTimeout(() => beepOnce(880, 220), 520);
  }

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
        onAddLearn(t);

        // SOUND
        playDoneBeep();

        // optional notification
        try {
          if (typeof Notification !== "undefined" && Notification.permission === "granted") {
            new Notification("Learning selesai", { body: "Waktunya break." });
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
    onAddLearn(elapsedSec);
  }

  useEffect(() => {
    return () => {
      clear();
      try {
        audioCtxRef.current?.close?.();
      } catch {
        // ignore
      }
      audioCtxRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <GlassCard title="Learning" subtitle="Set durasi (menit), lalu mulai. Notifikasi muncul saat selesai." status={status}>
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
      <div className="mt-2 text-xs text-white/50">
        Suara beep akan berbunyi saat timer selesai (pastikan tab tidak mute).
      </div>
    </GlassCard>
  );
}

/* =========================
   Break Card (YouTube)
========================= */

function BreakCard({
  totalTodaySec,
  onAddBreak,
}: {
  totalTodaySec: number;
  onAddBreak: (seconds: number) => void;
}) {
  const [input, setInput] = useState("");
  const [status, setStatus] = useState<"Idle" | "Playing" | "Paused" | "Ended" | "Error">("Idle");

  const [videoId, setVideoId] = useState<string | null>(null);
  const [durationSec, setDurationSec] = useState<number>(0);
  const [remainingSec, setRemainingSec] = useState<number>(0);
  const [errorMsg, setErrorMsg] = useState<string>("");

  const playerRef = useRef<PlayerLike | null>(null);
  const tickRef = useRef<number | null>(null);

  // mencegah double-count jika onEnd dan stateChange(0) terpanggil keduanya
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

  function startBreak() {
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

  function stopBreak() {
    const p = playerRef.current;
    if (!p) return;

    // kalau belum dihitung, tambah durasi terpakai
    if (!countedRef.current) {
      const used = Math.max(0, durationSec - remainingSec);
      if (used > 0) onAddBreak(used);
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
    if (d > 0) onAddBreak(d);
  }

  return (
    <GlassCard title="Break (YouTube)" subtitle="Break mengikuti video: PLAY mulai, PAUSE berhenti, ENDED selesai." status={status}>
      <div className="mt-4">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Tempel link YouTube, lalu klik Start break (contoh: https://www.youtube.com/watch?v=...)"
          className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none placeholder:text-white/30 focus:border-white/20"
        />

        <div className="mt-3 flex flex-wrap gap-3">
          <SoftButton onClick={startBreak}>Start break</SoftButton>
          <SoftButton onClick={stopBreak} variant="ghost" disabled={!videoId}>
            Stop
          </SoftButton>
          <SoftButton onClick={openInYouTube} variant="ghost">
            Open in YouTube
          </SoftButton>
        </div>

        {status === "Error" && <div className="mt-3 text-sm text-red-300">{errorMsg}</div>}
      </div>

      <Divider />

      <div className="text-6xl font-extrabold tracking-tight tabular-nums">{formatMMSS(remainingSec)}</div>

      <div className="mt-3 text-xs text-white/60">
        Video ID: <span className="text-white/80">{videoId ?? "-"}</span>
        &nbsp;&nbsp; Duration: <span className="text-white/80">{durationSec ? formatMMSS(durationSec) : "-"}</span>
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
        Total break hari ini: <span className="font-semibold text-white">{formatMMSS(totalTodaySec)}</span>
      </div>
    </GlassCard>
  );
}
