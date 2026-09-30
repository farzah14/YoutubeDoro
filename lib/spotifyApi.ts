import type { MusicEmbed } from "./musicProviders";

export interface SpotifyPlaylistSummary {
  id: string;
  name: string;
  totalTracks: number;
  imageUrl?: string;
  externalUrl: string;
  embedUrl: string;
}

export interface SpotifyTokenData {
  accessToken: string;
  refreshToken?: string;
  expiresAt: number;
}

export const SPOTIFY_STORAGE_KEYS = {
  token: "ytdoro:spotify:token",
  verifier: "ytdoro:spotify:verifier",
  clientId: "ytdoro:spotify:client_id",
  userName: "ytdoro:spotify:user_name",
};

export const SPOTIFY_SCOPES = [
  "playlist-read-private",
  "playlist-read-collaborative",
  "user-read-private",
].join(" ");

function generateRandomString(length: number): string {
  const possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~";
  const values = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(values).map((x) => possible[x % possible.length]).join("");
}

async function sha256(plain: string): Promise<ArrayBuffer> {
  const encoder = new TextEncoder();
  const data = encoder.encode(plain);
  return crypto.subtle.digest("SHA-256", data);
}

function base64urlEncode(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

export async function createSpotifyAuthUrl(clientId: string, redirectUri: string): Promise<string> {
  const verifier = generateRandomString(64);
  const challengeBuffer = await sha256(verifier);
  const challenge = base64urlEncode(challengeBuffer);

  if (typeof window !== "undefined") {
    window.localStorage.setItem(SPOTIFY_STORAGE_KEYS.verifier, verifier);
    window.localStorage.setItem(SPOTIFY_STORAGE_KEYS.clientId, clientId);
  }

  const params = new URLSearchParams({
    client_id: clientId,
    response_type: "code",
    redirect_uri: redirectUri,
    code_challenge_method: "S256",
    code_challenge: challenge,
    scope: SPOTIFY_SCOPES,
  });

  return `https://accounts.spotify.com/authorize?${params.toString()}`;
}

export async function exchangeSpotifyCode(
  code: string,
  redirectUri: string,
  clientId?: string
): Promise<SpotifyTokenData | null> {
  if (typeof window === "undefined") return null;

  const verifier = window.localStorage.getItem(SPOTIFY_STORAGE_KEYS.verifier) ?? "";
  const resolvedClientId = clientId || window.localStorage.getItem(SPOTIFY_STORAGE_KEYS.clientId) || process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID || "";

  if (!verifier || !resolvedClientId) return null;

  const body = new URLSearchParams({
    client_id: resolvedClientId,
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri,
    code_verifier: verifier,
  });

  try {
    const response = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    });

    if (!response.ok) return null;

    const data = await response.json();
    const tokenData: SpotifyTokenData = {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: Date.now() + (data.expires_in ?? 3600) * 1000,
    };

    window.localStorage.setItem(SPOTIFY_STORAGE_KEYS.token, JSON.stringify(tokenData));
    window.localStorage.removeItem(SPOTIFY_STORAGE_KEYS.verifier);

    return tokenData;
  } catch {
    return null;
  }
}

export function getStoredSpotifyToken(): SpotifyTokenData | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(SPOTIFY_STORAGE_KEYS.token);
    if (!raw) return null;
    const data: SpotifyTokenData = JSON.parse(raw);
    if (!data.accessToken || data.expiresAt <= Date.now()) {
      return null;
    }
    return data;
  } catch {
    return null;
  }
}

export function disconnectSpotify(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(SPOTIFY_STORAGE_KEYS.token);
  window.localStorage.removeItem(SPOTIFY_STORAGE_KEYS.verifier);
  window.localStorage.removeItem(SPOTIFY_STORAGE_KEYS.userName);
}

export async function fetchSpotifyUserProfile(accessToken: string): Promise<string | null> {
  try {
    const res = await fetch("https://api.spotify.com/v1/me", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) return null;
    const data = await res.json();
    const name = data.display_name || data.id || "Spotify User";
    if (typeof window !== "undefined") {
      window.localStorage.setItem(SPOTIFY_STORAGE_KEYS.userName, name);
    }
    return name;
  } catch {
    return null;
  }
}

export async function fetchSpotifyPlaylists(accessToken: string): Promise<SpotifyPlaylistSummary[]> {
  try {
    const res = await fetch("https://api.spotify.com/v1/me/playlists?limit=50", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) return [];
    const data = await res.json();
    const items = Array.isArray(data.items) ? data.items : [];

    return items
      .filter((item: Record<string, unknown>) => item && typeof item.id === "string")
      .map((item: {
        id: string;
        name: string;
        tracks?: { total: number };
        images?: Array<{ url: string }>;
        external_urls?: { spotify?: string };
      }) => {
        const externalUrl = item.external_urls?.spotify || `https://open.spotify.com/playlist/${item.id}`;
        return {
          id: item.id,
          name: item.name || "Untitled playlist",
          totalTracks: item.tracks?.total ?? 0,
          imageUrl: item.images?.[0]?.url,
          externalUrl,
          embedUrl: `https://open.spotify.com/embed/playlist/${item.id}`,
        };
      });
  } catch {
    return [];
  }
}

export function playlistToMusicEmbed(playlist: SpotifyPlaylistSummary): MusicEmbed {
  return {
    provider: "spotify",
    sourceUrl: playlist.externalUrl,
    embedUrl: playlist.embedUrl,
  };
}
