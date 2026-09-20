import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const files = [
  "components/timer/breakPlayers/YouTubeBreakPlayer.tsx",
  "components/timer/breakPlayers/VimeoBreakPlayer.tsx",
  "components/timer/breakPlayers/DirectBreakPlayer.tsx",
];

test("all Anime Break providers implement the shared playback contract", () => {
  for (const file of files) {
    assert.equal(existsSync(join(process.cwd(), file)), true, file);
    const source = readFileSync(join(process.cwd(), file), "utf8");
    for (const callback of ["onReady", "onPlay", "onPause", "onProgress", "onBuffering", "onEnded", "onError"]) {
      assert.match(source, new RegExp(callback), `${file}: ${callback}`);
    }
    assert.match(source, /BreakPlayerHandle/);
  }
});
