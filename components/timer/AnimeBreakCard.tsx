"use client";

import { useEffect, useRef, useState } from "react";
import { KEYS } from "@/lib/constants";
import { migrateSavedBreakMedia, parseBreakMediaInput } from "@/lib/breakMedia";
import { BREAK_PRESETS, DEFAULT_SAVED_BREAKS } from "@/lib/youtubePresets";
import { formatMMSS } from "@/lib/time";
import type { BreakMediaDescriptor, SavedBreakMedia } from "@/types";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { Badge } from "../ui/Badge";
import { BookmarkIcon, PauseIcon, PlayIcon, SquareIcon, TrashIcon } from "../icons";
import { DirectBreakPlayer } from "./breakPlayers/DirectBreakPlayer";
import { VimeoBreakPlayer } from "./breakPlayers/VimeoBreakPlayer";
import { YouTubeBreakPlayer } from "./breakPlayers/YouTubeBreakPlayer";
import type { BreakPlayerHandle } from "./breakPlayers/types";

interface AnimeBreakCardProps {
  totalTodaySec: number;
  onReady: (durationSeconds: number) => void;
  onPlay: () => Promise<boolean>;
  onPause: (elapsedSeconds: number) => void;
  onProgress: (elapsedSeconds: number) => void;
  onBuffering: (elapsedSeconds: number) => void;
  onDone: (elapsedSeconds: number) => void;
  onStop: (elapsedSeconds: number) => void;
}

type AnimeBreakStatus = "Idle" | "Playing" | "Paused" | "Buffering" | "Ended" | "Error";

const PLAYER_ERROR = "This video cannot be played inside StudyRythms. Try another supported link.";

