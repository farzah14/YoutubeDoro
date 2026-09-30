import assert from "node:assert/strict";
import test from "node:test";
import {
  createSpotifyAuthUrl,
  disconnectSpotify,
  getStoredSpotifyToken,
  playlistToMusicEmbed,
  SPOTIFY_SCOPES,
  SPOTIFY_STORAGE_KEYS,
  type SpotifyPlaylistSummary,
} from "../lib/spotifyApi.ts";
import {
  youtubePlaylistToMusicEmbed,
  type YouTubePlaylistSummary,
  YOUTUBE_SCOPES,
} from "../lib/youtubeMusicApi.ts";

test("createSpotifyAuthUrl generates a valid Spotify authorize URL with PKCE params", async () => {
  const clientId = "mock-spotify-client-id";
  const redirectUri = "https://study-rythms.vercel.app/auth/spotify-callback";
  const url = await createSpotifyAuthUrl(clientId, redirectUri);

  const parsed = new URL(url);
  assert.equal(parsed.origin, "https://accounts.spotify.com");
  assert.equal(parsed.pathname, "/authorize");
  assert.equal(parsed.searchParams.get("client_id"), clientId);
  assert.equal(parsed.searchParams.get("response_type"), "code");
  assert.equal(parsed.searchParams.get("redirect_uri"), redirectUri);
  assert.equal(parsed.searchParams.get("code_challenge_method"), "S256");
  assert.equal(typeof parsed.searchParams.get("code_challenge"), "string");
  assert.equal(parsed.searchParams.get("scope"), SPOTIFY_SCOPES);
});

test("playlistToMusicEmbed converts a Spotify playlist summary into a valid MusicEmbed", () => {
  const summary: SpotifyPlaylistSummary = {
    id: "37i9dQZF1DX8Uebhn9wzrS",
    name: "Chill Lofi Study Beats",
    totalTracks: 120,
    externalUrl: "https://open.spotify.com/playlist/37i9dQZF1DX8Uebhn9wzrS",
    embedUrl: "https://open.spotify.com/embed/playlist/37i9dQZF1DX8Uebhn9wzrS",
  };

  const embed = playlistToMusicEmbed(summary);
  assert.equal(embed.provider, "spotify");
  assert.equal(embed.sourceUrl, summary.externalUrl);
  assert.equal(embed.embedUrl, summary.embedUrl);
});

test("youtubePlaylistToMusicEmbed converts a YouTube playlist summary into a valid MusicEmbed", () => {
  const summary: YouTubePlaylistSummary = {
    id: "PL4fGSI1pDJn6jXS_PEO3268YbebiYsUce",
    title: "Lofi Hip Hop Radio",
    itemCount: 45,
    externalUrl: "https://music.youtube.com/playlist?list=PL4fGSI1pDJn6jXS_PEO3268YbebiYsUce",
    embedUrl: "https://www.youtube-nocookie.com/embed/videoseries?list=PL4fGSI1pDJn6jXS_PEO3268YbebiYsUce",
  };

  const embed = youtubePlaylistToMusicEmbed(summary);
  assert.equal(embed.provider, "youtube");
  assert.equal(embed.sourceUrl, summary.externalUrl);
  assert.equal(embed.embedUrl, summary.embedUrl);
  assert.equal(YOUTUBE_SCOPES, "https://www.googleapis.com/auth/youtube.readonly");
});

test("disconnectSpotify safely clears stored tokens without throwing in non-browser environments", () => {
  assert.doesNotThrow(() => {
    disconnectSpotify();
    assert.equal(getStoredSpotifyToken(), null);
  });
});
