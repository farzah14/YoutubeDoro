import assert from "node:assert/strict";
import test from "node:test";
import {
  youtubePlaylistToMusicEmbed,
  youtubeSongToMusicEmbed,
  type YouTubePlaylistSummary,
  type YouTubeSongSummary,
} from "../lib/youtubeMusicApi.ts";

test("youtubeSongToMusicEmbed converts a YouTube song summary into a valid MusicEmbed", () => {
  const song: YouTubeSongSummary = {
    id: "jfKfPfyJRdk",
    title: "lofi hip hop radio - beats to relax/study to",
    artist: "Lofi Girl",
    externalUrl: "https://music.youtube.com/watch?v=jfKfPfyJRdk",
    embedUrl: "https://www.youtube-nocookie.com/embed/jfKfPfyJRdk",
  };

  const embed = youtubeSongToMusicEmbed(song);
  assert.equal(embed.provider, "youtube");
  assert.equal(embed.sourceUrl, song.externalUrl);
  assert.equal(embed.embedUrl, song.embedUrl);
});

test("youtubePlaylistToMusicEmbed converts a playlist into videoseries embed", () => {
  const playlist: YouTubePlaylistSummary = {
    id: "PL4fGSI1pDJn6jXS_PEO3268YbebiYsUce",
    title: "Study Chill",
    itemCount: 15,
    externalUrl: "https://music.youtube.com/playlist?list=PL4fGSI1pDJn6jXS_PEO3268YbebiYsUce",
    embedUrl: "https://www.youtube-nocookie.com/embed/videoseries?list=PL4fGSI1pDJn6jXS_PEO3268YbebiYsUce",
  };

  const embed = youtubePlaylistToMusicEmbed(playlist);
  assert.equal(embed.provider, "youtube");
  assert.equal(embed.sourceUrl, playlist.externalUrl);
  assert.equal(embed.embedUrl, playlist.embedUrl);
});
