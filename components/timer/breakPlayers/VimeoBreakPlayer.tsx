"use client";

import Player from "@vimeo/player";
import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import type { BreakPlayerEvents, BreakPlayerHandle } from "./types";

interface VimeoBreakPlayerProps extends BreakPlayerEvents {
  mediaId: string;
}

export const VimeoBreakPlayer = forwardRef<BreakPlayerHandle, VimeoBreakPlayerProps>(function VimeoBreakPlayer({ mediaId, ...events }, ref) {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const playerRef = useRef<Player | null>(null);
  const eventsRef = useRef(events);
  useEffect(() => {
    eventsRef.current = events;
  }, [events]);

  useImperativeHandle(ref, () => ({
    play: () => playerRef.current?.play(),
    pause: () => playerRef.current?.pause(),
    stop: async () => {
      const player = playerRef.current;
      if (!player) return;
      await player.pause();
      await player.setCurrentTime(0);
    },
  }), []);

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;
    const player = new Player(iframe);
    playerRef.current = player;

    void player.ready()
      .then(() => player.getDuration())
      .then((duration) => {
        if (!Number.isFinite(duration) || duration <= 0) {
          eventsRef.current.onError();
          return;
        }
        eventsRef.current.onReady(Math.floor(duration));
      })
      .catch(() => eventsRef.current.onError());

    player.on("play", () => eventsRef.current.onPlay());
    player.on("pause", () => eventsRef.current.onPause());
    player.on("bufferstart", () => eventsRef.current.onBuffering());
    player.on("timeupdate", (data) => eventsRef.current.onProgress(Math.max(0, Math.floor(data.seconds))));
    player.on("ended", () => eventsRef.current.onEnded());
    player.on("error", () => eventsRef.current.onError());

    return () => {
      playerRef.current = null;
      void player.destroy();
    };
  }, [mediaId]);

  return (
    <iframe
      ref={iframeRef}
      title="Vimeo break video"
      src={`https://player.vimeo.com/video/${mediaId}?autoplay=0&dnt=1`}
      className="break-player break-player--vimeo absolute inset-0 h-full w-full border-0"
      allow="autoplay; fullscreen; picture-in-picture"
      allowFullScreen
    />
  );
});
