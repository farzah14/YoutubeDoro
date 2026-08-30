import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { playTimerAlert, primeTimerAlertAudio } from "../lib/browserFeatures.ts";

const focusTimerSource = readFileSync(
  fileURLToPath(new URL("../hooks/useFocusTimer.ts", import.meta.url)),
  "utf8"
);
const browserFeaturesSource = readFileSync(
  fileURLToPath(new URL("../lib/browserFeatures.ts", import.meta.url)),
  "utf8"
);

test("focus start primes the alert audio path for later completion", () => {
  assert.match(focusTimerSource, /primeTimerAlertAudio/);
  assert.match(focusTimerSource, /void primeTimerAlertAudio\(\)/);
});

test("picture-in-picture support covers document and mobile video paths", () => {
  assert.match(browserFeaturesSource, /supportsVideoPictureInPicture/);
  assert.match(browserFeaturesSource, /requestPictureInPicture/);
  assert.match(browserFeaturesSource, /captureStream/);
});

test("timer alerts reuse the primed audio context", async () => {
  const originalWindow = (globalThis as typeof globalThis & { window?: unknown }).window;
  const stats = { contexts: 0, resumes: 0, starts: 0, closes: 0 };
  let oscillatorType = "";

  class FakeGain {
    gain = {
      setValueAtTime: () => undefined,
      exponentialRampToValueAtTime: () => undefined,
    };

    connect() {
      return this;
    }
  }

  class FakeOscillator {
    type = "";
    frequency = { value: 0 };

    connect() {
      return new FakeGain();
    }

    start() {
      stats.starts += 1;
      oscillatorType = this.type;
    }

    stop() {
      return undefined;
    }

    addEventListener() {
      return undefined;
    }
  }

  class FakeAudioContext {
    currentTime = 0;
    destination = {};
    state: "suspended" | "running" = "suspended";

    constructor() {
      stats.contexts += 1;
    }

    resume() {
      stats.resumes += 1;
      this.state = "running";
      return Promise.resolve();
    }

    createOscillator() {
      return new FakeOscillator();
    }

    createGain() {
      return new FakeGain();
    }

    close() {
      stats.closes += 1;
      return Promise.resolve();
    }
  }

  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: { AudioContext: FakeAudioContext },
  });

  try {
    await primeTimerAlertAudio();
    await playTimerAlert("soft", 70);
    await playTimerAlert("level-up", 70);

    assert.equal(stats.contexts, 1);
    assert.equal(stats.resumes, 1);
    assert.equal(stats.starts, 2);
    assert.equal(stats.closes, 0);
    assert.equal(oscillatorType, "triangle");
  } finally {
    Object.defineProperty(globalThis, "window", { configurable: true, value: originalWindow });
  }
});
