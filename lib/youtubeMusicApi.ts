import type { MusicEmbed } from "./musicProviders";
import { getSupabaseBrowserClient } from "./supabase/client";

export interface YouTubePlaylistSummary {
  id: string;
  title: string;
  itemCount: number;
  thumbnailUrl?: string;
  externalUrl: string;
  embedUrl: string;
}

export const YOUTUBE_SCOPES = "https://www.googleapis.com/auth/youtube.readonly";

export async function requestGoogleYouTubeAccess(returnPath = "/"): Promise<void> {
  const supabase = getSupabaseBrowserClient();
  if (!supabase || typeof window === "undefined") return;

  const callback = new URL("/auth/callback", window.location.origin);
  callback.searchParams.set("next", returnPath);

  await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      scopes: YOUTUBE_SCOPES,
      redirectTo: callback.toString(),
      queryParams: {
        access_type: "offline",
        prompt: "consent",
      },
    },
  });
}

export async function getGoogleProviderToken(): Promise<string | null> {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) return null;

  try {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.provider_token ?? null;
  } catch {
    return null;
  }
}

export interface FetchYouTubePlaylistsResult {
  playlists: YouTubePlaylistSummary[];
  error?: "EXPIRED_TOKEN" | "INSUFFICIENT_SCOPE" | "API_DISABLED" | "FETCH_ERROR";
  errorMessage?: string;
}

export async function fetchGoogleYouTubePlaylistsResult(accessToken: string): Promise<FetchYouTubePlaylistsResult> {
  try {
    const url = new URL("https://www.googleapis.com/youtube/v3/playlists");
    url.searchParams.set("part", "snippet,contentDetails");
    url.searchParams.set("mine", "true");
    url.searchParams.set("maxResults", "50");

    const res = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
      },
    });

    if (!res.ok) {
      const errorJson = await res.json().catch(() => null);
      const rawMessage = (errorJson && typeof errorJson === "object" && "error" in errorJson && typeof (errorJson as Record<string, unknown>).error === "object" && (errorJson.error as Record<string, unknown>)?.message) ? String((errorJson.error as Record<string, unknown>).message) : res.statusText;
      let errorType: FetchYouTubePlaylistsResult["error"] = "FETCH_ERROR";

      if (res.status === 401) {
        errorType = "EXPIRED_TOKEN";
      } else if (rawMessage.toLowerCase().includes("not enabled") || rawMessage.toLowerCase().includes("has not been used")) {
        errorType = "API_DISABLED";
      } else if (res.status === 403 || rawMessage.toLowerCase().includes("insufficient") || rawMessage.toLowerCase().includes("permission")) {
        errorType = "INSUFFICIENT_SCOPE";
      }

      return {
        playlists: [],
        error: errorType,
        errorMessage: rawMessage,
      };
    }

    const data = await res.json();
    const items = Array.isArray(data.items) ? data.items : [];

    const playlists: YouTubePlaylistSummary[] = items
      .filter((item: Record<string, unknown>) => item && typeof item.id === "string")
      .map((item: {
        id: string;
        snippet?: {
          title?: string;
          thumbnails?: {
            medium?: { url?: string };
            default?: { url?: string };
          };
        };
        contentDetails?: {
          itemCount?: number;
        };
      }) => {
        const id = item.id;
        const title = item.snippet?.title || "Untitled playlist";
        const itemCount = item.contentDetails?.itemCount ?? 0;
        const thumbnailUrl = item.snippet?.thumbnails?.medium?.url || item.snippet?.thumbnails?.default?.url;
        const externalUrl = `https://music.youtube.com/playlist?list=${id}`;
        const embedUrl = `https://www.youtube-nocookie.com/embed/videoseries?list=${id}`;

        return {
          id,
          title,
          itemCount,
          thumbnailUrl,
          externalUrl,
          embedUrl,
        };
      });

    return { playlists };
  } catch (err) {
    return {
      playlists: [],
      error: "FETCH_ERROR",
      errorMessage: err instanceof Error ? err.message : "Network error contacting YouTube API",
    };
  }
}

export async function fetchGoogleYouTubePlaylists(accessToken: string): Promise<YouTubePlaylistSummary[]> {
  const result = await fetchGoogleYouTubePlaylistsResult(accessToken);
  return result.playlists;
}

export interface YouTubeSongSummary {
  id: string;
  title: string;
  artist?: string;
  thumbnailUrl?: string;
  externalUrl: string;
  embedUrl: string;
}

export function youtubePlaylistToMusicEmbed(playlist: YouTubePlaylistSummary): MusicEmbed {
  return {
    provider: "youtube",
    sourceUrl: playlist.externalUrl,
    embedUrl: playlist.embedUrl,
  };
}

export function youtubeSongToMusicEmbed(song: YouTubeSongSummary): MusicEmbed {
  return {
    provider: "youtube",
    sourceUrl: song.externalUrl,
    embedUrl: song.embedUrl,
  };
}

