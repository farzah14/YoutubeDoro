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

export async function fetchGoogleYouTubePlaylists(accessToken: string): Promise<YouTubePlaylistSummary[]> {
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

    if (!res.ok) return [];

    const data = await res.json();
    const items = Array.isArray(data.items) ? data.items : [];

    return items
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
  } catch {
    return [];
  }
}

export function youtubePlaylistToMusicEmbed(playlist: YouTubePlaylistSummary): MusicEmbed {
  return {
    provider: "youtube",
    sourceUrl: playlist.externalUrl,
    embedUrl: playlist.embedUrl,
  };
}
