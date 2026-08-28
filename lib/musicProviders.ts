export type MusicProvider = "spotify" | "apple-music" | "youtube" | "soundcloud" | "amazon-music";

export interface MusicEmbed {
  provider: MusicProvider;
  sourceUrl: string;
  embedUrl: string;
}

const cleanId = (value: string | null, pattern: RegExp) => value && pattern.test(value) ? value : null;

export function parseMusicProviderUrl(input: string): MusicEmbed | null {
  let url: URL;
  try {
    url = new URL(input.trim());
  } catch {
    return null;
  }
  if (url.protocol !== "https:" || url.username || url.password) return null;

  if (url.hostname === "open.spotify.com") {
    const [, type, candidate] = url.pathname.split("/");
    const id = cleanId(candidate, /^[A-Za-z0-9]{10,64}$/);
    if (!id || !["playlist", "album", "track", "artist"].includes(type)) return null;
    return { provider: "spotify", sourceUrl: url.href, embedUrl: `https://open.spotify.com/embed/${type}/${id}` };
  }

  if (url.hostname === "music.apple.com") {
    if (!/^\/[a-z]{2}\/(album|playlist)\/[A-Za-z0-9._~-]+\/[A-Za-z0-9.-]+$/.test(url.pathname)) return null;
    return { provider: "apple-music", sourceUrl: url.href, embedUrl: `https://embed.music.apple.com${url.pathname}${url.search}` };
  }

  if (["www.youtube.com", "youtube.com", "music.youtube.com", "youtu.be"].includes(url.hostname)) {
    const candidate = url.hostname === "youtu.be" ? url.pathname.slice(1) : url.searchParams.get("v");
    const id = cleanId(candidate, /^[A-Za-z0-9_-]{11}$/);
    if (!id) return null;
    return { provider: "youtube", sourceUrl: url.href, embedUrl: `https://www.youtube-nocookie.com/embed/${id}` };
  }

  if (url.hostname === "soundcloud.com" && /^\/[A-Za-z0-9_-]+\/[A-Za-z0-9_-]+\/?$/.test(url.pathname)) {
    return {
      provider: "soundcloud",
      sourceUrl: url.href,
      embedUrl: `https://w.soundcloud.com/player/?url=${encodeURIComponent(url.href)}`,
    };
  }

  if (url.hostname === "music.amazon.com") {
    const [, type, candidate] = url.pathname.split("/");
    const id = cleanId(candidate, /^[A-Za-z0-9]{8,32}$/);
    if (!id || !["albums", "playlists", "tracks"].includes(type)) return null;
    return { provider: "amazon-music", sourceUrl: url.href, embedUrl: `https://music.amazon.com/embed/${type}/${id}` };
  }

  return null;
}
