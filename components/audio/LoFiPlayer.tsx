"use client";

import dynamic from "next/dynamic";
import { ComponentType, FormEvent, useEffect, useRef, useState } from "react";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { KEYS } from "@/lib/constants";
import { DEFAULT_LOFI_VOLUME, DEFAULT_STATION_ID, RADIO_STATIONS } from "@/lib/audioStreams";
import { formatMMSS } from "@/lib/time";
import { parseMusicProviderUrl, type MusicEmbed } from "@/lib/musicProviders";
import type { YouTubeComponentProps } from "@/types";
import {
  createSpotifyAuthUrl,
  disconnectSpotify,
  fetchSpotifyPlaylists,
  fetchSpotifyUserProfile,
  getStoredSpotifyToken,
  playlistToMusicEmbed,
  SPOTIFY_STORAGE_KEYS,
  type SpotifyPlaylistSummary,
  type SpotifyTokenData,
} from "@/lib/spotifyApi";
import {
  decodeHtmlEntities,
  DEFAULT_YOUTUBE_SONGS,
  fetchGoogleYouTubeLikedVideos,
  fetchGoogleYouTubePlaylistItems,
  fetchGoogleYouTubePlaylists,
  fetchGoogleYouTubePlaylistsResult,
  getGoogleProviderToken,
  getYouTubeLikedMusicPlaylist,
  requestGoogleYouTubeAccess,
  searchGoogleYouTubeMusic,
  youtubePlaylistToMusicEmbed,
  youtubeSongToMusicEmbed,
  type YouTubePlaylistSummary,
  type YouTubeSongSummary,
} from "@/lib/youtubeMusicApi";
import { MaximizeIcon, MinusIcon, MusicIcon, PauseIcon, PlayIcon, PlusIcon, SkipBackIcon, SkipForwardIcon, SpotifyIcon, SquareIcon, TrashIcon, Volume2Icon, VolumeXIcon, YouTubeIcon } from "../icons";


const YouTube = dynamic(() => import("react-youtube"), { ssr: false }) as unknown as ComponentType<YouTubeComponentProps>;

interface MinimalYTPlayer {
  playVideo: () => void;
  pauseVideo: () => void;
  setVolume: (volume: number) => void;
}

const getAutoplayUrl = (url: string) => {
  if (!url) return "";
  try {
    const parsed = new URL(url);
    if (!parsed.searchParams.has("autoplay")) {
      parsed.searchParams.set("autoplay", "1");
    }
    if (!parsed.searchParams.has("enablejsapi")) {
      parsed.searchParams.set("enablejsapi", "1");
    }
    return parsed.toString();
  } catch {
    const sep = url.includes("?") ? "&" : "?";
    return url.includes("autoplay=") ? url : `${url}${sep}autoplay=1&enablejsapi=1`;
  }
};

export interface HeardSongItem {
  id: string;
  title: string;
  artist?: string;
  provider: MusicEmbed["provider"];
  sourceUrl: string;
  embedUrl: string;
  playedAt: number;
}

export interface QueueSongItem {
  id: string;
  title: string;
  artist?: string;
  provider: MusicEmbed["provider"];
  sourceUrl: string;
  embedUrl: string;
}

export const QUEUE_STORAGE_KEY = "ytdoro:music:queue";
export const GOOGLE_YOUTUBE_SONGS_KEY = "ytdoro:music:google-youtube-songs";

export function extractYouTubeVideoId(url: string): string | null {
  if (!url) return null;
  if (/^[a-zA-Z0-9_-]{11}$/.test(url)) return url;
  const match = url.match(/(?:v=|\/embed\/|\/watch\?v=|youtu\.be\/|\/v\/|list=[a-zA-Z0-9_-]+&v=)([a-zA-Z0-9_-]{11})/);
  return match ? match[1] : null;
}

interface MusicEngineProps {
  hidden?: boolean;
}

