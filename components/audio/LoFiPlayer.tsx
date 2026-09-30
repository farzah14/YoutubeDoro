"use client";

import dynamic from "next/dynamic";
import { ComponentType, FormEvent, useEffect, useRef, useState } from "react";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { KEYS } from "@/lib/constants";
import { DEFAULT_LOFI_VOLUME, DEFAULT_STATION_ID, RADIO_STATIONS } from "@/lib/audioStreams";
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
  fetchGoogleYouTubePlaylists,
  fetchGoogleYouTubePlaylistsResult,
  getGoogleProviderToken,
  requestGoogleYouTubeAccess,
  youtubePlaylistToMusicEmbed,
  type YouTubePlaylistSummary,
} from "@/lib/youtubeMusicApi";
import { MusicIcon, SpotifyIcon, TrashIcon, Volume2Icon, VolumeXIcon, YouTubeIcon } from "../icons";

const YouTube = dynamic(() => import("react-youtube"), { ssr: false }) as unknown as ComponentType<YouTubeComponentProps>;

interface MinimalYTPlayer {
  playVideo: () => void;
  pauseVideo: () => void;
  setVolume: (volume: number) => void;
}

export function MusicEngine() {
  const [enabled] = useLocalStorage(KEYS.isLoFiEnabled, false);
  const [stationId] = useLocalStorage(KEYS.lofiStation, DEFAULT_STATION_ID);
  const [volume] = useLocalStorage(KEYS.lofiVolume, DEFAULT_LOFI_VOLUME);
  const [muted] = useLocalStorage(KEYS.lofiMuted, false);
  const [activeEmbed] = useLocalStorage<MusicEmbed | null>(KEYS.activeMusicEmbed, null);
  const playerRef = useRef<MinimalYTPlayer | null>(null);
  const station = RADIO_STATIONS.find((item) => item.id === stationId) ?? RADIO_STATIONS[0];

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
        <aside className="music-provider-player" aria-label={`${activeEmbed.provider} player`}>
          <iframe
            src={activeEmbed.embedUrl}
            title={`${activeEmbed.provider} music player`}
            sandbox="allow-scripts allow-same-origin allow-presentation"
            allow="autoplay; encrypted-media; picture-in-picture"
            loading="eager"
          />
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

  // YouTube / Google state
  const [googleToken, setGoogleToken] = useState<string | null>(null);
  const [youtubePlaylists, setYoutubePlaylists] = useState<YouTubePlaylistSummary[]>([]);
  const [loadingYouTube, setLoadingYouTube] = useState(false);
  const [youtubeStatus, setYoutubeStatus] = useState<string>("");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const token = getStoredSpotifyToken();
    setSpotifyToken(token);
    const user = window.localStorage.getItem(SPOTIFY_STORAGE_KEYS.userName) || "";
    setSpotifyUser(user);
    const savedClientId = window.localStorage.getItem(SPOTIFY_STORAGE_KEYS.clientId) || "";
    setCustomClientId(savedClientId);

    void getGoogleProviderToken().then((t) => setGoogleToken(t));
  }, []);

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
    setActiveEmbed(embed);
    setEnabled(false);
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

  const handleSelectYouTubePlaylist = (playlist: YouTubePlaylistSummary) => {
    const embed = youtubePlaylistToMusicEmbed(playlist);
    setSavedEmbeds((items) => items.some((item) => item.sourceUrl === embed.sourceUrl) ? items : [...items, embed]);
    setActiveEmbed(embed);
    setEnabled(false);
  };

  const saveProvider = (event: FormEvent) => {
    event.preventDefault();
    const parsed = parseMusicProviderUrl(url);
    if (!parsed) {
      setError("Use a valid HTTPS Spotify, Apple Music, YouTube, SoundCloud, or Amazon Music URL.");
      return;
    }
    setSavedEmbeds((items) => items.some((item) => item.sourceUrl === parsed.sourceUrl) ? items : [...items, parsed]);
    setActiveEmbed(parsed);
    setEnabled(false);
    setUrl("");
    setError("");
  };

  const selectStation = (id: string) => {
    setStationId(id);
    setActiveEmbed(null);
    setEnabled(true);
  };

  return (
    <div className="audio-panel music-panel music-shelf">
      <header className="music-shelf__header">
        <div>
          <h3>{activeEmbed ? activeEmbed.provider : station.name}</h3>
          <p className="music-shelf__now-playing">{activeEmbed ? "External provider" : station.genre}</p>
        </div>
        <span className="music-shelf__state">{activeEmbed ? "ON AIR / Provider" : enabled ? "ON AIR" : "Standby"}</span>
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
                  {googleToken ? (
                    <button
                      type="button"
                      className="music-account-card__action text-xs font-bold px-3 py-1.5 rounded-md bg-accent text-white hover:opacity-90 cursor-pointer disabled:opacity-50"
                      onClick={() => { void handleSyncYouTube(false); }}
                      disabled={loadingYouTube}
                    >
                      {loadingYouTube ? "Syncing…" : "Sync Playlists"}
                    </button>
                  ) : null}
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
              {youtubePlaylists.length > 0 && (
                <div className="music-playlist-list mt-2.5 flex flex-col gap-1.5 max-h-36 overflow-y-auto" aria-label="YouTube Music Playlists">
                  {youtubePlaylists.map((pl) => (
                    <button
                      key={pl.id}
                      type="button"
                      className="music-playlist-item flex items-center justify-between p-2 rounded-md border border-border-subtle bg-surface-primary/40 hover:bg-surface-hover text-left cursor-pointer transition-colors"
                      onClick={() => handleSelectYouTubePlaylist(pl)}
                    >
                      <span className="music-playlist-item__title text-xs text-foreground truncate max-w-[14rem]">{pl.title}</span>
                      <small className="music-playlist-item__meta text-[10px] text-text-muted font-mono shrink-0 ml-2">{pl.itemCount} tracks</small>
                    </button>
                  ))}
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
              <button type="button" onClick={() => { setActiveEmbed(item); setEnabled(false); }}><strong>{item.provider}</strong><small>{item.sourceUrl}</small></button>
              <button type="button" onClick={() => { setSavedEmbeds((items) => items.filter((saved) => saved.sourceUrl !== item.sourceUrl)); if (activeEmbed?.sourceUrl === item.sourceUrl) setActiveEmbed(null); }} aria-label={`Remove ${item.provider} link`}><TrashIcon /></button>
            </div>
          ))}
        </div>
      )}

    </div>
  );
}
