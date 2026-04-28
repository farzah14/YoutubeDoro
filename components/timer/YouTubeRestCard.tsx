"use client";

import dynamic from "next/dynamic";
import { useState, useRef, useEffect, ComponentType } from "react";
import { formatMMSS } from "@/lib/time";
import { extractYouTubeVideoId } from "@/lib/youtube";
import { PlayerLike, YouTubeReadyEvent, YouTubeStateChangeEvent, YouTubeComponentProps } from "@/types";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { Badge } from "../ui/Badge";
import { PlayIcon, PauseIcon, SquareIcon } from "../icons";

const YouTube = dynamic(() => import("react-youtube"), { ssr: false }) as unknown as ComponentType<YouTubeComponentProps>;

interface YouTubeRestCardProps {
  totalTodaySec: number;
  onDone: (sec: number) => void;
  onStop: (sec: number) => void;
}

type YTStatus = "Idle" | "Playing" | "Paused" | "Ended" | "Error";

export function YouTubeRestCard({ totalTodaySec, onDone, onStop }: YouTubeRestCardProps) {
  const [input, setInput] = useState("");
  const [status, setStatus] = useState<YTStatus>("Idle");
  
  const [videoId, setVideoId] = useState<string | null>(null);
  const [durationSec, setDurationSec] = useState<number>(0);
  const [remainingSec, setRemainingSec] = useState<number>(0);
  const [errorMsg, setErrorMsg] = useState<string>("");

  const playerRef = useRef<PlayerLike | null>(null);
  const tickRef = useRef<number | null>(null);
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

  function handleStart() {
    setErrorMsg("");
    clearTick();

    const id = extractYouTubeVideoId(input);
    if (!id) {
      setStatus("Error");
      setErrorMsg("Invalid YouTube URL or ID.");
      return;
    }

    countedRef.current = false;
    setVideoId(id);
    setDurationSec(0);
    setRemainingSec(0);
    setStatus("Idle");
  }

  function handleStop() {
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

  function handlePause() {
    playerRef.current?.pauseVideo?.();
  }

  function handleResume() {
    playerRef.current?.playVideo?.();
  }

  function handleEndedCount() {
    if (countedRef.current) return;
    countedRef.current = true;

    const p = playerRef.current;
    const d = durationSec || Math.floor(p?.getDuration?.() ?? 0);
    if (d > 0) onDone(d);
  }

  useEffect(() => () => clearTick(), []);

  const progress = durationSec > 0 ? remainingSec / durationSec : 0;

  return (
    <div className="flex flex-col space-y-6">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-text-secondary">YouTube Break</span>
        <Badge variant={status === "Playing" ? "success" : status === "Paused" ? "warning" : status === "Error" ? "danger" : "secondary"}>
          {status}
        </Badge>
      </div>

      {!videoId ? (
        <div className="flex flex-col space-y-4 py-8">
          <div className="space-y-2">
            <label className="text-sm font-medium text-text-secondary">Video Link</label>
            <div className="flex gap-2">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Paste YouTube URL..."
                className="flex-1"
                onKeyDown={(e) => e.key === "Enter" && handleStart()}
              />
              <Button onClick={handleStart}>Load</Button>
            </div>
            {errorMsg && <p className="text-xs text-danger">{errorMsg}</p>}
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex justify-between items-end">
            <div className="space-y-1">
              <div className="text-3xl font-mono tracking-tighter">{formatMMSS(remainingSec)}</div>
              <div className="text-xs text-text-muted">Remaining of {formatMMSS(durationSec)}</div>
            </div>
            
            <div className="flex gap-2">
              {status === "Playing" ? (
                <Button onClick={handlePause} variant="secondary" size="icon">
                  <PauseIcon className="h-4 w-4" />
                </Button>
              ) : (
                <Button onClick={handleResume} variant="secondary" size="icon">
                  <PlayIcon className="h-4 w-4" />
                </Button>
              )}
              <Button onClick={handleStop} variant="danger" size="icon">
                <SquareIcon className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="h-1 w-full bg-surface-hover rounded-full overflow-hidden">
            <div 
              className="h-full bg-accent transition-all duration-300"
              style={{ width: `${(1 - progress) * 100}%` }}
            />
          </div>

          <div className="overflow-hidden rounded-md border border-border-subtle bg-black aspect-video relative">
            <YouTube
              videoId={videoId}
              opts={{
                width: "100%",
                height: "100%",
                playerVars: { rel: 0, modestbranding: 1 },
              }}
              className="absolute inset-0 w-full h-full"
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
                setErrorMsg("Video playback failed (restricted/region).");
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
        </div>
      )}

      <div className="pt-2 text-xs text-text-muted text-center border-t border-border-subtle">
        Total rest today: <strong className="text-foreground">{formatMMSS(totalTodaySec)}</strong>
      </div>
    </div>
  );
}
