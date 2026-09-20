import type { BreakMediaDescriptor, SavedBreakMedia } from "../types/index.ts";
import { extractYouTubeVideoId } from "./youtube.ts";

const YOUTUBE_ID = /^[a-zA-Z0-9_-]{11}$/;
const VIMEO_ID = /^\d+$/;
const DIRECT_VIDEO = /\.(mp4|webm)$/i;

export function parseBreakMediaInput(input: string): BreakMediaDescriptor | null {
  const raw = input.trim();
  if (!raw || raw.includes("<") || raw.includes(">")) return null;

  if (YOUTUBE_ID.test(raw)) {
    return {
      provider: "youtube",
      mediaId: raw,
      sourceUrl: `https://www.youtube.com/watch?v=${raw}`,
    };
  }

  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }
  if (url.protocol !== "https:") return null;

  const youtubeHosts = new Set([
    "youtube.com",
    "www.youtube.com",
    "m.youtube.com",
    "music.youtube.com",
    "youtu.be",
    "www.youtu.be",
  ]);
  if (youtubeHosts.has(url.hostname)) {
    const youtubeId = extractYouTubeVideoId(url.href);
    if (!youtubeId || !YOUTUBE_ID.test(youtubeId)) return null;
    return {
      provider: "youtube",
      mediaId: youtubeId,
      sourceUrl: `https://www.youtube.com/watch?v=${youtubeId}`,
    };
  }

  if (url.hostname === "vimeo.com" || url.hostname === "www.vimeo.com" || url.hostname === "player.vimeo.com") {
    const parts = url.pathname.split("/").filter(Boolean);
    const candidate = url.hostname === "player.vimeo.com" && parts[0] === "video" ? parts[1] : parts[0];
    if (!candidate || !VIMEO_ID.test(candidate)) return null;
    return {
      provider: "vimeo",
      mediaId: candidate,
      sourceUrl: `https://vimeo.com/${candidate}`,
    };
  }

  if (DIRECT_VIDEO.test(url.pathname)) {
    return { provider: "file", sourceUrl: url.href };
  }

  return null;
}

function text(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export function migrateSavedBreakMedia(value: unknown): SavedBreakMedia[] {
  if (!Array.isArray(value)) return [];
  const output: SavedBreakMedia[] = [];

  for (const candidate of value) {
    if (!candidate || typeof candidate !== "object") continue;
    const item = candidate as Record<string, unknown>;
    const id = text(item.id);
    const title = text(item.title);
    const addedAt = typeof item.addedAt === "number" && Number.isFinite(item.addedAt) ? item.addedAt : 0;
    const legacyVideoId = text(item.videoId);
    const parsed = legacyVideoId
      ? parseBreakMediaInput(legacyVideoId)
      : parseBreakMediaInput(text(item.sourceUrl) ?? "");
    if (!id || !title || !parsed) continue;
    output.push({ id, title, addedAt, ...parsed });
  }

  return output;
}
