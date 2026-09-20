"use client";

import dynamic from "next/dynamic";
import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import type { ComponentType } from "react";
import type { PlayerLike, YouTubeComponentProps } from "@/types";
import type { BreakPlayerEvents, BreakPlayerHandle } from "./types";

const YouTube = dynamic(() => import("react-youtube"), { ssr: false }) as unknown as ComponentType<YouTubeComponentProps>;

interface YouTubeBreakPlayerProps extends BreakPlayerEvents {
  mediaId: string;
}

export const YouTubeBreakPlayer = forwardRef<BreakPlayerHandle, YouTubeBreakPlayerProps>(function YouTubeBreakPlayer({ mediaId, ...events }, ref) {
  const playerRef = useRef<PlayerLike | null>(null);
  const tickRef = useRef<number | null>(null);
  const eventsRef = useRef(events);
  const durationReportedRef = useRef(false);

  useEffect(() => {
    eventsRef.current = events;
  }, [events]);

  const clearTick = () => {
    if (tickRef.current !== null) {
      window.clearInterval(tickRef.current);
      tickRef.current = null;
    }
  };

  const reportDuration = () => {
    const duration = Math.floor(playerRef.current?.getDuration?.() ?? 0);
    if (duration > 0 && !durationReportedRef.current) {
      durationReportedRef.current = true;
      eventsRef.current.onReady(duration);
    }
    return duration;
  };

  const reportProgress = () => {
    const player = playerRef.current;
    if (!player) return;
    reportDuration();
    eventsRef.current.onProgress(Math.max(0, Math.floor(player.getCurrentTime?.() ?? 0)));
  };

  const startTick = () => {
    clearTick();
    tickRef.current = window.setInterval(reportProgress, 250);
  };

  useImperativeHandle(ref, () => ({
    play: () => playerRef.current?.playVideo(),
    pause: () => playerRef.current?.pauseVideo(),
    stop: () => playerRef.current?.stopVideo(),
  }), []);

  useEffect(() => () => clearTick(), []);

  return (
    <YouTube
      videoId={mediaId}
      opts={{
        width: "100%",
        height: "100%",
        playerVars: { rel: 0, modestbranding: 1, autoplay: 0 },
      }}
      className="break-player break-player--youtube absolute inset-0 h-full w-full"
      onReady={(event) => {
        playerRef.current = event.target;
        durationReportedRef.current = false;
        const duration = reportDuration();
        if (duration <= 0) eventsRef.current.onBuffering();
      }}
      onPlay={() => {
        reportDuration();
        eventsRef.current.onPlay();
        reportProgress();
        startTick();
      }}
      onPause={() => {
        clearTick();
        reportProgress();
        eventsRef.current.onPause();
      }}
      onEnd={() => {
        clearTick();
        reportProgress();
        eventsRef.current.onEnded();
      }}
      onError={() => {
        clearTick();
        eventsRef.current.onError();
      }}
      onStateChange={(event) => {
        if (event.data === 1) {
          reportDuration();
          eventsRef.current.onPlay();
          startTick();
        } else if (event.data === 2) {
          clearTick();
          reportProgress();
          eventsRef.current.onPause();
        } else if (event.data === 3) {
          clearTick();
          eventsRef.current.onBuffering();
        } else if (event.data === 0) {
          clearTick();
          eventsRef.current.onEnded();
        }
      }}
    />
  );
});