export interface FetchYouTubeSongsResult {
  songs: YouTubeSongSummary[];
  error?: "EXPIRED_TOKEN" | "INSUFFICIENT_SCOPE" | "API_DISABLED" | "FETCH_ERROR";
  errorMessage?: string;
}

export async function fetchGoogleYouTubeLikedVideos(accessToken: string): Promise<FetchYouTubeSongsResult> {
  try {
    const url = new URL("https://www.googleapis.com/youtube/v3/videos");
    url.searchParams.set("part", "snippet,contentDetails");
    url.searchParams.set("myRating", "like");
    url.searchParams.set("maxResults", "50");

    const res = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
      },
    });

    if (!res.ok) {
      const errorJson = await res.json().catch(() => null);
      const rawMessage = (errorJson && typeof errorJson === "object" && "error" in errorJson && typeof (errorJson as Record<string, unknown>).error === "object" && (errorJson.error as Record<string, unknown>)?.message) ? String((errorJson.error as Record<string, unknown>).message) : res.statusText;
      let errorType: FetchYouTubeSongsResult["error"] = "FETCH_ERROR";

      if (res.status === 401) {
        errorType = "EXPIRED_TOKEN";
      } else if (rawMessage.toLowerCase().includes("not enabled") || rawMessage.toLowerCase().includes("has not been used")) {
        errorType = "API_DISABLED";
      } else if (res.status === 403 || rawMessage.toLowerCase().includes("insufficient") || rawMessage.toLowerCase().includes("permission")) {
        errorType = "INSUFFICIENT_SCOPE";
      }

      return {
        songs: [],
        error: errorType,
        errorMessage: rawMessage,
      };
    }

    const data = await res.json();
    const items = Array.isArray(data.items) ? data.items : [];

    const songs: YouTubeSongSummary[] = items
      .filter((item: Record<string, unknown>) => item && typeof item.id === "string")
      .map((item: {
        id: string;
        snippet?: {
          title?: string;
          channelTitle?: string;
          thumbnails?: {
            medium?: { url?: string };
            default?: { url?: string };
          };
        };
      }) => {
        const id = item.id;
        const title = item.snippet?.title || "Untitled song";
        const artist = item.snippet?.channelTitle || "";
        const thumbnailUrl = item.snippet?.thumbnails?.medium?.url || item.snippet?.thumbnails?.default?.url;
        const externalUrl = `https://music.youtube.com/watch?v=${id}`;
        const embedUrl = `https://www.youtube-nocookie.com/embed/${id}`;

        return {
          id,
          title,
          artist,
          thumbnailUrl,
          externalUrl,
          embedUrl,
        };
      });

    return { songs };
  } catch (err) {
    return {
      songs: [],
      error: "FETCH_ERROR",
      errorMessage: err instanceof Error ? err.message : "Network error contacting YouTube API",
    };
  }
}

export async function fetchGoogleYouTubePlaylistItems(accessToken: string, playlistId: string): Promise<YouTubeSongSummary[]> {
  try {
    const url = new URL("https://www.googleapis.com/youtube/v3/playlistItems");
    url.searchParams.set("part", "snippet");
    url.searchParams.set("playlistId", playlistId);
    url.searchParams.set("maxResults", "50");

    const res = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
      },
    });

    if (!res.ok) return [];

    const data = await res.json();
    const items = Array.isArray(data.items) ? data.items : [];

    return items
      .filter((item: Record<string, unknown>) => {
        if (!item || typeof item !== "object") return false;
        const snippet = item.snippet as Record<string, unknown> | undefined;
        const resourceId = snippet?.resourceId as Record<string, unknown> | undefined;
        const videoId = resourceId?.videoId;
        const title = snippet?.title;
        return typeof videoId === "string" && typeof title === "string" && title !== "Private video" && title !== "Deleted video";
      })
      .map((item: {
        snippet?: {
          title?: string;
          videoOwnerChannelTitle?: string;
          channelTitle?: string;
          resourceId?: { videoId?: string };
          thumbnails?: {
            medium?: { url?: string };
            default?: { url?: string };
          };
        };
      }) => {
        const id = item.snippet?.resourceId?.videoId || "";
        const title = item.snippet?.title || "Untitled track";
        const artist = item.snippet?.videoOwnerChannelTitle || item.snippet?.channelTitle || "";
        const thumbnailUrl = item.snippet?.thumbnails?.medium?.url || item.snippet?.thumbnails?.default?.url;
        const externalUrl = `https://music.youtube.com/watch?v=${id}`;
        const embedUrl = `https://www.youtube-nocookie.com/embed/${id}`;

        return {
          id,
          title,
          artist,
          thumbnailUrl,
          externalUrl,
          embedUrl,
        };
      });
  } catch {
    return [];
  }
}
