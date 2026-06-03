"use client";

import dynamic from "next/dynamic";
import { useState, useRef, useEffect, ComponentType } from "react";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { KEYS } from "@/lib/constants";
import { MusicIcon } from "../icons";
import { Button } from "../ui/Button";
import { YouTubeComponentProps } from "@/types";

const YouTube = dynamic(() => import("react-youtube"), { ssr: false }) as unknown as ComponentType<YouTubeComponentProps>;

const LOFI_GIRL_VIDEO_ID = "lTRiuFIWV54"; // Stable 1 A.M. Study Session lofi compilation (highly reliable & embeddable)

export function LoFiPlayer() {
  const [isEnabled, setIsEnabled] = useLocalStorage(KEYS.isLoFiEnabled, false);
  const [isPlaying, setIsPlaying] = useState(false);
  const playerRef = useRef<any>(null);

  useEffect(() => {
    if (!isEnabled && playerRef.current) {
      playerRef.current.pauseVideo();
    } else if (isEnabled && playerRef.current) {
      playerRef.current.playVideo();
    }
  }, [isEnabled]);

  const toggleLoFi = () => {
    setIsEnabled(!isEnabled);
  };

  return (
    <>
      <Button 
        variant={isEnabled ? "primary" : "ghost"} 
        size="icon" 
        onClick={toggleLoFi} 
        title={isEnabled ? "Lo-Fi: ON" : "Lo-Fi: OFF"}
        className="relative"
      >
        <MusicIcon className="h-4 w-4" />
        {isEnabled && isPlaying && (
          <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-accent"></span>
          </span>
        )}
      </Button>

      {/* Invisible YouTube Player */}
      <div className="absolute opacity-0 pointer-events-none w-[1px] h-[1px] overflow-hidden">
        <YouTube
          videoId={LOFI_GIRL_VIDEO_ID}
          opts={{
            height: '1',
            width: '1',
            playerVars: {
              autoplay: 0, // Don't autoplay initially
              controls: 0,
              disablekb: 1,
              fs: 0,
              modestbranding: 1,
              playsinline: 1,
            },
          }}
          onReady={(e) => {
            playerRef.current = e.target;
            e.target.setVolume(30);
            if (isEnabled) {
              e.target.playVideo();
            }
          }}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          onEnd={() => setIsPlaying(false)}
          onError={(e: any) => {
            const errorCode = e?.data || "unknown";
            console.error("LoFi player error (YouTube error code):", errorCode);
            setIsPlaying(false);
          }}
        />
      </div>
    </>
  );
}
