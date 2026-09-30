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

export function youtubePlaylistToMusicEmbed(playlist: YouTubePlaylistSummary): MusicEmbed {
  return {
    provider: "youtube",
    sourceUrl: playlist.externalUrl,
    embedUrl: playlist.embedUrl,
  };
}
