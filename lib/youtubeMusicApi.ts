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

export function parseIsoDuration(durationStr?: string): number {
  if (!durationStr || typeof durationStr !== "string") return 0;
  const match = durationStr.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;
  const hours = parseInt(match[1] || "0", 10);
  const minutes = parseInt(match[2] || "0", 10);
  const seconds = parseInt(match[3] || "0", 10);
  return hours * 3600 + minutes * 60 + seconds;
}

export function getYouTubeLikedMusicPlaylist(): YouTubePlaylistSummary {
  return {
    id: "LM",
    title: "Musik yang Disukai (Liked Music)",
    itemCount: 0,
    externalUrl: "https://music.youtube.com/playlist?list=LM",
    embedUrl: "https://www.youtube-nocookie.com/embed/videoseries?list=LM",
  };
}

export const DEFAULT_YOUTUBE_SONGS: YouTubeSongSummary[] = [
  {
    id: "lTRiuFIWV54",
    title: "Lofi Study Beats - Chillhop Radio",
    artist: "Lofi Girl",
    externalUrl: "https://music.youtube.com/watch?v=lTRiuFIWV54",
    embedUrl: "https://www.youtube-nocookie.com/embed/lTRiuFIWV54?autoplay=1&enablejsapi=1",
  },
  {
    id: "4xDzrJKXOOY",
    title: "Synthwave Coding - Chill Retrowave",
    artist: "Lofi Girl Synthwave",
    externalUrl: "https://music.youtube.com/watch?v=4xDzrJKXOOY",
    embedUrl: "https://www.youtube-nocookie.com/embed/4xDzrJKXOOY?autoplay=1&enablejsapi=1",
  },
  {
    id: "h2zkV-l_TbY",
    title: "Cozy Coffee Shop - Warm Jazz & Rain",
    artist: "Coffee Relax Music",
    externalUrl: "https://music.youtube.com/watch?v=h2zkV-l_TbY",
    embedUrl: "https://www.youtube-nocookie.com/embed/h2zkV-l_TbY?autoplay=1&enablejsapi=1",
  },
  {
    id: "WPni755-Krg",
    title: "Binaural Alpha Waves - Deep Focus",
    artist: "Focus Frequency Studio",
    externalUrl: "https://music.youtube.com/watch?v=WPni755-Krg",
    embedUrl: "https://www.youtube-nocookie.com/embed/WPni755-Krg?autoplay=1&enablejsapi=1",
  },
  {
    id: "mPZkdNFkNps",
    title: "Gentle Rain & Thunder - Nature Soundscape",
    artist: "Rain Sounds Sleep",
    externalUrl: "https://music.youtube.com/watch?v=mPZkdNFkNps",
    embedUrl: "https://www.youtube-nocookie.com/embed/mPZkdNFkNps?autoplay=1&enablejsapi=1",
  },
  {
    id: "xNN7iTA57jM",
    title: "Forest Stream & Birds - Calming Wildlife",
    artist: "Wild Earth Sounds",
    externalUrl: "https://music.youtube.com/watch?v=xNN7iTA57jM",
    embedUrl: "https://www.youtube-nocookie.com/embed/xNN7iTA57jM?autoplay=1&enablejsapi=1",
  },
  {
    id: "jfKfPfyJRdk",
    title: "Anime Chill Piano & Rain - Peaceful Beats",
    artist: "Lofi Girl Music",
    externalUrl: "https://music.youtube.com/watch?v=jfKfPfyJRdk",
    embedUrl: "https://www.youtube-nocookie.com/embed/jfKfPfyJRdk?autoplay=1&enablejsapi=1",
  },
  {
    id: "5qap5aO4i9A",
    title: "Lofi Hip Hop Radio - Beats to Sleep/Chill to",
    artist: "Lofi Girl",
    externalUrl: "https://music.youtube.com/watch?v=5qap5aO4i9A",
    embedUrl: "https://www.youtube-nocookie.com/embed/5qap5aO4i9A?autoplay=1&enablejsapi=1",
  },
];

