import assert from "node:assert/strict";
import test from "node:test";
import { parseMusicProviderUrl } from "../lib/musicProviders.ts";

test("parses allowlisted music providers into safe embed URLs", () => {
  const cases = [
    ["https://open.spotify.com/playlist/37i9dQZF1DX8Uebhn9wzrS", "spotify", "open.spotify.com/embed/playlist/"],
    ["https://music.apple.com/us/album/focus/1697473056", "apple-music", "embed.music.apple.com/us/album/"],
    ["https://www.youtube.com/watch?v=jfKfPfyJRdk", "youtube", "youtube-nocookie.com/embed/jfKfPfyJRdk"],
    ["https://soundcloud.com/lofi_girl/lofi-hiphop-radio", "soundcloud", "w.soundcloud.com/player/"],
    ["https://music.amazon.com/playlists/B0D1234567", "amazon-music", "music.amazon.com/embed/playlists/B0D1234567"],
  ] as const;

  for (const [input, provider, embedPart] of cases) {
    const parsed = parseMusicProviderUrl(input);
    assert.equal(parsed?.provider, provider);
    assert.match(parsed?.embedUrl ?? "", new RegExp(embedPart.replaceAll(".", "\\.")));
  }
});

test("rejects unsafe, unknown, and malformed provider links", () => {
  for (const input of [
    "javascript:alert(1)",
    "http://open.spotify.com/playlist/37i9dQZF1DX8Uebhn9wzrS",
    "https://evil.example/playlist/37i9dQZF1DX8Uebhn9wzrS",
    "https://user:pass@open.spotify.com/playlist/37i9dQZF1DX8Uebhn9wzrS",
    "https://www.youtube.com/watch?v=<script>",
    "https://open.spotify.com/playlist/../../evil",
    "not a url",
  ]) assert.equal(parseMusicProviderUrl(input), null, input);
});