export function MusicEngine({ hidden = false }: MusicEngineProps = {}) {
  const [enabled] = useLocalStorage(KEYS.isLoFiEnabled, false);
  const [stationId, setStationId] = useLocalStorage(KEYS.lofiStation, DEFAULT_STATION_ID);
  const [volume, setVolume] = useLocalStorage(KEYS.lofiVolume, DEFAULT_LOFI_VOLUME);
  const [muted, setMuted] = useLocalStorage(KEYS.lofiMuted, false);
  const [activeEmbed, setActiveEmbed] = useLocalStorage<MusicEmbed | null>(KEYS.activeMusicEmbed, null);
  const [isMinimized, setIsMinimized] = useLocalStorage("ytdoro:music:player-minimized", true);
  const [isCardMinimized, setIsCardMinimized] = useLocalStorage("ytdoro:music:card-minimized", false);
  const [activeSongTitle, setActiveSongTitle] = useLocalStorage<string>("ytdoro:music:active-title", "");
  const [activeSongArtist, setActiveSongArtist] = useLocalStorage<string>("ytdoro:music:active-artist", "");
  const [savedEmbeds] = useLocalStorage<MusicEmbed[]>(KEYS.savedMusicEmbeds, []);
  const [heardHistory] = useLocalStorage<HeardSongItem[]>(KEYS.heardMusicHistory, []);
  const [queue] = useLocalStorage<QueueSongItem[]>(QUEUE_STORAGE_KEY, []);
  const [googleYouTubeSongs, setGoogleYouTubeSongs] = useLocalStorage<YouTubeSongSummary[]>(GOOGLE_YOUTUBE_SONGS_KEY, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    void getGoogleProviderToken().then((token) => {
      if (token) {
        void fetchGoogleYouTubeLikedVideos(token).then((res) => {
          if (res.songs.length > 0) {
            setGoogleYouTubeSongs(res.songs);
          }
        });
      }
    });
  }, [setGoogleYouTubeSongs]);
  const [isPlaying, setIsPlaying] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isSeeking, setIsSeeking] = useState(false);
  const lastIframeMsgTimeRef = useRef<number>(0);
  const seekLockUntilRef = useRef<number>(0);
  const playerRef = useRef<MinimalYTPlayer | null>(null);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const station = RADIO_STATIONS.find((item) => item.id === stationId) ?? RADIO_STATIONS[0];

  const handleSeek = (newTime: number) => {
    setCurrentTime(newTime);
    seekLockUntilRef.current = Date.now() + 1000;
    const iframe = iframeRef.current;
    if (iframe?.contentWindow) {
      try {
        iframe.contentWindow.postMessage(
          JSON.stringify({
            event: "command",
            func: "seekTo",
            args: [newTime, true],
          }),
          "*"
        );
        if (newTime === 0) {
          iframe.contentWindow.postMessage(
            JSON.stringify({
              event: "command",
              func: "playVideo",
              args: [],
            }),
            "*"
          );
          setIsPlaying(true);
        }
      } catch {}
    }
  };

  const handlePreviousSong = () => {
    if (activeEmbed) {
      const activeVidId = extractYouTubeVideoId(activeEmbed.sourceUrl) || extractYouTubeVideoId(activeEmbed.embedUrl);

      // 1. Try active queue
      if (queue.length > 1) {
        const currentIdx = queue.findIndex(
          (item) =>
            item.sourceUrl === activeEmbed.sourceUrl ||
            item.embedUrl === activeEmbed.embedUrl ||
            (activeVidId && (item.id === activeVidId || item.sourceUrl.includes(activeVidId) || item.embedUrl.includes(activeVidId))) ||
            (activeSongTitle && item.title.trim().toLowerCase() === activeSongTitle.trim().toLowerCase())
        );
        const prevIdx = currentIdx > 0 ? currentIdx - 1 : queue.length - 1;
        const prevSong = queue[prevIdx];
        if (prevSong) {
          setActiveSongTitle(prevSong.title);
          setActiveSongArtist(prevSong.artist || "YouTube Music");
          setActiveEmbed({
            provider: prevSong.provider,
            sourceUrl: prevSong.sourceUrl,
            embedUrl: prevSong.embedUrl,
          });
          setCurrentTime(0);
          setIsPlaying(true);
          return;
        }
      }

      // 2. Try Google Account YouTube Songs (Liked songs / playlist items)
      if (googleYouTubeSongs.length > 0) {
        const currentIdx = googleYouTubeSongs.findIndex(
          (item) =>
            item.id === activeVidId ||
            item.externalUrl === activeEmbed.sourceUrl ||
            item.embedUrl === activeEmbed.embedUrl ||
            (activeVidId && (item.externalUrl.includes(activeVidId) || item.embedUrl.includes(activeVidId))) ||
            (activeSongTitle && item.title.trim().toLowerCase() === activeSongTitle.trim().toLowerCase())
        );
        const prevIdx = currentIdx > 0 ? currentIdx - 1 : (googleYouTubeSongs.length > 1 ? googleYouTubeSongs.length - 1 : 0);
        const prevSong = googleYouTubeSongs[prevIdx];
        if (prevSong && (googleYouTubeSongs.length > 1 || prevSong.id !== activeVidId)) {
          setActiveSongTitle(prevSong.title);
          setActiveSongArtist(prevSong.artist || "YouTube Music");
          setActiveEmbed(youtubeSongToMusicEmbed(prevSong));
          setCurrentTime(0);
          setIsPlaying(true);
          return;
        }
      }

      // 3. Try Saved Embeds
      if (savedEmbeds.length > 1) {
        const idx = savedEmbeds.findIndex((item) => item.sourceUrl === activeEmbed.sourceUrl || item.embedUrl === activeEmbed.embedUrl);
        const prevIdx = idx > 0 ? idx - 1 : savedEmbeds.length - 1;
        const prevEmbed = savedEmbeds[prevIdx];
        setActiveEmbed(prevEmbed);
        setCurrentTime(0);
        setIsPlaying(true);
        return;
      }

      // 4. Try Heard History
      if (heardHistory.length > 1) {
        const idx = heardHistory.findIndex((item) => item.sourceUrl === activeEmbed.sourceUrl || item.embedUrl === activeEmbed.embedUrl || (activeSongTitle && item.title === activeSongTitle));
        const prevIdx = idx > 0 ? idx - 1 : heardHistory.length - 1;
        const prevItem = heardHistory[prevIdx];
        setActiveEmbed({
          provider: prevItem.provider,
          sourceUrl: prevItem.sourceUrl,
          embedUrl: prevItem.embedUrl,
        });
        setActiveSongTitle(prevItem.title);
        setActiveSongArtist(prevItem.artist || "");
        setCurrentTime(0);
        setIsPlaying(true);
        return;
      }

      // 5. Fallback to Curated YouTube Songs so navigation ALWAYS works
      const ytPool = DEFAULT_YOUTUBE_SONGS;
      const currentIdx = ytPool.findIndex(
        (item) =>
          item.id === activeVidId ||
          item.externalUrl === activeEmbed.sourceUrl ||
          item.embedUrl === activeEmbed.embedUrl ||
          (activeVidId && (item.externalUrl.includes(activeVidId) || item.embedUrl.includes(activeVidId))) ||
          (activeSongTitle && item.title.trim().toLowerCase() === activeSongTitle.trim().toLowerCase())
      );
      const prevIdx = currentIdx > 0 ? currentIdx - 1 : ytPool.length - 1;
      const prevSong = ytPool[prevIdx];
      if (prevSong) {
        setActiveSongTitle(prevSong.title);
        setActiveSongArtist(prevSong.artist || "YouTube Music");
        setActiveEmbed(youtubeSongToMusicEmbed(prevSong));
        setCurrentTime(0);
        setIsPlaying(true);
        return;
      }

      // 6. Send previousVideo command to iframe
      const iframe = iframeRef.current;
      if (iframe?.contentWindow) {
        try {
          iframe.contentWindow.postMessage(
            JSON.stringify({
              event: "command",
              func: "previousVideo",
              args: [],
            }),
            "*"
          );
        } catch {}
      }
      return;
    } else if (enabled) {
      const currentIdx = RADIO_STATIONS.findIndex((item) => item.id === stationId);
      const prevIdx = currentIdx > 0 ? currentIdx - 1 : RADIO_STATIONS.length - 1;
      setStationId(RADIO_STATIONS[prevIdx].id);
      setCurrentTime(0);
    }
  };

  const handleNextSong = () => {
    if (activeEmbed) {
      const activeVidId = extractYouTubeVideoId(activeEmbed.sourceUrl) || extractYouTubeVideoId(activeEmbed.embedUrl);

      // 1. Try active queue
      if (queue.length > 1) {
        const currentIdx = queue.findIndex(
          (item) =>
            item.sourceUrl === activeEmbed.sourceUrl ||
            item.embedUrl === activeEmbed.embedUrl ||
            (activeVidId && (item.id === activeVidId || item.sourceUrl.includes(activeVidId) || item.embedUrl.includes(activeVidId))) ||
            (activeSongTitle && item.title.trim().toLowerCase() === activeSongTitle.trim().toLowerCase())
        );
        const nextIdx = currentIdx >= 0 ? (currentIdx + 1) % queue.length : 0;
        const nextSong = queue[nextIdx];
        if (nextSong) {
          setActiveSongTitle(nextSong.title);
          setActiveSongArtist(nextSong.artist || "YouTube Music");
          setActiveEmbed({
            provider: nextSong.provider,
            sourceUrl: nextSong.sourceUrl,
            embedUrl: nextSong.embedUrl,
          });
          setCurrentTime(0);
          setIsPlaying(true);
          return;
        }
      }

      // 2. Try Google Account YouTube Songs (Liked songs / playlist items)
      if (googleYouTubeSongs.length > 0) {
        const currentIdx = googleYouTubeSongs.findIndex(
          (item) =>
            item.id === activeVidId ||
            item.externalUrl === activeEmbed.sourceUrl ||
            item.embedUrl === activeEmbed.embedUrl ||
            (activeVidId && (item.externalUrl.includes(activeVidId) || item.embedUrl.includes(activeVidId))) ||
            (activeSongTitle && item.title.trim().toLowerCase() === activeSongTitle.trim().toLowerCase())
        );
        const nextIdx = currentIdx >= 0 ? (currentIdx + 1) % googleYouTubeSongs.length : 0;
        const nextSong = googleYouTubeSongs[nextIdx];
        if (nextSong && (googleYouTubeSongs.length > 1 || nextSong.id !== activeVidId)) {
          setActiveSongTitle(nextSong.title);
          setActiveSongArtist(nextSong.artist || "YouTube Music");
          setActiveEmbed(youtubeSongToMusicEmbed(nextSong));
          setCurrentTime(0);
          setIsPlaying(true);
          return;
        }
      }

      // 3. Try Saved Embeds
      if (savedEmbeds.length > 1) {
        const idx = savedEmbeds.findIndex((item) => item.sourceUrl === activeEmbed.sourceUrl || item.embedUrl === activeEmbed.embedUrl);
        const nextIdx = idx >= 0 ? (idx + 1) % savedEmbeds.length : 0;
        const nextEmbed = savedEmbeds[nextIdx];
        setActiveEmbed(nextEmbed);
        setCurrentTime(0);
        setIsPlaying(true);
        return;
      }

      // 4. Try Heard History
      if (heardHistory.length > 1) {
        const idx = heardHistory.findIndex((item) => item.sourceUrl === activeEmbed.sourceUrl || item.embedUrl === activeEmbed.embedUrl || (activeSongTitle && item.title === activeSongTitle));
        const nextIdx = idx >= 0 ? (idx + 1) % heardHistory.length : 0;
        const nextItem = heardHistory[nextIdx];
        setActiveEmbed({
          provider: nextItem.provider,
          sourceUrl: nextItem.sourceUrl,
          embedUrl: nextItem.embedUrl,
        });
        setActiveSongTitle(nextItem.title);
        setActiveSongArtist(nextItem.artist || "");
        setCurrentTime(0);
        setIsPlaying(true);
        return;
      }

      // 5. Fallback to Curated YouTube Songs so navigation ALWAYS works
      const ytPool = DEFAULT_YOUTUBE_SONGS;
      const currentIdx = ytPool.findIndex(
        (item) =>
          item.id === activeVidId ||
          item.externalUrl === activeEmbed.sourceUrl ||
          item.embedUrl === activeEmbed.embedUrl ||
          (activeVidId && (item.externalUrl.includes(activeVidId) || item.embedUrl.includes(activeVidId))) ||
          (activeSongTitle && item.title.trim().toLowerCase() === activeSongTitle.trim().toLowerCase())
      );
      const nextIdx = currentIdx >= 0 ? (currentIdx + 1) % ytPool.length : 0;
      const nextSong = ytPool[nextIdx];
      if (nextSong) {
        setActiveSongTitle(nextSong.title);
        setActiveSongArtist(nextSong.artist || "YouTube Music");
        setActiveEmbed(youtubeSongToMusicEmbed(nextSong));
        setCurrentTime(0);
        setIsPlaying(true);
        return;
      }

      // 6. Send nextVideo command to iframe
      const iframe = iframeRef.current;
      if (iframe?.contentWindow) {
        try {
          iframe.contentWindow.postMessage(
            JSON.stringify({
              event: "command",
              func: "nextVideo",
              args: [],
            }),
            "*"
          );
        } catch {}
      }
      return;
    } else if (enabled) {
      const currentIdx = RADIO_STATIONS.findIndex((item) => item.id === stationId);
      const nextIdx = (currentIdx + 1) % RADIO_STATIONS.length;
      setStationId(RADIO_STATIONS[nextIdx].id);
      setCurrentTime(0);
    }
  };


  const togglePlay = () => {
    const iframe = iframeRef.current;
    if (!iframe?.contentWindow) return;
    try {
      const nextPlaying = !isPlaying;
      if (activeEmbed?.provider === "spotify") {
        iframe.contentWindow.postMessage({ command: nextPlaying ? "play" : "pause" }, "*");
      } else {
        iframe.contentWindow.postMessage(
          JSON.stringify({
            event: "command",
            func: nextPlaying ? "playVideo" : "pauseVideo",
            args: [],
          }),
          "*"
        );
      }
      setIsPlaying(nextPlaying);
    } catch {}
  };

  useEffect(() => {
    if (activeEmbed) {
      setIsPlaying(true);
      setCurrentTime(0);
      setDuration(0);
      lastIframeMsgTimeRef.current = 0;
      seekLockUntilRef.current = Date.now() + 1200;
    }
  }, [activeEmbed?.embedUrl]);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      try {
        const data = typeof event.data === "string" ? JSON.parse(event.data) : event.data;
        if (data?.event === "onStateChange" || data?.info !== undefined) {
          if (data.info === 1) setIsPlaying(true);
          else if (data.info === 2 || data.info === 0) setIsPlaying(false);
        }
        // Handle video title and author delivered by YouTube iframe infoDelivery
        const videoData = data?.info?.videoData;
        if (videoData && typeof videoData.title === "string" && videoData.title.trim()) {
          const cleanTitle = decodeHtmlEntities(videoData.title.trim());
          if (cleanTitle) {
            setActiveSongTitle(cleanTitle);
          }
          if (typeof videoData.author === "string" && videoData.author.trim()) {
            const cleanAuthor = decodeHtmlEntities(videoData.author.trim());
            if (cleanAuthor) {
              setActiveSongArtist(cleanAuthor);
            }
          }
        }
        if (data?.info) {
          if (typeof data.info.duration === "number" && data.info.duration > 0) {
            setDuration(Math.round(data.info.duration));
          }
          if (typeof data.info.currentTime === "number") {
            lastIframeMsgTimeRef.current = Date.now();
            if (!isSeeking && Date.now() > seekLockUntilRef.current) {
              const seconds = Math.floor(data.info.currentTime);
              setCurrentTime((prev) => {
                if (seconds >= prev) return seconds;
                if (prev - seconds > 3) return seconds;
                return prev;
              });
            }
          }
        }
      } catch {}
    };
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [isSeeking, setActiveSongTitle, setActiveSongArtist]);

  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      const iframe = iframeRef.current;
      if (iframe?.contentWindow) {
        try {
          iframe.contentWindow.postMessage(JSON.stringify({ event: "listening" }), "*");
        } catch {}
      }
      const timeSinceLastIframe = Date.now() - lastIframeMsgTimeRef.current;
      if (!isSeeking && Date.now() > seekLockUntilRef.current && timeSinceLastIframe > 2000) {
        setCurrentTime((prev) => {
          if (duration > 0 && prev >= duration) return prev;
          return prev + 1;
        });
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [isPlaying, isSeeking, duration]);

  const sendVolumeToIframe = (vol: number, isMuted: boolean) => {
    const iframe = iframeRef.current;
    if (!iframe?.contentWindow) return;
    try {
      iframe.contentWindow.postMessage(
        JSON.stringify({
          event: "command",
          func: "setVolume",
          args: [isMuted ? 0 : vol],
        }),
        "*"
      );
      iframe.contentWindow.postMessage(
        JSON.stringify({
          event: "command",
          func: isMuted ? "mute" : "unMute",
          args: [],
        }),
        "*"
      );
    } catch {}
  };

  useEffect(() => {
    if (!activeEmbed) return;
    sendVolumeToIframe(muted ? 0 : volume, muted);
    const t1 = setTimeout(() => sendVolumeToIframe(muted ? 0 : volume, muted), 500);
    const t2 = setTimeout(() => sendVolumeToIframe(muted ? 0 : volume, muted), 1200);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [activeEmbed?.embedUrl, volume, muted]);

  useEffect(() => {
    const player = playerRef.current;
    if (!player) return;
    player.setVolume(muted ? 0 : volume);
    if (enabled && !activeEmbed) player.playVideo();
    else player.pauseVideo();
  }, [activeEmbed, enabled, muted, stationId, volume]);

  return (
    <>
      <div className="music-engine" aria-hidden="true">
        <YouTube
          key={station.videoId}
          videoId={station.videoId}
          opts={{ height: "1", width: "1", playerVars: { autoplay: enabled && !activeEmbed ? 1 : 0, controls: 0, disablekb: 1, fs: 0, playsinline: 1 } }}
          onReady={(event) => {
            playerRef.current = event.target;
            event.target.setVolume(muted ? 0 : volume);
            if (enabled && !activeEmbed) event.target.playVideo();
          }}
          onEnd={() => enabled && !activeEmbed && playerRef.current?.playVideo()}
        />
      </div>
      {activeEmbed && (
        <aside
          className={`music-provider-player ${isMinimized ? "music-provider-player--minimized" : "music-provider-player--expanded"}${hidden ? " music-provider-player--hidden" : ""}`}
          style={hidden ? { opacity: 0, pointerEvents: "none", visibility: "hidden" } : undefined}
          aria-label={`${activeEmbed.provider} player`}
          aria-hidden={hidden}
        >
          <div className="music-provider-player__iframe-wrap">
            <iframe
              ref={iframeRef}
              key={activeEmbed.embedUrl}
              src={getAutoplayUrl(activeEmbed.embedUrl)}
              title={`${activeEmbed.provider} music player`}
              sandbox="allow-scripts allow-same-origin allow-presentation"
              allow="autoplay; encrypted-media; picture-in-picture"
              loading="eager"
              onLoad={() => sendVolumeToIframe(muted ? 0 : volume, muted)}
            />
          </div>

          {!hidden && (
            <>
              {isMinimized ? (
                <div
                  className={`music-child-card ${isCardMinimized ? "music-child-card--minimized" : ""} flex flex-col gap-2.5 p-2 bg-transparent border-0 shadow-none`}
                  aria-label="Music player"
                >
                  {/* Header Row: Provider Icon, Pulse, Title, Play/Pause Button, Skip Button, Minimize Button, Stop Button */}
                  <div className="music-child-card__header flex items-center justify-between gap-2.5">
                    <div
                      className={`music-child-card__info flex items-center gap-1.5 min-w-0 flex-1 ${isCardMinimized ? "cursor-pointer" : ""}`}
                      onClick={() => isCardMinimized && setIsCardMinimized(false)}
                      title={isCardMinimized ? "Click to expand" : (activeSongTitle || activeEmbed.provider)}
                    >
                      <span className="music-child-card__icon flex items-center justify-center shrink-0" aria-hidden="true">
                        {activeEmbed.provider === "spotify" ? (
                          <SpotifyIcon className="w-4 h-4 text-emerald-500" />
                        ) : (
                          <YouTubeIcon className="w-4 h-4 text-red-500" />
                        )}
                      </span>
                      <span
                        className={`music-child-card__pulse ${isPlaying ? "is-playing" : ""}`}
                        aria-hidden="true"
                        title={isPlaying ? "Playing" : "Paused"}
                      />
                      <span
                        className="music-child-card__title truncate text-xs font-bold text-foreground max-w-[8.5rem]"
                        title={activeSongTitle || activeEmbed.provider}
                      >
                        {activeSongTitle || activeEmbed.provider}
                      </span>
                    </div>

                    <div className="music-child-card__actions flex items-center gap-1.5 shrink-0">
                      {isCardMinimized ? (
                        <button
                          type="button"
                          className="music-child-card__btn music-child-card__btn--expand"
                          onClick={() => setIsCardMinimized(false)}
                          aria-label="Maximize music card"
                          title="Maximize"
                        >
                          <MaximizeIcon className="w-3.5 h-3.5" />
                        </button>
                      ) : (
                        <>
                          <button
                            type="button"
                            className="music-child-card__btn music-child-card__btn--prev"
                            onClick={handlePreviousSong}
                            aria-label="Previous song"
                            title="Previous song"
                          >
                            <SkipBackIcon className="w-3.5 h-3.5 fill-current" />
                          </button>

                          <button
                            type="button"
                            className="music-child-card__btn music-child-card__btn--play"
                            onClick={togglePlay}
                            aria-label={isPlaying ? "Pause music" : "Play music"}
                            title={isPlaying ? "Pause" : "Play"}
                          >
                            {isPlaying ? (
                              <PauseIcon className="w-3.5 h-3.5 fill-current" />
                            ) : (
                              <PlayIcon className="w-3.5 h-3.5 fill-current" />
                            )}
                          </button>

                          <button
                            type="button"
                            className="music-child-card__btn music-child-card__btn--skip"
                            onClick={handleNextSong}
                            aria-label="Next song"
                            title="Next song"
                          >
                            <SkipForwardIcon className="w-3.5 h-3.5 fill-current" />
                          </button>

                          <button
                            type="button"
                            className="music-child-card__btn music-child-card__btn--min"
                            onClick={() => setIsCardMinimized(true)}
                            aria-label="Minimize music card"
                            title="Minimize"
                          >
                            <MinusIcon className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            className="music-child-card__btn music-child-card__btn--stop music-child-card__btn--close"
                            onClick={() => setActiveEmbed(null)}
                            aria-label="Stop music"
                            title="Stop music"
                          >
                            <SquareIcon className="w-3 h-3 fill-current" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>


                  {!isCardMinimized && (
                    <>
                      {/* Duration Seekbar Row: Current Time, Progress Bar, Total Duration */}
                      <div className="music-child-card__duration flex items-center gap-2 w-full" aria-label="Song duration progress">
                        <span className="music-child-card__time music-child-card__time--current text-accent font-mono text-[11px] font-bold min-w-[2.2rem] text-left">
                          {formatMMSS(currentTime)}
                        </span>
                        <input
                          type="range"
                          min="0"
                          max={duration > 0 ? duration : Math.max(currentTime, 180)}
                          value={currentTime}
                          onMouseDown={() => setIsSeeking(true)}
                          onTouchStart={() => setIsSeeking(true)}
                          onChange={(e) => {
                            const newTime = Number(e.target.value);
                            setCurrentTime(newTime);
                            handleSeek(newTime);
                          }}
                          onMouseUp={() => {
                            setIsSeeking(false);
                            seekLockUntilRef.current = Date.now() + 1000;
                          }}
                          onTouchEnd={() => {
                            setIsSeeking(false);
                            seekLockUntilRef.current = Date.now() + 1000;
                          }}
                          className="music-child-card__progress-slider music-child-card__slider flex-1 h-1.5 rounded-none cursor-pointer"
                          style={{
                            accentColor: "var(--accent, #f6c76d)",
                            background: `linear-gradient(to right, var(--accent, #f6c76d) ${(currentTime / (duration || Math.max(currentTime, 180))) * 100}%, rgba(255, 255, 255, 0.2) ${(currentTime / (duration || Math.max(currentTime, 180))) * 100}%)`,
                          }}
                          aria-label="Song progress"
                        />
                        <span className="music-child-card__time music-child-card__time--total text-text-muted font-mono text-[11px] font-semibold min-w-[2.2rem] text-right">
                          {duration > 0 ? formatMMSS(duration) : (currentTime > 0 ? formatMMSS(Math.max(currentTime, 180)) : "--:--")}
                        </span>
                      </div>

                      {/* Volume Row: Mute Toggle, Range Slider, Percentage */}
                      <div className="music-child-card__volume flex items-center gap-2 w-full" aria-label="Music volume control">
                        <button
                          type="button"
                          className="music-child-card__mute shrink-0 text-accent transition-colors"
                          onClick={() => {
                            const nextMuted = !muted;
                            setMuted(nextMuted);
                            sendVolumeToIframe(volume, nextMuted);
                          }}
                          aria-label={muted ? "Unmute YouTube Music" : "Mute YouTube Music"}
                          title={muted ? "Unmute" : "Mute"}
                        >
                          {muted || volume === 0 ? (
                            <VolumeXIcon className="w-3.5 h-3.5 text-text-muted hover:text-accent" />
                          ) : (
                            <Volume2Icon className="w-3.5 h-3.5 text-accent hover:text-accent-hover" />
                          )}
                        </button>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={muted ? 0 : volume}
                          onChange={(e) => {
                            const nextVol = Number(e.target.value);
                            setVolume(nextVol);
                            if (muted) setMuted(false);
                            sendVolumeToIframe(nextVol, false);
                          }}
                          className="music-child-card__slider flex-1 h-1.5 rounded-none cursor-pointer"
                          style={{
                            accentColor: "var(--accent, #f6c76d)",
                            background: `linear-gradient(to right, var(--accent, #f6c76d) ${muted ? 0 : volume}%, rgba(255, 255, 255, 0.2) ${muted ? 0 : volume}%)`,
                          }}
                          aria-label="YouTube Music Volume"
                        />
                        <span className="music-child-card__vol-text text-accent font-mono text-[11px] font-bold min-w-[2.2rem] text-right">
                          {muted ? "0%" : `${volume}%`}
                        </span>
                      </div>
                    </>
                  )}
                </div>
              ) : (
                <div className="music-provider-player__bar">
                  <div className="music-provider-player__title">
                    {activeEmbed.provider === "spotify" ? (
                      <SpotifyIcon className="w-3.5 h-3.5 text-emerald-500" />
                    ) : (
                      <YouTubeIcon className="w-3.5 h-3.5 text-red-500" />
                    )}
                    <span className="truncate max-w-[13rem]">{activeSongTitle || `${activeEmbed.provider} player`}</span>
                  </div>
                  <div className="music-provider-player__actions">
                    <button
                      type="button"
                      onClick={handlePreviousSong}
                      title="Previous / Replay"
                      aria-label="Previous / Replay"
                    >
                      <SkipBackIcon className="w-3 h-3 fill-current" />
                    </button>
                    <button
                      type="button"
                      onClick={togglePlay}
                      title={isPlaying ? "Pause" : "Play"}
                      aria-label={isPlaying ? "Pause" : "Play"}
                    >
                      {isPlaying ? <PauseIcon className="w-3 h-3" /> : <PlayIcon className="w-3 h-3 fill-current" />}
                    </button>
                    <button
                      type="button"
                      onClick={handleNextSong}
                      title="Next song"
                      aria-label="Next song"
                    >
                      <SkipForwardIcon className="w-3 h-3 fill-current" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsMinimized(true)}
                      title="Minimize to card"
                      aria-label="Minimize to card"
                    >
                      −
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveEmbed(null)}
                      title="Stop music"
                      aria-label="Stop music"
                    >
                      <SquareIcon className="w-2.5 h-2.5 fill-current" />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </aside>
      )}
    </>
  );
}

type MusicTab = "stations" | "my-music";

export function LoFiPlayer() {
  const [enabled, setEnabled] = useLocalStorage(KEYS.isLoFiEnabled, false);
  const [stationId, setStationId] = useLocalStorage(KEYS.lofiStation, DEFAULT_STATION_ID);
  const [volume, setVolume] = useLocalStorage(KEYS.lofiVolume, DEFAULT_LOFI_VOLUME);
  const [muted, setMuted] = useLocalStorage(KEYS.lofiMuted, false);
  const [savedEmbeds, setSavedEmbeds] = useLocalStorage<MusicEmbed[]>(KEYS.savedMusicEmbeds, []);
  const [activeEmbed, setActiveEmbed] = useLocalStorage<MusicEmbed | null>(KEYS.activeMusicEmbed, null);
  const [heardHistory, setHeardHistory] = useLocalStorage<HeardSongItem[]>(KEYS.heardMusicHistory, []);
  const [queue, setQueue] = useLocalStorage<QueueSongItem[]>(QUEUE_STORAGE_KEY, []);
  const [tab, setTab] = useState<MusicTab>("stations");
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");
  const station = RADIO_STATIONS.find((item) => item.id === stationId) ?? RADIO_STATIONS[0];

  // Spotify state
  const [spotifyToken, setSpotifyToken] = useState<SpotifyTokenData | null>(null);
  const [spotifyUser, setSpotifyUser] = useState<string>("");
  const [spotifyPlaylists, setSpotifyPlaylists] = useState<SpotifyPlaylistSummary[]>([]);
  const [loadingSpotify, setLoadingSpotify] = useState(false);
  const [customClientId, setCustomClientId] = useState("");
  const [showSpotifySetup, setShowSpotifySetup] = useState(false);

  const [activeSongTitle, setActiveSongTitle] = useLocalStorage<string>("ytdoro:music:active-title", "");
  const [activeSongArtist, setActiveSongArtist] = useLocalStorage<string>("ytdoro:music:active-artist", "");

  // YouTube / Google state
  const [googleToken, setGoogleToken] = useState<string | null>(null);
  const [youtubePlaylists, setYoutubePlaylists] = useState<YouTubePlaylistSummary[]>([]);
  const [youtubeSongs, setYoutubeSongs] = useLocalStorage<YouTubeSongSummary[]>(GOOGLE_YOUTUBE_SONGS_KEY, []);
  const [ytSubView, setYtSubView] = useState<"liked" | "search" | "playlists" | "history">("liked");
  const [loadingYouTube, setLoadingYouTube] = useState(false);
  const [loadingSongs, setLoadingSongs] = useState(false);
  const [youtubeStatus, setYoutubeStatus] = useState<string>("");
  const [expandedPlaylistId, setExpandedPlaylistId] = useState<string | null>(null);
  const [playlistTracks, setPlaylistTracks] = useState<Record<string, YouTubeSongSummary[]>>({});
  const [loadingPlaylistTracks, setLoadingPlaylistTracks] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<YouTubeSongSummary[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState("");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const token = getStoredSpotifyToken();
    setSpotifyToken(token);
    const user = window.localStorage.getItem(SPOTIFY_STORAGE_KEYS.userName) || "";
    setSpotifyUser(user);
    const savedClientId = window.localStorage.getItem(SPOTIFY_STORAGE_KEYS.clientId) || "";
    setCustomClientId(savedClientId);

    void getGoogleProviderToken().then((t) => {
      setGoogleToken(t);
      if (t) {
        void fetchGoogleYouTubeLikedVideos(t).then((res) => {
          if (res.songs.length > 0) {
            setYoutubeSongs(res.songs);
            setQueue((curr) => {
              if (!curr || curr.length === 0) {
                return res.songs.map((s) => ({
                  id: s.id,
                  title: s.title,
                  artist: s.artist || "YouTube Music",
                  provider: "youtube",
                  sourceUrl: s.externalUrl,
                  embedUrl: youtubeSongToMusicEmbed(s).embedUrl,
                }));
              }
              return curr;
            });
          }
        });
      }
    });
  }, [setYoutubeSongs, setQueue]);

  const recordHeardTrack = (title: string, provider: MusicEmbed["provider"], sourceUrl: string, embedUrl: string, artist?: string) => {
    setHeardHistory((prev) => {
      const filtered = prev.filter((item) => item.sourceUrl !== sourceUrl);
      const nextItem: HeardSongItem = {
        id: sourceUrl,
        title,
        artist,
        provider,
        sourceUrl,
        embedUrl,
        playedAt: Date.now(),
      };
      return [nextItem, ...filtered].slice(0, 50);
    });
  };

  const handleConnectSpotify = async () => {
    setError("");
    const clientId = process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID || customClientId.trim();
    if (!clientId) {
      setShowSpotifySetup(true);
      setError("Please provide a Spotify Client ID to connect your account.");
      return;
    }
    const redirectUri = `${window.location.origin}/auth/spotify-callback`;
    const authUrl = await createSpotifyAuthUrl(clientId, redirectUri);
    window.location.href = authUrl;
  };

  const handleLoadSpotifyPlaylists = async () => {
    if (!spotifyToken?.accessToken) return;
    setLoadingSpotify(true);
    setError("");
    const lists = await fetchSpotifyPlaylists(spotifyToken.accessToken);
    setSpotifyPlaylists(lists);
    setLoadingSpotify(false);
    if (lists.length === 0) {
      setError("No Spotify playlists found or access token expired. Reconnect Spotify if needed.");
    }
  };

  const handleDisconnectSpotify = () => {
    disconnectSpotify();
    setSpotifyToken(null);
    setSpotifyUser("");
    setSpotifyPlaylists([]);
  };

  const handleSelectSpotifyPlaylist = (playlist: SpotifyPlaylistSummary) => {
    const embed = playlistToMusicEmbed(playlist);
    setSavedEmbeds((items) => items.some((item) => item.sourceUrl === embed.sourceUrl) ? items : [...items, embed]);
    setActiveSongTitle(playlist.name);
    setActiveSongArtist("Spotify");
    setActiveEmbed(embed);
    setEnabled(false);
    recordHeardTrack(playlist.name, "spotify", playlist.externalUrl, playlist.embedUrl);
  };

  const handleSyncYouTube = async (forceReconnect = false) => {
    setLoadingYouTube(true);
    setYoutubeStatus("");

    if (forceReconnect) {
      setLoadingYouTube(false);
      setYoutubeStatus("Redirecting to Google to connect YouTube Music…");
      await requestGoogleYouTubeAccess();
      return;
    }

    const token = googleToken || await getGoogleProviderToken();
    if (!token) {
      setLoadingYouTube(false);
      setYoutubeStatus("Redirecting to Google to connect YouTube Music…");
      await requestGoogleYouTubeAccess();
      return;
    }

    const result = await fetchGoogleYouTubePlaylistsResult(token);
    setLoadingYouTube(false);

    if (result.error) {
      if (result.error === "API_DISABLED") {
        setYoutubeStatus("YouTube Data API v3 is not enabled in your Google Cloud Project. Enable it or paste playlist links below.");
      } else {
        setGoogleToken(null);
        setYoutubeStatus("Google session needs YouTube permission. Click Reconnect below.");
      }
      return;
    }

    setYoutubePlaylists(result.playlists);
    if (result.playlists.length === 0) {
      setYoutubeStatus("No YouTube playlists found in your account. You can paste a playlist link below.");
    }
  };

  const handleSyncLikedSongs = async () => {
    setLoadingSongs(true);
    setYoutubeStatus("");
    const token = googleToken || await getGoogleProviderToken();
    if (!token) {
      setLoadingSongs(false);
      setYoutubeStatus("Redirecting to Google to connect YouTube Music…");
      await requestGoogleYouTubeAccess();
      return;
    }

    const result = await fetchGoogleYouTubeLikedVideos(token);
    setLoadingSongs(false);

    if (result.error) {
      if (result.error === "API_DISABLED") {
        setYoutubeStatus("YouTube Data API v3 is not enabled in your Google Cloud Project. Enable it or paste links below.");
      } else {
        setGoogleToken(null);
        setYoutubeStatus("Google session needs YouTube permission. Click Reconnect below.");
      }
      return;
    }

    setYoutubeSongs(result.songs);
    if (result.songs.length > 0) {
      try {
        const queueItems: QueueSongItem[] = result.songs.map((s) => ({
          id: s.id,
          title: s.title,
          artist: s.artist || "YouTube Music",
          provider: "youtube",
          sourceUrl: s.externalUrl,
          embedUrl: youtubeSongToMusicEmbed(s).embedUrl,
        }));
        setQueue(queueItems);
      } catch {}
    }
    if (result.songs.length === 0) {
      setYoutubeStatus("No liked songs found on your YouTube account.");
    }
  };

  const executeSearch = async (queryText: string) => {
    const trimmed = queryText.trim();
    if (!trimmed) return;
    setIsSearching(true);
    setSearchError("");
    const token = googleToken || (await getGoogleProviderToken());
    if (!token) {
      setIsSearching(false);
      setSearchError("Google account required to search YouTube Music. Connect Google above.");
      return;
    }
    const result = await searchGoogleYouTubeMusic(trimmed, token);
    setIsSearching(false);
    if (result.error) {
      if (result.error === "API_DISABLED") {
        setSearchError("YouTube Data API v3 is not enabled in your Google Cloud Project.");
      } else {
        setSearchError(result.errorMessage || "Search request failed. Please try again.");
      }
      return;
    }
    setSearchResults(result.songs);
    if (result.songs.length === 0) {
      setSearchError(`No songs found matching "${trimmed}".`);
    }
  };

  const handleSearchSubmit = (e: FormEvent) => {
    e.preventDefault();
    void executeSearch(searchQuery);
  };

  const handlePlaySong = (song: YouTubeSongSummary) => {
    const embed = youtubeSongToMusicEmbed(song);
    setSavedEmbeds((items) => items.some((item) => item.sourceUrl === embed.sourceUrl) ? items : [...items, embed]);
    setActiveSongTitle(song.title);
    setActiveSongArtist(song.artist || "YouTube Music");
    setActiveEmbed(embed);
    setEnabled(false);
    recordHeardTrack(song.title, "youtube", song.externalUrl, embed.embedUrl, song.artist);

    try {
      const activeList = searchResults.some((s) => s.id === song.id)
        ? searchResults
        : (expandedPlaylistId && playlistTracks[expandedPlaylistId]?.some((s) => s.id === song.id))
        ? playlistTracks[expandedPlaylistId]
        : youtubeSongs;
      if (activeList.length > 0) {
        const queueItems: QueueSongItem[] = activeList.map((s) => ({
          id: s.id,
          title: s.title,
          artist: s.artist || "YouTube Music",
          provider: "youtube",
          sourceUrl: s.externalUrl,
          embedUrl: youtubeSongToMusicEmbed(s).embedUrl,
        }));
        setQueue(queueItems);
      }
    } catch {}
  };

  const handleToggleExpandPlaylist = async (playlistId: string) => {
    if (expandedPlaylistId === playlistId) {
      setExpandedPlaylistId(null);
      return;
    }
    setExpandedPlaylistId(playlistId);
    if (!playlistTracks[playlistId]) {
      const token = googleToken || await getGoogleProviderToken();
      if (!token) return;
      setLoadingPlaylistTracks(playlistId);
      const tracks = await fetchGoogleYouTubePlaylistItems(token, playlistId);
      setPlaylistTracks((prev) => ({ ...prev, [playlistId]: tracks }));
      setLoadingPlaylistTracks(null);
    }
  };

  const handleSelectYouTubePlaylist = async (playlist: YouTubePlaylistSummary) => {
    const embed = youtubePlaylistToMusicEmbed(playlist);
    setSavedEmbeds((items) => items.some((item) => item.sourceUrl === embed.sourceUrl) ? items : [...items, embed]);
    setActiveSongTitle(playlist.title);
    setActiveSongArtist("YouTube Music");
    setActiveEmbed(embed);
    setEnabled(false);
    recordHeardTrack(playlist.title, "youtube", playlist.externalUrl, embed.embedUrl);

    if (playlistTracks[playlist.id]?.length > 0) {
      const q: QueueSongItem[] = playlistTracks[playlist.id].map((t) => ({
        id: t.id,
        title: t.title,
        artist: t.artist || "YouTube Music",
        provider: "youtube",
        sourceUrl: t.externalUrl,
        embedUrl: youtubeSongToMusicEmbed(t).embedUrl,
      }));
      setQueue(q);
    } else if (playlist.id === "LM" && youtubeSongs.length > 0) {
      const q: QueueSongItem[] = youtubeSongs.map((t) => ({
        id: t.id,
        title: t.title,
        artist: t.artist || "YouTube Music",
        provider: "youtube",
        sourceUrl: t.externalUrl,
        embedUrl: youtubeSongToMusicEmbed(t).embedUrl,
      }));
      setQueue(q);
    } else {
      const token = googleToken || await getGoogleProviderToken();
      if (token) {
        if (playlist.id === "LM") {
          const res = await fetchGoogleYouTubeLikedVideos(token);
          if (res.songs.length > 0) {
            setYoutubeSongs(res.songs);
            const q: QueueSongItem[] = res.songs.map((t) => ({
              id: t.id,
              title: t.title,
              artist: t.artist || "YouTube Music",
              provider: "youtube",
              sourceUrl: t.externalUrl,
              embedUrl: youtubeSongToMusicEmbed(t).embedUrl,
            }));
            setQueue(q);
          }
        } else {
          const tracks = await fetchGoogleYouTubePlaylistItems(token, playlist.id);
          if (tracks.length > 0) {
            setPlaylistTracks((prev) => ({ ...prev, [playlist.id]: tracks }));
            const q: QueueSongItem[] = tracks.map((t) => ({
              id: t.id,
              title: t.title,
              artist: t.artist || "YouTube Music",
              provider: "youtube",
              sourceUrl: t.externalUrl,
              embedUrl: youtubeSongToMusicEmbed(t).embedUrl,
            }));
            setQueue(q);
          }
        }
      }
    }
  };

  const saveProvider = (event: FormEvent) => {
    event.preventDefault();
    const parsed = parseMusicProviderUrl(url);
    if (!parsed) {
      setError("Use a valid HTTPS Spotify, Apple Music, YouTube, SoundCloud, or Amazon Music URL.");
      return;
    }
    setSavedEmbeds((items) => items.some((item) => item.sourceUrl === parsed.sourceUrl) ? items : [...items, parsed]);
    setActiveSongTitle(parsed.provider === "youtube" ? "YouTube Music" : `${parsed.provider} Track`);
    setActiveSongArtist(parsed.provider);
    setActiveEmbed(parsed);
    setEnabled(false);
    setUrl("");
    setError("");
  };

  const selectStation = (id: string) => {
    setStationId(id);
    setActiveEmbed(null);
    setActiveSongTitle("");
    setActiveSongArtist("");
    setEnabled(true);
  };

  return (
    <div className="audio-panel music-panel music-shelf">
      <header className="music-shelf__header">
        <div>
          <h3>{activeSongTitle || (activeEmbed ? activeEmbed.provider : station.name)}</h3>
          <p className="music-shelf__now-playing">{activeSongArtist || (activeEmbed ? "External provider" : station.genre)}</p>
        </div>
      </header>

      <div className="music-shelf__tabs" role="tablist" aria-label="Music sources">
        {([["stations", "Stations"], ["my-music", "My Music"]] as const).map(([value, label]) => (
          <button key={value} type="button" role="tab" aria-selected={tab === value} className={tab === value ? "music-shelf__tab is-active" : "music-shelf__tab"} onClick={() => setTab(value)}>{label}</button>
        ))}
      </div>

      {tab === "stations" && (
        <div className="music-shelf__body">
          <div className="music-shelf__controls">
            <button type="button" className="music-shelf__primary" onClick={() => { setActiveEmbed(null); setEnabled(!enabled); }}><MusicIcon />{enabled && !activeEmbed ? "Pause music" : "Play music"}</button>
            <button type="button" className="music-shelf__mute" onClick={() => setMuted(!muted)} aria-label={muted ? "Unmute music" : "Mute music"}>{muted ? <VolumeXIcon /> : <Volume2Icon />}</button>
          </div>
          <label className="music-shelf__volume"><span>Volume <output>{muted ? 0 : volume}%</output></span><input type="range" min="0" max="100" value={muted ? 0 : volume} onChange={(event) => { setVolume(Number(event.target.value)); setMuted(false); }} /></label>
          <div className="music-shelf__list" aria-label="Built-in stations">
            {RADIO_STATIONS.map((item) => {
              const selected = item.id === stationId && !activeEmbed;
              return (
                <button key={item.id} type="button" aria-pressed={selected} className={selected ? "music-shelf__track is-active" : "music-shelf__track"} onClick={() => selectStation(item.id)}>
                  <span className="music-shelf__marker" aria-hidden="true" />
                  <span className="music-shelf__track-copy"><strong>{item.name}</strong><small>{item.genre}</small></span>
                  <span className="music-shelf__track-state">{selected ? "Selected" : "Choose"}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {tab === "my-music" && (
        <div className="music-provider-list music-shelf__provider">
          <div className="music-accounts-grid flex flex-col gap-2.5 mb-3">
            {/* YouTube Music Card */}
            <div className="music-account-card border border-border-subtle rounded-lg bg-surface-secondary/70 p-3">
              <div className="music-account-card__header flex items-center justify-between gap-3">
                <div className="music-account-card__identity flex items-center gap-2.5 min-w-0">
                  <span className="music-account-card__icon shrink-0 flex items-center justify-center w-7 h-7 text-red-500" aria-hidden="true">
                    <YouTubeIcon className="w-5 h-5" />
                  </span>
                  <div className="flex flex-col text-left">
                    <strong className="text-xs font-semibold text-foreground leading-tight block">YouTube Music</strong>
                    <small className="text-[11px] text-text-muted leading-tight block mt-0.5">{googleToken ? "Google Linked" : "Connect Google"}</small>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    className={googleToken ? "music-account-card__disconnect text-[11px] text-text-muted hover:text-foreground underline cursor-pointer" : "music-account-card__action text-xs font-bold px-3 py-1.5 rounded-md bg-accent text-white hover:opacity-90 cursor-pointer"}
                    onClick={() => { void handleSyncYouTube(true); }}
                    disabled={loadingYouTube}
                  >
                    {googleToken ? "Reconnect" : "Connect"}
                  </button>
                </div>
              </div>

              {googleToken && (
                <div className="flex items-center gap-1 mt-2.5 pt-2 border-t border-border-subtle/60 text-xs">
                  <button
                    type="button"
                    className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-colors cursor-pointer ${ytSubView === "liked" ? "bg-accent text-white" : "bg-surface-secondary text-text-muted hover:text-foreground"}`}
                    onClick={() => { setYtSubView("liked"); if (youtubeSongs.length === 0) void handleSyncLikedSongs(); }}
                  >
                    Liked Songs
                  </button>
                  <button
                    type="button"
                    className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-colors cursor-pointer ${ytSubView === "search" ? "bg-accent text-white" : "bg-surface-secondary text-text-muted hover:text-foreground"}`}
                    onClick={() => setYtSubView("search")}
                  >
                    Search
                  </button>
                  <button
                    type="button"
                    className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-colors cursor-pointer ${ytSubView === "playlists" ? "bg-accent text-white" : "bg-surface-secondary text-text-muted hover:text-foreground"}`}
                    onClick={() => { setYtSubView("playlists"); if (youtubePlaylists.length === 0) void handleSyncYouTube(false); }}
                  >
                    Playlists
                  </button>
                  <button
                    type="button"
                    className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-colors cursor-pointer ${ytSubView === "history" ? "bg-accent text-white" : "bg-surface-secondary text-text-muted hover:text-foreground"}`}
                    onClick={() => setYtSubView("history")}
                  >
                    History {heardHistory.length > 0 ? `(${heardHistory.length})` : ""}
                  </button>
                </div>
              )}

              {youtubeStatus && (
                <div className="mt-2 pt-2 border-t border-border-subtle/60 flex items-center justify-between gap-2">
                  <p className="text-[11px] text-text-muted leading-tight flex-1">{youtubeStatus}</p>
                  {!googleToken && (
                    <button
                      type="button"
                      className="text-[11px] font-bold text-accent shrink-0 hover:underline cursor-pointer"
                      onClick={() => { void handleSyncYouTube(true); }}
                    >
                      Grant Permission
                    </button>
                  )}
                </div>
              )}

              {/* Sub-view: Liked Songs */}
              {googleToken && ytSubView === "liked" && (
                <div className="mt-2.5">
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] uppercase font-bold tracking-wider text-text-muted">YouTube Music Songs ({youtubeSongs.length})</span>
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-surface-secondary border border-border-subtle text-text-muted font-medium">Music Only</span>
                    </div>
                    <button
                      type="button"
                      className="text-[10px] text-accent font-semibold hover:underline cursor-pointer"
                      onClick={() => { void handleSyncLikedSongs(); }}
                      disabled={loadingSongs}
                    >
                      {loadingSongs ? "Loading…" : "Sync Songs"}
                    </button>
                  </div>
                  {youtubeSongs.length > 0 ? (
                    <div className="music-playlist-list flex flex-col gap-1 max-h-48 overflow-y-auto" aria-label="Liked Songs">
                      {youtubeSongs.map((song) => {
                        const isCurrentPlaying = activeEmbed?.sourceUrl === song.externalUrl;
                        return (
                          <button
                            key={song.id}
                            type="button"
                            className={`music-playlist-item flex items-center justify-between p-2 rounded-md border border-border-subtle bg-surface-primary/40 hover:bg-surface-hover text-left cursor-pointer transition-colors ${isCurrentPlaying ? "border-accent ring-1 ring-accent/30" : ""}`}
                            onClick={() => handlePlaySong(song)}
                          >
                            <div className="min-w-0 flex-1 pr-2">
                              <span className="music-playlist-item__title text-xs text-foreground block truncate">{song.title}</span>
                              {song.artist && <small className="text-[10px] text-text-muted block truncate">{song.artist}</small>}
                            </div>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-surface-hover border border-border-subtle text-accent shrink-0">
                              {isCurrentPlaying ? "Playing" : "Play"}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  ) : !loadingSongs ? (
                    <p className="text-[11px] text-text-muted py-2 text-center">Click &quot;Sync Songs&quot; to load your YouTube Music liked songs.</p>
                  ) : (
                    <p className="text-[11px] text-text-muted py-2 text-center animate-pulse">Loading your YouTube Music songs…</p>
                  )}
                </div>
              )}

              {/* Sub-view: Search */}
              {googleToken && ytSubView === "search" && (
                <div className="mt-2.5">
                  <form onSubmit={handleSearchSubmit} className="flex items-center gap-1.5 mb-2">
                    <input
                      type="search"
                      placeholder="Search songs, artists on YouTube Music…"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="flex-1 bg-surface-primary border border-border-subtle rounded-md px-2.5 py-1 text-xs text-foreground placeholder:text-text-muted focus:outline-none focus:border-accent"
                    />
                    <button
                      type="submit"
                      disabled={isSearching || !searchQuery.trim()}
                      className="px-3 py-1 rounded-md bg-accent text-white text-xs font-semibold hover:opacity-90 disabled:opacity-50 cursor-pointer shrink-0 transition-opacity"
                    >
                      {isSearching ? "Searching…" : "Search"}
                    </button>
                  </form>

                  {searchResults.length === 0 && !isSearching && (
                    <div className="flex flex-col gap-2 py-2">
                      <span className="text-[10px] text-text-muted uppercase font-bold tracking-wider">Quick Suggestions</span>
                      <div className="flex flex-wrap gap-1.5">
                        {["Lofi Hip Hop Study", "Anime Chill Piano", "Midnight Focus Lofi", "Indie Chill Vibes", "Coffee Shop Ambient"].map((tag) => (
                          <button
                            key={tag}
                            type="button"
                            className="text-[11px] px-2 py-0.5 rounded-full bg-surface-primary border border-border-subtle text-text-muted hover:text-foreground hover:border-accent cursor-pointer transition-colors"
                            onClick={() => {
                              setSearchQuery(tag);
                              void executeSearch(tag);
                            }}
                          >
                            {tag}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {searchError && (
                    <p className="text-[11px] text-red-400 py-1.5 text-center">{searchError}</p>
                  )}

                  {isSearching && (
                    <p className="text-[11px] text-text-muted py-2 text-center animate-pulse">Searching YouTube Music…</p>
                  )}

                  {searchResults.length > 0 && (
                    <div className="music-playlist-list flex flex-col gap-1 max-h-48 overflow-y-auto" aria-label="Search Results">
                      {searchResults.map((song) => {
                        const isCurrentPlaying = activeEmbed?.sourceUrl === song.externalUrl;
                        return (
                          <button
                            key={song.id}
                            type="button"
                            className={`music-playlist-item flex items-center justify-between p-2 rounded-md border border-border-subtle bg-surface-primary/40 hover:bg-surface-hover text-left cursor-pointer transition-colors ${isCurrentPlaying ? "border-accent ring-1 ring-accent/30" : ""}`}
                            onClick={() => handlePlaySong(song)}
                          >
                            <div className="flex items-center gap-2 min-w-0 flex-1 pr-2">
                              {song.thumbnailUrl && (
                                <img
                                  src={song.thumbnailUrl}
                                  alt=""
                                  className="w-8 h-8 rounded object-cover shrink-0 bg-surface-secondary"
                                  loading="lazy"
                                />
                              )}
                              <div className="min-w-0 flex-1">
                                <span className="music-playlist-item__title text-xs text-foreground block truncate">{song.title}</span>
                                {song.artist && <small className="text-[10px] text-text-muted block truncate">{song.artist}</small>}
                              </div>
                            </div>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-surface-hover border border-border-subtle text-accent shrink-0">
                              {isCurrentPlaying ? "Playing" : "Play"}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Sub-view: Playlists */}
              {googleToken && ytSubView === "playlists" && (
                <div className="mt-2.5">
                  {/* Featured YouTube Music Auto-Playlist: Musik yang Disukai */}
                  <div className="border border-red-500/30 bg-red-500/10 rounded-md p-2 mb-2 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-6 h-6 rounded flex items-center justify-center bg-red-500/20 text-red-500 shrink-0" aria-hidden="true">
                        <YouTubeIcon className="w-3.5 h-3.5" />
                      </span>
                      <div className="min-w-0">
                        <strong className="text-xs font-semibold text-foreground block truncate">Musik yang Disukai</strong>
                        <span className="text-[10px] text-text-muted block truncate">Official YouTube Music Liked Auto-Playlist</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      className="text-[10px] font-bold px-2.5 py-1 rounded bg-red-500 text-white hover:bg-red-600 transition-colors shrink-0 cursor-pointer"
                      onClick={() => handleSelectYouTubePlaylist(getYouTubeLikedMusicPlaylist())}
                    >
                      Play
                    </button>
                  </div>

                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-text-muted">Playlists ({youtubePlaylists.length})</span>
                    <button
                      type="button"
                      className="text-[10px] text-accent font-semibold hover:underline cursor-pointer"
                      onClick={() => { void handleSyncYouTube(false); }}
                      disabled={loadingYouTube}
                    >
                      {loadingYouTube ? "Loading…" : "Sync Playlists"}
                    </button>
                  </div>
                  {youtubePlaylists.length > 0 ? (
                    <div className="music-playlist-list flex flex-col gap-1 max-h-48 overflow-y-auto" aria-label="YouTube Music Playlists">
                      {youtubePlaylists.map((pl) => {
                        const isExpanded = expandedPlaylistId === pl.id;
                        const tracks = playlistTracks[pl.id] || [];
                        const isLoadingTracks = loadingPlaylistTracks === pl.id;
                        return (
                          <div key={pl.id} className="border border-border-subtle rounded-md bg-surface-primary/30 p-1.5 flex flex-col gap-1">
                            <div className="flex items-center justify-between gap-2">
                              <button
                                type="button"
                                className="text-left min-w-0 flex-1 cursor-pointer"
                                onClick={() => handleSelectYouTubePlaylist(pl)}
                              >
                                <span className="music-playlist-item__title text-xs font-medium text-foreground block truncate">{pl.title}</span>
                                <small className="music-playlist-item__meta text-[10px] text-text-muted font-mono">{pl.itemCount} tracks • Play All</small>
                              </button>
                              <button
                                type="button"
                                className="text-[10px] px-2 py-0.5 rounded bg-surface-hover border border-border-subtle text-text-muted hover:text-foreground shrink-0 cursor-pointer"
                                onClick={() => { void handleToggleExpandPlaylist(pl.id); }}
                              >
                                {isExpanded ? "Hide Songs" : "Songs"}
                              </button>
                            </div>
                            {isExpanded && (
                              <div className="mt-1 pl-2 border-l border-border-subtle flex flex-col gap-1">
                                {isLoadingTracks ? (
                                  <p className="text-[10px] text-text-muted py-1 animate-pulse">Loading tracks…</p>
                                ) : tracks.length > 0 ? (
                                  tracks.map((track) => (
                                    <button
                                      key={track.id}
                                      type="button"
                                      className="flex items-center justify-between p-1 rounded hover:bg-surface-hover text-left cursor-pointer"
                                      onClick={() => handlePlaySong(track)}
                                    >
                                      <span className="text-[11px] text-foreground truncate max-w-[13rem]">{track.title}</span>
                                      <span className="text-[9px] text-accent font-bold">Play</span>
                                    </button>
                                  ))
                                ) : (
                                  <p className="text-[10px] text-text-muted py-1">No tracks found.</p>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : !loadingYouTube ? (
                    <p className="text-[11px] text-text-muted py-2 text-center">Click "Sync Playlists" to load your YouTube playlists.</p>
                  ) : (
                    <p className="text-[11px] text-text-muted py-2 text-center animate-pulse">Loading playlists…</p>
                  )}
                </div>
              )}

              {/* Sub-view: Song Heard History */}
              {googleToken && ytSubView === "history" && (
                <div className="mt-2.5">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-text-muted">Recently Heard ({heardHistory.length})</span>
                    {heardHistory.length > 0 && (
                      <button
                        type="button"
                        className="text-[10px] text-text-muted hover:text-rose-400 font-semibold cursor-pointer"
                        onClick={() => setHeardHistory([])}
                      >
                        Clear
                      </button>
                    )}
                  </div>
                  {heardHistory.length > 0 ? (
                    <div className="music-playlist-list flex flex-col gap-1 max-h-48 overflow-y-auto" aria-label="Heard History">
                      {heardHistory.map((item) => (
                        <button
                          key={item.id + item.playedAt}
                          type="button"
                          className="music-playlist-item flex items-center justify-between p-2 rounded-md border border-border-subtle bg-surface-primary/40 hover:bg-surface-hover text-left cursor-pointer transition-colors"
                          onClick={() => {
                            const embed: MusicEmbed = { provider: item.provider, sourceUrl: item.sourceUrl, embedUrl: item.embedUrl };
                            setActiveSongTitle(item.title);
                            setActiveSongArtist(item.artist || "");
                            setActiveEmbed(embed);
                            setEnabled(false);
                            recordHeardTrack(item.title, item.provider, item.sourceUrl, item.embedUrl, item.artist);
                          }}
                        >
                          <div className="min-w-0 flex-1 pr-2">
                            <span className="music-playlist-item__title text-xs text-foreground block truncate">{item.title}</span>
                            <small className="text-[10px] text-text-muted block truncate font-mono uppercase">{item.provider} • {new Date(item.playedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</small>
                          </div>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-surface-hover border border-border-subtle text-accent shrink-0">Replay</span>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[11px] text-text-muted py-2 text-center">No songs heard yet. Play any song or playlist to start your history!</p>
                  )}
                </div>
              )}
            </div>

            {/* Spotify Card */}
            <div className="music-account-card border border-border-subtle rounded-lg bg-surface-secondary/70 p-3">
              <div className="music-account-card__header flex items-center justify-between gap-3">
                <div className="music-account-card__identity flex items-center gap-2.5 min-w-0">
                  <span className="music-account-card__icon shrink-0 flex items-center justify-center w-7 h-7 text-emerald-500" aria-hidden="true">
                    <SpotifyIcon className="w-5 h-5" />
                  </span>
                  <div className="flex flex-col text-left">
                    <strong className="text-xs font-semibold text-foreground leading-tight block">Spotify</strong>
                    <small className="text-[11px] text-text-muted leading-tight block mt-0.5">{spotifyToken ? (spotifyUser || "Connected") : "Connect Account"}</small>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  {spotifyToken ? (
                    <>
                      <button
                        type="button"
                        className="music-account-card__action text-xs font-bold px-3 py-1.5 rounded-md bg-accent text-white hover:opacity-90 cursor-pointer disabled:opacity-50"
                        onClick={() => { void handleLoadSpotifyPlaylists(); }}
                        disabled={loadingSpotify}
                      >
                        {loadingSpotify ? "Loading…" : "Sync"}
                      </button>
                      <button
                        type="button"
                        className="music-account-card__disconnect text-[11px] text-text-muted hover:text-foreground underline cursor-pointer"
                        onClick={handleDisconnectSpotify}
                      >
                        Disconnect
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      className="music-account-card__action text-xs font-bold px-3 py-1.5 rounded-md bg-accent text-white hover:opacity-90 cursor-pointer"
                      onClick={() => { void handleConnectSpotify(); }}
                    >
                      Connect
                    </button>
                  )}
                </div>
              </div>
              {showSpotifySetup && !spotifyToken && (
                <div className="music-account-config mt-2.5 pt-2.5 border-t border-border-subtle flex flex-col gap-1.5">
                  <small className="text-[11px] text-text-muted">Spotify Client ID (from developer.spotify.com):</small>
                  <div className="flex gap-1.5">
                    <input
                      type="text"
                      placeholder="Paste Client ID"
                      value={customClientId}
                      onChange={(e) => setCustomClientId(e.target.value)}
                      className="text-xs px-2.5 py-1.5 bg-surface-secondary border border-border-subtle rounded flex-1 text-foreground"
                    />
                    <button
                      type="button"
                      className="music-account-card__action text-xs font-bold px-3 py-1.5 rounded-md bg-accent text-white hover:opacity-90 cursor-pointer"
                      onClick={() => { void handleConnectSpotify(); }}
                    >
                      Authorize
                    </button>
                  </div>
                </div>
              )}
              {spotifyPlaylists.length > 0 && (
                <div className="music-playlist-list mt-2.5 flex flex-col gap-1.5 max-h-36 overflow-y-auto" aria-label="Spotify Playlists">
                  {spotifyPlaylists.map((pl) => (
                    <button
                      key={pl.id}
                      type="button"
                      className="music-playlist-item flex items-center justify-between p-2 rounded-md border border-border-subtle bg-surface-primary/40 hover:bg-surface-hover text-left cursor-pointer transition-colors"
                      onClick={() => handleSelectSpotifyPlaylist(pl)}
                    >
                      <span className="music-playlist-item__title text-xs text-foreground truncate max-w-[14rem]">{pl.name}</span>
                      <small className="music-playlist-item__meta text-[10px] text-text-muted font-mono shrink-0 ml-2">{pl.totalTracks} tracks</small>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="pt-2 border-t border-border-subtle/50">
            <p className="text-[11px] font-semibold text-text-muted uppercase tracking-wider mb-2">Or paste playlist / track URL</p>
            <form onSubmit={saveProvider} className="flex gap-2">
              <input value={url} onChange={(event) => setUrl(event.target.value)} placeholder="Paste Spotify or YouTube Music URL" aria-label="Music provider URL" />
              <button type="submit">Save</button>
            </form>
            {error && <p className="audio-panel__error mt-1.5" role="alert">{error}</p>}
            <p className="audio-panel__hint mt-1.5">Provider controls stay in the persistent player. Some providers may block embeds by region or account.</p>
          </div>
          {savedEmbeds.map((item) => (
            <div key={item.sourceUrl} className="music-provider-row">
              <button type="button" onClick={() => { setActiveEmbed(item); setActiveSongTitle(item.provider === "youtube" ? "YouTube Music" : `${item.provider} Track`); setActiveSongArtist(item.provider); setEnabled(false); }}><strong>{item.provider}</strong><small>{item.sourceUrl}</small></button>
              <button type="button" onClick={() => { setSavedEmbeds((items) => items.filter((saved) => saved.sourceUrl !== item.sourceUrl)); if (activeEmbed?.sourceUrl === item.sourceUrl) setActiveEmbed(null); }} aria-label={`Remove ${item.provider} link`}><TrashIcon /></button>
            </div>
          ))}
        </div>
      )}

    </div>
  );
}
