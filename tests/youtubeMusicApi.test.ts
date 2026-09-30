import assert from "node:assert/strict";
import test from "node:test";
import {
  DEFAULT_YOUTUBE_SONGS,
  decodeHtmlEntities,
  getYouTubeLikedMusicPlaylist,
  parseIsoDuration,
  youtubePlaylistToMusicEmbed,
  youtubeSongToMusicEmbed,
  type YouTubePlaylistSummary,
  type YouTubeSongSummary,
} from "../lib/youtubeMusicApi.ts";

test("getYouTubeLikedMusicPlaylist returns official YouTube Music Liked Music LM playlist", () => {
  const lm = getYouTubeLikedMusicPlaylist();
  assert.equal(lm.id, "LM");
  assert.match(lm.title, /Musik yang Disukai/);
  assert.equal(lm.externalUrl, "https://music.youtube.com/playlist?list=LM");
  assert.equal(lm.embedUrl, "https://www.youtube-nocookie.com/embed/videoseries?list=LM");

  const embed = youtubePlaylistToMusicEmbed(lm);
  assert.equal(embed.provider, "youtube");
  assert.equal(embed.sourceUrl, "https://music.youtube.com/playlist?list=LM");
  assert.equal(embed.embedUrl, "https://www.youtube-nocookie.com/embed/videoseries?list=LM");
});

test("youtubeSongToMusicEmbed converts a YouTube song summary into a valid MusicEmbed", () => {
  const song: YouTubeSongSummary = {
    id: "jfKfPfyJRdk",
    title: "lofi hip hop radio - beats to relax/study to",
    artist: "Lofi Girl",
    externalUrl: "https://music.youtube.com/watch?v=jfKfPfyJRdk",
    embedUrl: "https://www.youtube-nocookie.com/embed/jfKfPfyJRdk?autoplay=1&enablejsapi=1",
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

test("decodeHtmlEntities correctly decodes entities in song titles and artists", () => {
  assert.equal(decodeHtmlEntities("Tom &amp; Jerry"), "Tom & Jerry");
  assert.equal(decodeHtmlEntities("Don&#39;t Stop"), "Don't Stop");
  assert.equal(decodeHtmlEntities("&quot;Hello&quot;"), '"Hello"');
  assert.equal(decodeHtmlEntities("Rock &lt;Pop&gt;"), "Rock <Pop>");
});

test("DEFAULT_YOUTUBE_SONGS provides fallback YouTube tracks with valid ids and embed URLs", () => {
  assert.ok(DEFAULT_YOUTUBE_SONGS.length >= 5);
  for (const song of DEFAULT_YOUTUBE_SONGS) {
    assert.ok(song.id.length > 0);
    assert.ok(song.title.length > 0);
    assert.match(song.embedUrl, /^https:\/\/www\.youtube-nocookie\.com\/embed\//);
    assert.match(song.externalUrl, /^https:\/\/music\.youtube\.com\/watch\?v=/);
  }
});

test("parseIsoDuration correctly parses ISO 8601 YouTube durations into seconds", () => {
  assert.equal(parseIsoDuration("PT14S"), 14);
  assert.equal(parseIsoDuration("PT3M45S"), 225);
  assert.equal(parseIsoDuration("PT1H2M3S"), 3723);
  assert.equal(parseIsoDuration("PT5M"), 300);
  assert.equal(parseIsoDuration(""), 0);
  assert.equal(parseIsoDuration(undefined), 0);
});