export async function fetchGoogleYouTubeLikedVideos(accessToken: string, musicOnly = true): Promise<FetchYouTubeSongsResult> {
  // Step 1: Attempt to load the official YouTube Music "Liked Music" playlist (ID: LM)
  try {
    const lmUrl = new URL("https://www.googleapis.com/youtube/v3/playlistItems");
    lmUrl.searchParams.set("part", "snippet");
    lmUrl.searchParams.set("playlistId", "LM");
    lmUrl.searchParams.set("maxResults", "50");

    const lmRes = await fetch(lmUrl.toString(), {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
      },
    });

    if (lmRes.ok) {
      const lmData = await lmRes.json();
      const lmItems = Array.isArray(lmData.items) ? lmData.items : [];
      if (lmItems.length > 0) {
        const songs: YouTubeSongSummary[] = lmItems
          .filter((item: Record<string, unknown>) => {
            const snippet = item?.snippet as Record<string, unknown> | undefined;
            const resourceId = snippet?.resourceId as Record<string, unknown> | undefined;
            return typeof resourceId?.videoId === "string";
          })
          .map((item: {
            snippet?: {
              title?: string;
              videoOwnerChannelTitle?: string;
              channelTitle?: string;
              resourceId?: { videoId?: string };
              thumbnails?: { medium?: { url?: string }; default?: { url?: string } };
            };
          }) => {
            const id = item.snippet?.resourceId?.videoId || "";
            const title = decodeHtmlEntities(item.snippet?.title || "Untitled track");
            const artist = decodeHtmlEntities(item.snippet?.videoOwnerChannelTitle || item.snippet?.channelTitle || "");
            const thumbnailUrl = item.snippet?.thumbnails?.medium?.url || item.snippet?.thumbnails?.default?.url;
            return {
              id,
              title,
              artist,
              thumbnailUrl,
              externalUrl: `https://music.youtube.com/watch?v=${id}`,
              embedUrl: `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&enablejsapi=1`,
            };
          });

        return { songs };
      }
    }
  } catch {}

  // Step 2: Fallback to videos.list(myRating=like) with strict Music category filtering
  try {
    const url = new URL("https://www.googleapis.com/youtube/v3/videos");
    url.searchParams.set("part", "snippet,contentDetails,topicDetails");
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
      .filter((item: Record<string, unknown>) => {
        if (!item || typeof item.id !== "string") return false;
        if (!musicOnly) return true;

        const contentDetails = item.contentDetails as Record<string, unknown> | undefined;
        if (typeof contentDetails?.duration === "string") {
          const durationSec = parseIsoDuration(contentDetails.duration);
          if (durationSec > 0 && durationSec < 30) return false;
        }

        const snippet = item.snippet as Record<string, unknown> | undefined;
        const topicDetails = item.topicDetails as Record<string, unknown> | undefined;
        const categoryId = snippet?.categoryId;
        const channelTitle = typeof snippet?.channelTitle === "string" ? snippet.channelTitle : "";
        const topicCategories = Array.isArray(topicDetails?.topicCategories) ? (topicDetails.topicCategories as string[]) : [];

        // Category 10 = Music on YouTube
        const isMusicCategory = categoryId === "10";
        const hasMusicTopic = topicCategories.some((cat) => typeof cat === "string" && cat.toLowerCase().includes("music"));
        const isTopicChannel = channelTitle.endsWith(" - Topic") || channelTitle.toLowerCase().includes("records") || channelTitle.toLowerCase().includes("vevo");

        return isMusicCategory || hasMusicTopic || isTopicChannel;
      })
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
        const title = decodeHtmlEntities(item.snippet?.title || "Untitled song");
        const artist = decodeHtmlEntities(item.snippet?.channelTitle || "");
        const thumbnailUrl = item.snippet?.thumbnails?.medium?.url || item.snippet?.thumbnails?.default?.url;
        const externalUrl = `https://music.youtube.com/watch?v=${id}`;
        const embedUrl = `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&enablejsapi=1`;

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
        const title = decodeHtmlEntities(item.snippet?.title || "Untitled track");
        const artist = decodeHtmlEntities(item.snippet?.videoOwnerChannelTitle || item.snippet?.channelTitle || "");
        const thumbnailUrl = item.snippet?.thumbnails?.medium?.url || item.snippet?.thumbnails?.default?.url;
        const externalUrl = `https://music.youtube.com/watch?v=${id}`;
        const embedUrl = `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&enablejsapi=1`;

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

export function decodeHtmlEntities(text: string): string {
  if (!text) return "";
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)));
}

export interface SearchYouTubeSongsResult {
  songs: YouTubeSongSummary[];
  error?: "EXPIRED_TOKEN" | "INSUFFICIENT_SCOPE" | "API_DISABLED" | "FETCH_ERROR";
  errorMessage?: string;
}

export async function searchGoogleYouTubeMusic(
  query: string,
  accessToken: string
): Promise<SearchYouTubeSongsResult> {
  const trimmed = query.trim();
  if (!trimmed) {
    return { songs: [] };
  }

  try {
    const url = new URL("https://www.googleapis.com/youtube/v3/search");
    url.searchParams.set("part", "snippet");
    url.searchParams.set("q", trimmed);
    url.searchParams.set("type", "video");
    url.searchParams.set("videoCategoryId", "10"); // Music Category on YouTube
    url.searchParams.set("maxResults", "25");

    const res = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
      },
    });

    if (!res.ok) {
      const errorJson = await res.json().catch(() => null);
      const rawMessage =
        errorJson &&
        typeof errorJson === "object" &&
        "error" in errorJson &&
        typeof (errorJson as Record<string, unknown>).error === "object" &&
        (errorJson.error as Record<string, unknown>)?.message
          ? String((errorJson.error as Record<string, unknown>).message)
          : res.statusText;

      let errorType: SearchYouTubeSongsResult["error"] = "FETCH_ERROR";
      if (res.status === 401) {
        errorType = "EXPIRED_TOKEN";
      } else if (
        rawMessage.toLowerCase().includes("not enabled") ||
        rawMessage.toLowerCase().includes("has not been used")
      ) {
        errorType = "API_DISABLED";
      } else if (
        res.status === 403 ||
        rawMessage.toLowerCase().includes("insufficient") ||
        rawMessage.toLowerCase().includes("permission")
      ) {
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
      .filter((item: Record<string, unknown>) => {
        const idObj = item?.id as Record<string, unknown> | undefined;
        return typeof idObj?.videoId === "string" && idObj.videoId.length > 0;
      })
      .map((item: {
        id?: { videoId?: string };
        snippet?: {
          title?: string;
          channelTitle?: string;
          thumbnails?: {
            medium?: { url?: string };
            default?: { url?: string };
          };
        };
      }) => {
        const id = item.id?.videoId || "";
        const title = decodeHtmlEntities(item.snippet?.title || "Untitled song");
        const artist = decodeHtmlEntities(item.snippet?.channelTitle || "");
        const thumbnailUrl =
          item.snippet?.thumbnails?.medium?.url || item.snippet?.thumbnails?.default?.url;

        return {
          id,
          title,
          artist,
          thumbnailUrl,
          externalUrl: `https://music.youtube.com/watch?v=${id}`,
          embedUrl: `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&enablejsapi=1`,
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
