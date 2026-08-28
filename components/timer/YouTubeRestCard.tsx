"use client";

import dynamic from "next/dynamic";
import { useState, useRef, useEffect, ComponentType } from "react";
import { formatMMSS } from "@/lib/time";
import { extractYouTubeVideoId } from "@/lib/youtube";
import { PlayerLike, YouTubeComponentProps, SavedBreakVideo } from "@/types";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { KEYS } from "@/lib/constants";
import { BREAK_PRESETS, DEFAULT_SAVED_BREAKS } from "@/lib/youtubePresets";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { Badge } from "../ui/Badge";
import { PlayIcon, PauseIcon, SquareIcon, BookmarkIcon, TrashIcon } from "../icons";

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
  const [videoTitle, setVideoTitle] = useState<string>("");
  const [durationSec, setDurationSec] = useState<number>(0);
  const [remainingSec, setRemainingSec] = useState<number>(0);
  const [errorMsg, setErrorMsg] = useState<string>("");

  const [savedBreaks, setSavedBreaks] = useLocalStorage<SavedBreakVideo[]>(
    KEYS.savedBreakVideos,
    DEFAULT_SAVED_BREAKS
  );

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

  function loadVideo(id: string, title?: string) {
    setErrorMsg("");
    clearTick();
    countedRef.current = false;
    setVideoId(id);
    setVideoTitle(title || "YouTube Break");
    setDurationSec(0);
    setRemainingSec(0);
    setStatus("Idle");
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

    loadVideo(id, "Custom Video");
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

    // Resume background audio
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("ytdoro:resumeLoFi"));
    }
  }

  function handlePause() {
    playerRef.current?.pauseVideo?.();
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("ytdoro:resumeLoFi"));
    }
  }

  function handleResume() {
    playerRef.current?.playVideo?.();
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("ytdoro:pauseLoFi"));
    }
  }

  function handleEndedCount() {
    if (countedRef.current) return;
    countedRef.current = true;

    const p = playerRef.current;
    const d = durationSec || Math.floor(p?.getDuration?.() ?? 0);
    if (d > 0) onDone(d);

    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("ytdoro:resumeLoFi"));
    }
  }

  // Save active video to favorites
  const handleSaveFavorite = () => {
    if (!videoId) return;
    const existing = savedBreaks.find((b) => b.videoId === videoId);
    if (existing) return;

    const newEntry: SavedBreakVideo = {
      id: `break_${Date.now()}`,
      title: videoTitle || "Favorite Break",
      videoId,
      addedAt: Date.now(),
    };
    setSavedBreaks([newEntry, ...savedBreaks]);
  };

  const handleDeleteFavorite = (id: string) => {
    setSavedBreaks(savedBreaks.filter((b) => b.id !== id));
  };

  useEffect(() => () => clearTick(), []);

  const progress = durationSec > 0 ? remainingSec / durationSec : 0;
  const isCurrentSaved = videoId ? savedBreaks.some((b) => b.videoId === videoId) : false;

  return (
    <div className="rest-card__content flex flex-col space-y-5">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-text-secondary">YouTube Break</span>
        <Badge
          variant={
            status === "Playing"
              ? "success"
              : status === "Paused"
              ? "warning"
              : status === "Error"
              ? "danger"
              : "secondary"
          }
        >
          {status}
        </Badge>
      </div>

      {!videoId ? (
        <div className="flex flex-col space-y-4">
          {/* Curated Presets */}
          <div className="space-y-2">
            <span className="text-xs font-semibold text-text-secondary">Curated Rest Presets</span>
            <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
              {BREAK_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => loadVideo(preset.videoId, preset.title)}
                  className="flex flex-col items-start p-2 rounded-lg bg-surface/80 hover:bg-surface-hover border border-border-subtle hover:border-accent/50 text-left transition-all group"
                >
                  <span className="text-xs font-medium text-foreground group-hover:text-accent truncate w-full">
                    {preset.categoryLabel}
                  </span>
                  <span className="text-[10px] text-text-muted truncate w-full">
                    {preset.title}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* User Saved Bookmarks */}
          {savedBreaks.length > 0 && (
            <div className="space-y-1.5 pt-2 border-t border-border-subtle">
              <span className="text-xs font-semibold text-text-secondary">Saved Breaks</span>
              <div className="flex flex-wrap gap-1.5">
                {savedBreaks.map((b) => (
                  <div
                    key={b.id}
                    className="inline-flex items-center gap-1.5 bg-surface px-2 py-1 rounded-md border border-border-subtle text-xs hover:border-accent/40"
                  >
                    <button
                      type="button"
                      onClick={() => loadVideo(b.videoId, b.title)}
                      className="text-text-secondary hover:text-foreground font-medium truncate max-w-[120px]"
                      title={`Load "${b.title}"`}
                    >
                      {b.title}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteFavorite(b.id)}
                      className="text-text-muted hover:text-rose-400"
                      title="Remove bookmark"
                      aria-label={`Remove ${b.title} from saved breaks`}
                    >
                      <TrashIcon className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Manual URL Input */}
          <div className="space-y-1.5 pt-2 border-t border-border-subtle">
            <label className="text-xs font-semibold text-text-secondary">Custom Video Link</label>
            <div className="flex gap-2">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Paste any YouTube URL or ID..."
                className="flex-1 text-sm h-9"
                onKeyDown={(e) => e.key === "Enter" && handleStart()}
              />
              <Button onClick={handleStart} size="sm" className="h-9 px-4">
                Load
              </Button>
            </div>
            {errorMsg && <p className="text-xs text-rose-400">{errorMsg}</p>}
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex justify-between items-end">
            <div className="space-y-1">
              <div className="text-2xl sm:text-3xl font-mono tracking-tighter text-foreground">
                {formatMMSS(remainingSec)}
              </div>
              <div className="text-xs text-text-muted flex items-center gap-2">
                <span>Remaining of {formatMMSS(durationSec)}</span>
                <span className="text-border-subtle">|</span>
                <span className="truncate max-w-[140px] text-text-secondary">{videoTitle}</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant={isCurrentSaved ? "primary" : "ghost"}
                size="icon"
                onClick={handleSaveFavorite}
                title={isCurrentSaved ? "Saved in favorites" : "Bookmark this break video"}
                aria-label={isCurrentSaved ? "Remove break video from favorites" : "Bookmark this break video"}
                className="h-8 w-8"
              >
                <BookmarkIcon className="h-4 w-4" />
              </Button>

              {status === "Playing" ? (
                <Button onClick={handlePause} variant="secondary" size="icon" className="h-8 w-8" aria-label="Pause break video" title="Pause break video">
                  <PauseIcon className="h-4 w-4" />
                </Button>
              ) : (
                <Button onClick={handleResume} variant="secondary" size="icon" className="h-8 w-8" aria-label="Resume break video" title="Resume break video">
                  <PlayIcon className="h-4 w-4" />
                </Button>
              )}

              <Button onClick={handleStop} variant="danger" size="icon" className="h-8 w-8" aria-label="Stop break video" title="Stop break video">
                <SquareIcon className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="h-1 w-full overflow-hidden rounded-sm bg-surface-hover">
            <div
              className="h-full bg-accent transition-all duration-300"
              style={{ width: `${(1 - progress) * 100}%` }}
            />
          </div>

          <div className="overflow-hidden rounded-lg border border-border-subtle bg-black aspect-video relative shadow-md">
            <YouTube
              videoId={videoId}
              opts={{
                width: "100%",
                height: "100%",
                playerVars: { rel: 0, modestbranding: 1, autoplay: 1 },
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
                if (typeof window !== "undefined") {
                  window.dispatchEvent(new CustomEvent("ytdoro:pauseLoFi"));
                }
              }}
              onPause={() => {
                setStatus("Paused");
                clearTick();
                tickOnce();
                if (typeof window !== "undefined") {
                  window.dispatchEvent(new CustomEvent("ytdoro:resumeLoFi"));
                }
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
                  if (typeof window !== "undefined") {
                    window.dispatchEvent(new CustomEvent("ytdoro:pauseLoFi"));
                  }
                } else if (event.data === 2) {
                  setStatus("Paused");
                  clearTick();
                  if (typeof window !== "undefined") {
                    window.dispatchEvent(new CustomEvent("ytdoro:resumeLoFi"));
                  }
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