export function AnimeBreakCard({
  totalTodaySec,
  onReady,
  onPlay,
  onPause,
  onProgress,
  onBuffering,
  onDone,
  onStop,
}: AnimeBreakCardProps) {
  const [storedBreaks, setStoredBreaks] = useLocalStorage<unknown>(KEYS.savedBreakVideos, DEFAULT_SAVED_BREAKS);
  const savedBreaks = migrateSavedBreakMedia(storedBreaks);
  const [input, setInput] = useState("");
  const [media, setMedia] = useState<BreakMediaDescriptor | null>(null);
  const [title, setTitle] = useState("");
  const [status, setStatus] = useState<AnimeBreakStatus>("Idle");
  const [durationSec, setDurationSec] = useState(0);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [errorMsg, setErrorMsg] = useState("");
  const playerRef = useRef<BreakPlayerHandle | null>(null);
  const durationRef = useRef(0);
  const elapsedRef = useRef(0);
  const startedRef = useRef(false);
  const finalizedRef = useRef(false);

  const clearError = () => setErrorMsg("");

  const finalizeBreak = (outcome: "done" | "stopped", seconds = elapsedRef.current) => {
    if (finalizedRef.current || !startedRef.current) return;
    finalizedRef.current = true;
    const watchedSeconds = Math.max(0, Math.floor(seconds));
    if (outcome === "done") onDone(watchedSeconds);
    else onStop(watchedSeconds);
  };

  const selectMedia = (descriptor: BreakMediaDescriptor, nextTitle: string) => {
    playerRef.current?.stop();
    finalizedRef.current = false;
    startedRef.current = false;
    durationRef.current = 0;
    elapsedRef.current = 0;
    setDurationSec(0);
    setElapsedSec(0);
    setStatus("Idle");
    clearError();
    setTitle(nextTitle);
    setMedia(descriptor);
  };

  const handleInputLoad = () => {
    const descriptor = parseBreakMediaInput(input);
    if (!descriptor) {
      setErrorMsg(PLAYER_ERROR);
      setStatus("Error");
      return;
    }
    selectMedia(descriptor, "Custom Anime Break");
  };

  const handleReady = (durationSeconds: number) => {
    const duration = Math.max(0, Math.floor(durationSeconds));
    if (!Number.isFinite(duration) || duration <= 0) {
      handlePlayerError();
      return;
    }
    durationRef.current = duration;
    setDurationSec(duration);
    setElapsedSec(0);
    elapsedRef.current = 0;
    onReady(duration);
  };

  const handlePlay = () => {
    setStatus("Playing");
    if (startedRef.current) return;
    void onPlay().then((allowed) => {
      if (!allowed) {
        playerRef.current?.pause();
        setStatus("Idle");
        setErrorMsg("Start a focus session before starting a break.");
        return;
      }
      startedRef.current = true;
      clearError();
    });
  };

  const handleProgress = (seconds: number) => {
    const elapsed = Math.max(0, Math.floor(seconds));
    elapsedRef.current = elapsed;
    setElapsedSec(elapsed);
    onProgress(elapsed);
  };

  const handlePause = () => {
    handleProgress(elapsedRef.current);
    setStatus("Paused");
    onPause(elapsedRef.current);
  };

  const handleBuffering = () => {
    setStatus("Buffering");
    onBuffering(elapsedRef.current);
  };

  const handleDone = () => {
    const elapsed = Math.max(elapsedRef.current, durationRef.current);
    elapsedRef.current = elapsed;
    setElapsedSec(elapsed);
    setStatus("Ended");
    finalizeBreak("done", elapsed);
  };

  const handlePlayerError = () => {
    setStatus("Error");
    setErrorMsg(PLAYER_ERROR);
    finalizeBreak("stopped");
  };

  const handleStop = () => {
    const elapsed = elapsedRef.current;
    playerRef.current?.stop();
    finalizeBreak("stopped", elapsed);
    setStatus("Idle");
    startedRef.current = false;
    durationRef.current = 0;
    elapsedRef.current = 0;
    setDurationSec(0);
    setElapsedSec(0);
    setMedia(null);
  };

  const handleStart = () => {
    clearError();
    void playerRef.current?.play();
  };

  const handlePauseButton = () => {
    void playerRef.current?.pause();
  };

  const handleSaveFavorite = () => {
    if (!media || savedBreaks.some((item) => item.sourceUrl === media.sourceUrl)) return;
    const entry: SavedBreakMedia = {
      ...media,
      id: `break_${Date.now()}`,
      title: title || "Favorite Anime Break",
      addedAt: Date.now(),
    };
    setStoredBreaks([entry, ...savedBreaks]);
  };

  const handleDeleteFavorite = (id: string) => {
    setStoredBreaks(savedBreaks.filter((item) => item.id !== id));
  };

  useEffect(() => {
    if (!media) return;
    const timeout = window.setTimeout(() => {
      if (durationRef.current <= 0) {
        handlePlayerError();
        setMedia(null);
      }
    }, 10_000);
    return () => window.clearTimeout(timeout);
  }, [media]);

  useEffect(() => () => {
    finalizeBreak("stopped");
  }, []);

  const progress = durationSec > 0 ? Math.min(1, elapsedSec / durationSec) : 0;
  const activeSaved = media ? savedBreaks.some((item) => item.sourceUrl === media.sourceUrl) : false;
  const isPlaying = status === "Playing" || status === "Buffering";

  return (
    <div className="rest-card__content flex flex-col space-y-5">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-text-secondary">Anime Break</span>
        <Badge variant={status === "Playing" ? "success" : status === "Paused" || status === "Buffering" ? "warning" : status === "Error" ? "danger" : "secondary"}>{status}</Badge>
      </div>

      {!media ? (
        <div className="flex flex-col space-y-4">
          <p className="text-sm text-text-secondary">Watch a supported video in StudyRythms. Duration follows the video.</p>
          <div className="flex gap-2">
            <Input value={input} onChange={(event) => setInput(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") handleInputLoad(); }} placeholder="Paste a YouTube, Vimeo, MP4, or WebM link..." aria-label="Anime Break video link" />
            <Button type="button" onClick={handleInputLoad}>Load</Button>
          </div>

          <div className="space-y-2">
            <span className="text-xs font-semibold text-text-secondary">Curated Anime Breaks</span>
            <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
              {BREAK_PRESETS.map((preset) => {
                const descriptor = parseBreakMediaInput(preset.videoId);
                if (!descriptor) return null;
                return <button key={preset.id} type="button" onClick={() => selectMedia(descriptor, preset.title)} className="flex flex-col items-start p-2 rounded-lg bg-surface/80 hover:bg-surface-hover border border-border-subtle hover:border-accent/50 text-left transition-all group"><span className="text-xs font-medium text-text-secondary group-hover:text-accent truncate w-full">{preset.categoryLabel}</span><span className="text-[10px] text-text-muted truncate w-full">{preset.title}</span></button>;
              })}
            </div>
          </div>

          {savedBreaks.length > 0 && <div className="space-y-1.5 pt-2 border-t border-border-subtle"><span className="text-xs font-semibold text-text-secondary">Saved Anime Breaks</span><div className="flex flex-wrap gap-1.5">{savedBreaks.map((item) => <div key={item.id} className="inline-flex items-center gap-1.5 bg-surface px-2 py-1 rounded-md border border-border-subtle text-xs"><button type="button" onClick={() => selectMedia(item, item.title)} className="text-text-secondary hover:text-foreground font-medium truncate max-w-[140px]" title={`Load \"${item.title}\"`}>{item.title}</button><button type="button" onClick={() => handleDeleteFavorite(item.id)} aria-label={`Delete ${item.title}`}><TrashIcon className="h-3.5 w-3.5" /></button></div>)}</div></div>}
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between gap-3"><span className="truncate text-sm text-text-secondary">{title || media.sourceUrl}</span><button type="button" onClick={handleSaveFavorite} disabled={activeSaved} aria-label="Save Anime Break" title={activeSaved ? "Saved" : "Save Anime Break"} className="text-text-secondary hover:text-accent disabled:opacity-50"><BookmarkIcon className="h-4 w-4" /></button></div>
          <div className="overflow-hidden rounded-lg border border-border-subtle bg-black aspect-video relative shadow-md">
            {media.provider === "youtube" && media.mediaId ? <YouTubeBreakPlayer ref={playerRef} mediaId={media.mediaId} onReady={handleReady} onPlay={handlePlay} onPause={handlePause} onProgress={handleProgress} onBuffering={handleBuffering} onEnded={handleDone} onError={handlePlayerError} /> : media.provider === "vimeo" && media.mediaId ? <VimeoBreakPlayer ref={playerRef} mediaId={media.mediaId} onReady={handleReady} onPlay={handlePlay} onPause={handlePause} onProgress={handleProgress} onBuffering={handleBuffering} onEnded={handleDone} onError={handlePlayerError} /> : <DirectBreakPlayer ref={playerRef} sourceUrl={media.sourceUrl} onReady={handleReady} onPlay={handlePlay} onPause={handlePause} onProgress={handleProgress} onBuffering={handleBuffering} onEnded={handleDone} onError={handlePlayerError} />}
          </div>
          {errorMsg && <p className="rest-card__error" role="alert">{errorMsg}</p>}
          <div className="flex items-center justify-between"><Badge variant={status === "Playing" ? "success" : "secondary"}>{durationSec > 0 ? `${formatMMSS(elapsedSec)} / ${formatMMSS(durationSec)}` : "Loading video metadata…"}</Badge><div className="flex items-center gap-2"><Button type="button" variant="secondary" size="icon" onClick={isPlaying ? handlePauseButton : handleStart} aria-label={isPlaying ? "Pause Anime Break" : "Start Anime Break"}>{isPlaying ? <PauseIcon className="h-4 w-4" /> : <PlayIcon className="h-4 w-4" />}</Button><Button type="button" variant="danger" size="icon" onClick={handleStop} aria-label="Stop Anime Break"><SquareIcon className="h-4 w-4" /></Button></div></div>
          <div className="h-1 w-full overflow-hidden rounded-sm bg-surface-hover"><div className="h-full bg-accent transition-all duration-300" style={{ width: `${progress * 100}%` }} /></div>
          <Button type="button" variant="secondary" onClick={handleStop}>Choose another video</Button>
        </>
      )}

      <div className="pt-2 text-xs text-text-muted text-center border-t border-border-subtle">Total break time today: <strong className="text-foreground">{formatMMSS(totalTodaySec)}</strong></div>
    </div>
  );
}
