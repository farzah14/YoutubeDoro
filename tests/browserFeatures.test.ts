import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { notifyTimerComplete, playTimerAlert, primeTimerAlertAudio } from "../lib/browserFeatures.ts";

const focusTimerSource = readFileSync(
  fileURLToPath(new URL("../hooks/useFocusTimer.ts", import.meta.url)),
  "utf8"
);
const browserFeaturesSource = readFileSync(
  fileURLToPath(new URL("../lib/browserFeatures.ts", import.meta.url)),
  "utf8"
);
const notificationWorkerPath = fileURLToPath(new URL("../public/notification-sw.js", import.meta.url));
const notificationWorkerSource = existsSync(notificationWorkerPath) ? readFileSync(notificationWorkerPath, "utf8") : "";

test("focus start primes the alert audio path for later completion", () => {
  assert.match(focusTimerSource, /primeTimerAlertAudio/);
  assert.match(focusTimerSource, /void primeTimerAlertAudio\(\)/);
});

test("picture-in-picture support covers document and mobile video paths", () => {
  assert.match(browserFeaturesSource, /supportsVideoPictureInPicture/);
  assert.match(browserFeaturesSource, /requestPictureInPicture/);
  assert.match(browserFeaturesSource, /captureStream/);
});

test("timer notifications use persistent service-worker delivery", () => {
  assert.match(browserFeaturesSource, /navigator\.serviceWorker/);
  assert.match(browserFeaturesSource, /notification-sw\.js/);
  assert.match(browserFeaturesSource, /showNotification/);
  assert.match(notificationWorkerSource, /notificationclick/);
});

test("timer notifications show through a service worker when permission is granted", async () => {
  const originalWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
  const originalNavigator = Object.getOwnPropertyDescriptor(globalThis, "navigator");
  const calls: { registerUrl?: string; notificationTitle?: string; notificationBody?: string } = {};
  const registration = {
    showNotification: async (title: string, options: NotificationOptions) => {
      calls.notificationTitle = title;
      calls.notificationBody = options.body;
    },
  };
  const serviceWorker = {
    register: async (url: string) => {
      calls.registerUrl = url;
      return registration;
    },
    ready: Promise.resolve(registration),
  };

  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: { Notification: { permission: "granted" } },
  });
  Object.defineProperty(globalThis, "navigator", {
    configurable: true,
    value: { serviceWorker },
  });

  try {
    await notifyTimerComplete("Your focus interval is complete.");
    assert.equal(calls.registerUrl, "/notification-sw.js");
    assert.equal(calls.notificationTitle, "Focus interval complete");
    assert.equal(calls.notificationBody, "Your focus interval is complete.");
  } finally {
    if (originalWindow) Object.defineProperty(globalThis, "window", originalWindow);
    else Reflect.deleteProperty(globalThis, "window");
    if (originalNavigator) Object.defineProperty(globalThis, "navigator", originalNavigator);
    else Reflect.deleteProperty(globalThis, "navigator");
  }
});

test("alert Preview resumes audio without waiting for autoplay", () => {
  assert.match(browserFeaturesSource, /context\.resume\(\)\.catch/);
  assert.match(browserFeaturesSource, /oscillator\.start\(startAt\)/);
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
