"use client";

import { forwardRef, useImperativeHandle, useRef } from "react";
import type { BreakPlayerEvents, BreakPlayerHandle } from "./types";

interface DirectBreakPlayerProps extends BreakPlayerEvents {
  sourceUrl: string;
}

export const DirectBreakPlayer = forwardRef<BreakPlayerHandle, DirectBreakPlayerProps>(function DirectBreakPlayer({ sourceUrl, ...events }, ref) {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useImperativeHandle(ref, () => ({
    play: () => videoRef.current?.play(),
    pause: () => videoRef.current?.pause(),
    stop: () => {
      const video = videoRef.current;
      if (!video) return;
      video.pause();
      video.currentTime = 0;
    },
  }), []);

  return (
    <video
      ref={videoRef}
      className="break-player break-player--file absolute inset-0 h-full w-full object-contain"
      src={sourceUrl}
      controls
      preload="metadata"
      onLoadedMetadata={(event) => {
        const duration = event.currentTarget.duration;
        if (!Number.isFinite(duration) || duration <= 0) {
          events.onError();
          return;
        }
        events.onReady(Math.floor(duration));
      }}
      onPlay={events.onPlay}
      onPause={events.onPause}
      onTimeUpdate={(event) => events.onProgress(Math.max(0, Math.floor(event.currentTarget.currentTime)))}
      onWaiting={events.onBuffering}
      onEnded={events.onEnded}
      onError={events.onError}
    />
  );
});
