import assert from "node:assert/strict";
import test from "node:test";

import { migrateSavedBreakMedia, parseBreakMediaInput } from "../lib/breakMedia.ts";

test("parses supported YouTube, Vimeo, MP4, and WebM links", () => {
  assert.deepEqual(parseBreakMediaInput("https://youtu.be/dQw4w9WgXcQ"), {
    provider: "youtube",
    mediaId: "dQw4w9WgXcQ",
    sourceUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
  });
  assert.deepEqual(parseBreakMediaInput("https://vimeo.com/76979871"), {
    provider: "vimeo",
    mediaId: "76979871",
    sourceUrl: "https://vimeo.com/76979871",
  });
  assert.deepEqual(parseBreakMediaInput("https://cdn.example.com/episode-1.mp4?token=safe"), {
    provider: "file",
    sourceUrl: "https://cdn.example.com/episode-1.mp4?token=safe",
  });
  assert.equal(parseBreakMediaInput("https://cdn.example.com/episode-2.webm")?.provider, "file");
});

test("rejects unsafe, unsupported, and malformed links", () => {
  for (const input of [
    "javascript:alert(1)",
    "data:text/html,<script>alert(1)</script>",
    "http://cdn.example.com/episode.mp4",
    "http://youtube.com/watch?v=dQw4w9WgXcQ",
    "https://example.com/watch/episode",
    "<iframe src='https://youtube.com'></iframe>",
    "https://vimeo.com/not-a-number",
  ]) {
    assert.equal(parseBreakMediaInput(input), null, input);
  }
});

test("migrates legacy YouTube favorites without losing their identity", () => {
  assert.deepEqual(migrateSavedBreakMedia([{
    id: "old",
    title: "Old break",
    videoId: "dQw4w9WgXcQ",
    addedAt: 7,
  }]), [{
    id: "old",
    title: "Old break",
    provider: "youtube",
    sourceUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    mediaId: "dQw4w9WgXcQ",
    addedAt: 7,
  }]);
});
