# Pomodoro Anime Break Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Pomodoro a fixed 50-minute focus interval and provide an in-app Anime Break whose duration and progress follow a supported YouTube, Vimeo, MP4, or WebM video.

**Architecture:** Keep clock-driven focus timing in `focusTimerEngine`, add an explicit media-driven break path, and normalize all accepted links through a pure provider parser. `AnimeBreakCard` owns provider-neutral UI while small player adapters translate YouTube, Vimeo, and native-video events into one playback contract. The workspace opens Anime Break after Pomodoro completes and the session recorder finalizes watched time exactly once.

**Tech Stack:** Next.js 16, React 19, TypeScript, Node test runner, `react-youtube`, `@vimeo/player`, native HTML video, localStorage.

---

## File map

**Create**

- `lib/breakMedia.ts` — safe provider parsing and saved-link migration.
- `tests/breakMedia.test.ts` — parser and migration contract.
- `components/timer/breakPlayers/types.ts` — common player event/ref contract.
- `components/timer/breakPlayers/YouTubeBreakPlayer.tsx` — YouTube adapter.
- `components/timer/breakPlayers/VimeoBreakPlayer.tsx` — Vimeo adapter.
- `components/timer/breakPlayers/DirectBreakPlayer.tsx` — native MP4/WebM adapter.
- `components/timer/AnimeBreakCard.tsx` — provider-neutral Anime Break UI and lifecycle coordinator.
- `tests/animeBreakSurface.test.ts` — source-level UI and integration contract.

**Modify**

- `package.json`, `package-lock.json` — add `@vimeo/player`.
- `types/index.ts` — provider-neutral saved break type.
- `lib/focusTimerEngine.ts` — fixed Pomodoro duration and media-driven break state transitions.
- `hooks/useFocusTimer.ts` — media-break orchestration and exactly-once callbacks.
- `lib/youtubePresets.ts` — provider-neutral default saved media.
- `components/settings/SettingsPanel.tsx` — show fixed Pomodoro 50 minutes without a misleading editable field.
- `components/timer/RestCardContainer.tsx` — rename YouTube mode to Anime video and connect media callbacks.
- `components/YouTubeRestTimer.tsx` — auto-open Anime Break after Pomodoro and stop it safely on close.
- `tests/focusTimerEngine.test.ts`, `tests/migrations.test.ts`, `tests/settingsPanel.test.ts`, `tests/uiRedesign.test.ts` — regression coverage.
- `README.md` — describe Pomodoro Anime Break and supported providers.

**Remove after replacement**

- `components/timer/YouTubeRestCard.tsx` — superseded by `AnimeBreakCard` and provider adapters.

---

### Task 1: Lock Pomodoro focus to 50 minutes

**Files:**
- Modify: `tests/focusTimerEngine.test.ts`
- Modify: `lib/focusTimerEngine.ts`
- Modify: `tests/settingsPanel.test.ts`
- Modify: `components/settings/SettingsPanel.tsx`

- [ ] **Step 1: Write the failing fixed-duration tests**

Add this test near the top of `tests/focusTimerEngine.test.ts`:

```ts
test("pomodoro is always a fixed fifty-minute focus", () => {
  const legacy = { ...preferences, focusMinutes: 25 };
  const customized = { ...preferences, focusMinutes: 90 };

  assert.equal(createTimerState(legacy).targetSeconds, 50 * 60);
  assert.equal(createTimerState(customized).targetSeconds, 50 * 60);
});

test("pomodoro waits for Anime Break even when auto-start is enabled", () => {
  const configured = { ...preferences, autoStartBreaks: true };
  const done = syncTimer(startTimer(createTimerState(configured), 0), configured, 50 * 60_000);

  assert.equal(done.phase, "break");
  assert.equal(done.status, "idle");
});
```

Update existing Pomodoro clock expectations from `25 * 60` to `50 * 60`, including the sync timestamp and display assertions. Change the existing auto-start regression to use `mode: "animedoro"`, because media-driven Pomodoro must wait for a loaded video while non-video methods retain auto-start behavior.

Add this assertion to `tests/settingsPanel.test.ts`:

```ts
test("Focus Timer presents Pomodoro as fixed at fifty minutes", () => {
  assert.match(settingsSource, /Pomodoro focus/);
  assert.match(settingsSource, /50 min/);
  assert.match(settingsSource, /Flexible focus/);
  assert.doesNotMatch(settingsSource, /key: "focusMinutes", label: "Focus"/);
});
```

- [ ] **Step 2: Run the focused tests and verify RED**

Run:

```bash
npm test -- tests/focusTimerEngine.test.ts tests/settingsPanel.test.ts
```

Expected: FAIL because Pomodoro still uses `preferences.focusMinutes` and the settings copy does not distinguish the fixed interval.

- [ ] **Step 3: Implement the fixed engine contract**

In `lib/focusTimerEngine.ts`, export and use a named constant:

```ts
export const POMODORO_FOCUS_MINUTES = 50;

function phaseSeconds(mode: TimerMode, phase: TimerPhase, preferences: FocusPreferences): number {
  if (phase === "focus") {
    if (mode === "stopwatch") return 0;
    if (mode === "countdown") return preferences.countdownMinutes * 60;
    if (mode === "52-17") return 52 * 60;
    if (mode === "pomodoro") return POMODORO_FOCUS_MINUTES * 60;
    return preferences.focusMinutes * 60;
  }
  return (mode === "52-17" ? 17 : preferences.breakMinutes) * 60;
}
```

In `advanceTimer`, keep Pomodoro idle while it waits for Anime Break metadata, even when the general auto-start option is enabled:

```ts
const shouldAutoStartClockBreak = state.phase === "focus"
  && state.mode !== "pomodoro"
  && preferences.autoStartBreaks;

return {
  ...state,
  phase,
  status: shouldAutoStartClockBreak ? "running" : "idle",
  targetSeconds: phaseSeconds(state.mode, phase, preferences),
  elapsedSeconds: 0,
  completedFocusSessions,
  startedAtMs: null,
  runStartedElapsedSeconds: 0,
};
```

In `components/settings/SettingsPanel.tsx`, rename the editable duration label and add a read-only Pomodoro row:

```ts
const timerDurations = [
  { key: "focusMinutes", label: "Flexible focus", max: 120 },
  { key: "breakMinutes", label: "Standard break", max: 120 },
] as const;
```

Insert this row immediately before `timerDurations.map(...)`:

```tsx
<div className="settings-recipe-row">
  <span>
    <strong>Pomodoro focus</strong>
    <small>Fixed study interval.</small>
  </span>
  <output className="settings-number-field">50 min</output>
</div>
```

- [ ] **Step 4: Run the focused tests and verify GREEN**

Run:

```bash
npm test -- tests/focusTimerEngine.test.ts tests/settingsPanel.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/focusTimerEngine.ts components/settings/SettingsPanel.tsx tests/focusTimerEngine.test.ts tests/settingsPanel.test.ts
git commit -m "feat: make Pomodoro a fixed fifty-minute focus"
```

---

### Task 2: Parse supported Anime Break links safely

**Files:**
- Create: `lib/breakMedia.ts`
- Create: `tests/breakMedia.test.ts`
- Modify: `types/index.ts`
- Modify: `lib/youtubePresets.ts`

- [ ] **Step 1: Write failing parser and migration tests**

Create `tests/breakMedia.test.ts`:

```ts
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
```

- [ ] **Step 2: Run the parser tests and verify RED**

Run:

```bash
npm test -- tests/breakMedia.test.ts
```

Expected: FAIL because `lib/breakMedia.ts` does not exist.

- [ ] **Step 3: Add provider-neutral media types**

Replace `SavedBreakVideo` in `types/index.ts` with:

```ts
export type BreakMediaProvider = "youtube" | "vimeo" | "file";

export interface BreakMediaDescriptor {
  provider: BreakMediaProvider;
  sourceUrl: string;
  mediaId?: string;
}

export interface SavedBreakMedia extends BreakMediaDescriptor {
  id: string;
  title: string;
  addedAt: number;
}
```

- [ ] **Step 4: Implement the pure parser and migration**

Create `lib/breakMedia.ts`:

```ts
import type { BreakMediaDescriptor, SavedBreakMedia } from "../types/index.ts";
import { extractYouTubeVideoId } from "./youtube.ts";

const YOUTUBE_ID = /^[a-zA-Z0-9_-]{11}$/;
const VIMEO_ID = /^\d+$/;
const DIRECT_VIDEO = /\.(mp4|webm)$/i;

export function parseBreakMediaInput(input: string): BreakMediaDescriptor | null {
  const raw = input.trim();
  if (!raw || raw.includes("<") || raw.includes(">")) return null;

  if (YOUTUBE_ID.test(raw)) {
    return {
      provider: "youtube",
      mediaId: raw,
      sourceUrl: `https://www.youtube.com/watch?v=${raw}`,
    };
  }

  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }
  if (url.protocol !== "https:") return null;

  const youtubeHosts = new Set([
    "youtube.com",
    "www.youtube.com",
    "m.youtube.com",
    "music.youtube.com",
    "youtu.be",
    "www.youtu.be",
  ]);
  if (youtubeHosts.has(url.hostname)) {
    const youtubeId = extractYouTubeVideoId(url.href);
    if (!youtubeId || !YOUTUBE_ID.test(youtubeId)) return null;
    return {
      provider: "youtube",
      mediaId: youtubeId,
      sourceUrl: `https://www.youtube.com/watch?v=${youtubeId}`,
    };
  }

  if (url.hostname === "vimeo.com" || url.hostname === "www.vimeo.com" || url.hostname === "player.vimeo.com") {
    const parts = url.pathname.split("/").filter(Boolean);
    const candidate = url.hostname === "player.vimeo.com" && parts[0] === "video" ? parts[1] : parts[0];
    if (!candidate || !VIMEO_ID.test(candidate)) return null;
    return {
      provider: "vimeo",
      mediaId: candidate,
      sourceUrl: `https://vimeo.com/${candidate}`,
    };
  }

  if (DIRECT_VIDEO.test(url.pathname)) {
    return { provider: "file", sourceUrl: url.href };
  }

  return null;
}

function text(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export function migrateSavedBreakMedia(value: unknown): SavedBreakMedia[] {
  if (!Array.isArray(value)) return [];
  const output: SavedBreakMedia[] = [];

  for (const candidate of value) {
    if (!candidate || typeof candidate !== "object") continue;
    const item = candidate as Record<string, unknown>;
    const id = text(item.id);
    const title = text(item.title);
    const addedAt = typeof item.addedAt === "number" && Number.isFinite(item.addedAt) ? item.addedAt : 0;
    const legacyVideoId = text(item.videoId);
    const parsed = legacyVideoId
      ? parseBreakMediaInput(legacyVideoId)
      : parseBreakMediaInput(text(item.sourceUrl) ?? "");
    if (!id || !title || !parsed) continue;
    output.push({ id, title, addedAt, ...parsed });
  }

  return output;
}
```

- [ ] **Step 5: Convert built-in saved breaks to the new type**

In `lib/youtubePresets.ts`, import `SavedBreakMedia` and change each default entry from `videoId` to canonical media fields:

```ts
export const DEFAULT_SAVED_BREAKS: SavedBreakMedia[] = [
  {
    id: "def-stretch",
    title: "5-Min Desk Stretch",
    provider: "youtube",
    sourceUrl: "https://www.youtube.com/watch?v=4BOTva4hSTc",
    mediaId: "4BOTva4hSTc",
    addedAt: 1700000000000,
  },
  {
    id: "def-breathing",
    title: "Box Breathing Reset",
    provider: "youtube",
    sourceUrl: "https://www.youtube.com/watch?v=inpok4MKVLM",
    mediaId: "inpok4MKVLM",
    addedAt: 1700000001000,
  },
];
```

- [ ] **Step 6: Run parser tests and verify GREEN**

Run:

```bash
npm test -- tests/breakMedia.test.ts
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add lib/breakMedia.ts types/index.ts lib/youtubePresets.ts tests/breakMedia.test.ts
git commit -m "feat: parse supported Anime Break media links"
```

---

### Task 3: Add media-driven break transitions to the timer engine

**Files:**
- Modify: `tests/focusTimerEngine.test.ts`
- Modify: `lib/focusTimerEngine.ts`

- [ ] **Step 1: Write failing media-break engine tests**

Import the new functions and add:

```ts
test("media break duration and progress come from the player", () => {
  const focusDone = advanceTimer(createTimerState(preferences), preferences);
  const prepared = prepareMediaBreak(focusDone, 24 * 60 + 12);
  const playing = syncMediaBreak(prepared, 37, "running");
  const paused = syncMediaBreak(playing, 40, "paused");

  assert.equal(prepared.driver, "media");
  assert.equal(prepared.targetSeconds, 24 * 60 + 12);
  assert.equal(playing.elapsedSeconds, 37);
  assert.equal(playing.status, "running");
  assert.equal(paused.elapsedSeconds, 40);
  assert.equal(paused.status, "paused");
});

test("finishing a media break returns to idle fifty-minute Pomodoro", () => {
  const focusDone = advanceTimer(createTimerState(preferences), preferences);
  const media = prepareMediaBreak(focusDone, 1_440);
  const finished = finishMediaBreak(syncMediaBreak(media, 1_440, "running"), preferences);

  assert.equal(finished.driver, "clock");
  assert.equal(finished.phase, "focus");
  assert.equal(finished.status, "idle");
  assert.equal(finished.targetSeconds, 3_000);
  assert.equal(finished.completedFocusSessions, 1);
});
```

- [ ] **Step 2: Run engine tests and verify RED**

Run:

```bash
npm test -- tests/focusTimerEngine.test.ts
```

Expected: FAIL because `driver` and the media-break functions do not exist.

- [ ] **Step 3: Implement pure media-break state transitions**

In `lib/focusTimerEngine.ts`, add:

```ts
export type TimerDriver = "clock" | "media";
export type MediaBreakStatus = "idle" | "running" | "paused";
```

Add `driver: TimerDriver` to `FocusTimerState`, set `driver: "clock"` in `createTimerState`, and add:

```ts
function safeMediaSeconds(value: number, fallback = 0): number {
  return Number.isFinite(value) ? Math.max(0, Math.floor(value)) : fallback;
}

export function prepareMediaBreak(state: FocusTimerState, durationSeconds: number): FocusTimerState {
  const targetSeconds = Math.max(1, safeMediaSeconds(durationSeconds, 1));
  return {
    ...state,
    driver: "media",
    phase: "break",
    status: "idle",
    targetSeconds,
    elapsedSeconds: 0,
    startedAtMs: null,
    runStartedElapsedSeconds: 0,
  };
}

export function syncMediaBreak(
  state: FocusTimerState,
  elapsedSeconds: number,
  status: MediaBreakStatus,
): FocusTimerState {
  if (state.driver !== "media" || state.phase !== "break") return state;
  return {
    ...state,
    status,
    elapsedSeconds: Math.min(state.targetSeconds, safeMediaSeconds(elapsedSeconds)),
    startedAtMs: null,
    runStartedElapsedSeconds: 0,
  };
}

export function finishMediaBreak(
  state: FocusTimerState,
  preferences: FocusPreferences,
): FocusTimerState {
  const next = createTimerState({ ...preferences, mode: state.mode });
  return { ...next, completedFocusSessions: state.completedFocusSessions };
}
```

Guard the wall-clock function:

```ts
export function syncTimer(state: FocusTimerState, preferences: FocusPreferences, nowMs: number): FocusTimerState {
  if (state.driver === "media" || state.status !== "running") return state;
  // existing clock implementation
}
```

Ensure `advanceTimer`, `resetTimer`, and `selectTimerPhase` return `driver: "clock"` whenever they create a normal interval.

- [ ] **Step 4: Run engine tests and verify GREEN**

Run:

```bash
npm test -- tests/focusTimerEngine.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/focusTimerEngine.ts tests/focusTimerEngine.test.ts
git commit -m "feat: add media-driven break timer state"
```

---

### Task 4: Expose exactly-once media-break controls from `useFocusTimer`

**Files:**
- Modify: `hooks/useFocusTimer.ts`
- Create: `tests/mediaBreakHookContract.test.ts`

- [ ] **Step 1: Write the failing hook contract test**

Create `tests/mediaBreakHookContract.test.ts`:

```ts
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL("../hooks/useFocusTimer.ts", import.meta.url), "utf8");

test("focus timer exposes one media-break lifecycle", () => {
  for (const token of [
    "prepareMediaBreak",
    "startMediaBreak",
    "updateMediaBreak",
    "finishMediaBreak",
    "stopMediaBreak",
    "mediaBreakStartedRef",
  ]) {
    assert.match(source, new RegExp(token));
  }
  assert.match(source, /onBreakDone\?\.\(watchedSeconds\)/);
  assert.match(source, /onBreakStop\?\.\(watchedSeconds\)/);
});
```

- [ ] **Step 2: Run the test and verify RED**

Run:

```bash
npm test -- tests/mediaBreakHookContract.test.ts
```

Expected: FAIL because the hook does not expose media-break controls.

- [ ] **Step 3: Implement the hook lifecycle**

Import the engine helpers using aliases to avoid name collisions:

```ts
import {
  finishMediaBreak as finishMediaBreakState,
  prepareMediaBreak as prepareMediaBreakState,
  syncMediaBreak,
  type MediaBreakStatus,
} from "@/lib/focusTimerEngine";
```

Add refs:

```ts
const mediaBreakStartedRef = useRef(false);
const mediaBreakFinalizedRef = useRef(false);
```

Add callbacks before the return value:

```ts
const prepareMediaBreak = useCallback((durationSeconds: number) => {
  mediaBreakStartedRef.current = false;
  mediaBreakFinalizedRef.current = false;
  setState((current) => prepareMediaBreakState(current, durationSeconds));
}, []);

const startMediaBreak = useCallback(async () => {
  if (mediaBreakStartedRef.current) return true;
  const current = stateRef.current;
  if (current.driver !== "media" || current.phase !== "break") return false;
  const allowed = await callbacks.current.onBreakStart?.({
    mode: current.mode,
    phase: "break",
    plannedSeconds: current.targetSeconds,
  });
  if (allowed === false) return false;
  mediaBreakStartedRef.current = true;
  setState((latest) => syncMediaBreak(latest, latest.elapsedSeconds, "running"));
  return true;
}, []);

const updateMediaBreak = useCallback((elapsedSeconds: number, status: MediaBreakStatus) => {
  setState((current) => syncMediaBreak(current, elapsedSeconds, status));
}, []);

const finalizeMediaBreak = useCallback((watchedSeconds: number, outcome: "done" | "stopped") => {
  if (mediaBreakFinalizedRef.current) return;
  mediaBreakFinalizedRef.current = true;
  const normalizedSeconds = Math.max(0, Math.floor(watchedSeconds));
  if (mediaBreakStartedRef.current) {
    const watchedSeconds = normalizedSeconds;
    if (outcome === "done") callbacks.current.onBreakDone?.(watchedSeconds);
    else callbacks.current.onBreakStop?.(watchedSeconds);
  }
  mediaBreakStartedRef.current = false;
  setState((current) => finishMediaBreakState(current, preferences));
}, [preferences]);

const finishMediaBreak = useCallback((watchedSeconds: number) => {
  finalizeMediaBreak(watchedSeconds, "done");
}, [finalizeMediaBreak]);

const stopMediaBreak = useCallback((watchedSeconds?: number) => {
  const current = stateRef.current;
  if (current.driver !== "media") return;
  finalizeMediaBreak(watchedSeconds ?? current.elapsedSeconds, "stopped");
}, [finalizeMediaBreak]);
```

In the existing completion effect, prevent the clock completion branch from finalizing a media-driven interval:

```ts
const completed = previous.driver === "clock"
  && previous.status === "running"
  && (previous.phase !== state.phase || state.status === "done");
```

Return all five methods from the hook.

- [ ] **Step 4: Run the hook and engine tests**

Run:

```bash
npm test -- tests/mediaBreakHookContract.test.ts tests/focusTimerEngine.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add hooks/useFocusTimer.ts tests/mediaBreakHookContract.test.ts
git commit -m "feat: coordinate media breaks through focus timer"
```

---

### Task 5: Add YouTube, Vimeo, and native-video player adapters

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Create: `components/timer/breakPlayers/types.ts`
- Create: `components/timer/breakPlayers/YouTubeBreakPlayer.tsx`
- Create: `components/timer/breakPlayers/VimeoBreakPlayer.tsx`
- Create: `components/timer/breakPlayers/DirectBreakPlayer.tsx`
- Create: `tests/breakPlayerAdapters.test.ts`

- [ ] **Step 1: Write the failing adapter contract test**

Create `tests/breakPlayerAdapters.test.ts`:

```ts
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
```

- [ ] **Step 2: Run the adapter test and verify RED**

Run:

```bash
npm test -- tests/breakPlayerAdapters.test.ts
```

Expected: FAIL because the adapter files do not exist.

- [ ] **Step 3: Install Vimeo's official browser player**

Run:

```bash
npm install @vimeo/player
```

Expected: `package.json` and `package-lock.json` include `@vimeo/player`.

- [ ] **Step 4: Define the shared adapter contract**

Create `components/timer/breakPlayers/types.ts`:

```ts
export interface BreakPlayerHandle {
  play: () => Promise<void> | void;
  pause: () => Promise<void> | void;
  stop: () => Promise<void> | void;
}

export interface BreakPlayerEvents {
  onReady: (durationSeconds: number) => void;
  onPlay: () => void;
  onPause: () => void;
  onProgress: (elapsedSeconds: number) => void;
  onBuffering: () => void;
  onEnded: () => void;
  onError: () => void;
}
```

- [ ] **Step 5: Implement the YouTube adapter**

Create `components/timer/breakPlayers/YouTubeBreakPlayer.tsx` as a `forwardRef<BreakPlayerHandle, { mediaId: string } & BreakPlayerEvents>` wrapper around `react-youtube`. Store the `PlayerLike` instance, poll `getCurrentTime()` every 250ms only while playing, and expose:

```ts
useImperativeHandle(ref, () => ({
  play: () => playerRef.current?.playVideo(),
  pause: () => playerRef.current?.pauseVideo(),
  stop: () => playerRef.current?.stopVideo(),
}), []);
```

Map state `1` to play, `2` to pause, `3` to buffering, and `0` to ended. On ready, call `onReady(Math.floor(event.target.getDuration()))`; if duration is initially zero, retry from the first play event before reporting an error. Clean up the progress interval on unmount.

- [ ] **Step 6: Implement the Vimeo adapter**

Create `components/timer/breakPlayers/VimeoBreakPlayer.tsx` using `@vimeo/player`. Render an iframe whose source is `https://player.vimeo.com/video/${mediaId}?autoplay=0&dnt=1`, construct one `Player` instance in an effect, and map:

```ts
player.ready().then(() => player.getDuration()).then((duration) => onReady(Math.floor(duration))).catch(onError);
player.on("play", onPlay);
player.on("pause", onPause);
player.on("bufferstart", onBuffering);
player.on("timeupdate", ({ seconds }) => onProgress(Math.floor(seconds)));
player.on("ended", onEnded);
player.on("error", onError);
```

Expose `play`, `pause`, and `stop` (`pause()` followed by `setCurrentTime(0)`) through `useImperativeHandle`. On cleanup, call `player.destroy()`.

- [ ] **Step 7: Implement the direct-file adapter**

Create `components/timer/breakPlayers/DirectBreakPlayer.tsx` around `<video controls preload="metadata">`. Use `loadedmetadata`, `play`, `pause`, `timeupdate`, `waiting`, `ended`, and `error` to emit the shared callbacks. Reject a non-finite or non-positive `video.duration` by calling `onError`. Expose:

```ts
useImperativeHandle(ref, () => ({
  play: () => videoRef.current?.play(),
  pause: () => videoRef.current?.pause(),
  stop: () => {
    const video = videoRef.current;
    if (!video) return;
    video.pause();
    video.currentTime = 0;
  },
}), []);
```

- [ ] **Step 8: Run adapter tests, typecheck, and verify GREEN**

Run:

```bash
npm test -- tests/breakPlayerAdapters.test.ts
npm run typecheck
```

Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add package.json package-lock.json components/timer/breakPlayers tests/breakPlayerAdapters.test.ts
git commit -m "feat: add Anime Break player adapters"
```

---

### Task 6: Replace the YouTube-only card with Anime Break

**Files:**
- Create: `components/timer/AnimeBreakCard.tsx`
- Create: `tests/animeBreakSurface.test.ts`
- Modify: `components/timer/RestCardContainer.tsx`
- Remove: `components/timer/YouTubeRestCard.tsx`

- [ ] **Step 1: Write the failing Anime Break surface test**

Create `tests/animeBreakSurface.test.ts`:

```ts
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

const cardPath = new URL("../components/timer/AnimeBreakCard.tsx", import.meta.url);
const restPath = new URL("../components/timer/RestCardContainer.tsx", import.meta.url);

test("Break tools expose an in-app provider-neutral Anime Break", () => {
  assert.equal(existsSync(cardPath), true);
  const card = readFileSync(cardPath, "utf8");
  const rest = readFileSync(restPath, "utf8");

  assert.match(rest, /Anime video/);
  assert.match(rest, /<AnimeBreakCard/);
  assert.match(card, /Anime Break/);
  assert.match(card, /YouTube, Vimeo, MP4, or WebM/);
  assert.match(card, /parseBreakMediaInput/);
  assert.match(card, /migrateSavedBreakMedia/);
  assert.match(card, /YouTubeBreakPlayer/);
  assert.match(card, /VimeoBreakPlayer/);
  assert.match(card, /DirectBreakPlayer/);
  assert.doesNotMatch(rest, /YouTubeRestCard|label: "YouTube"/);
});
```

- [ ] **Step 2: Run the surface test and verify RED**

Run:

```bash
npm test -- tests/animeBreakSurface.test.ts
```

Expected: FAIL because `AnimeBreakCard.tsx` does not exist.

- [ ] **Step 3: Implement the provider-neutral card**

Create `AnimeBreakCard` with these props:

```ts
interface AnimeBreakCardProps {
  totalTodaySec: number;
  onReady: (durationSeconds: number) => void;
  onPlay: () => Promise<boolean>;
  onPause: (elapsedSeconds: number) => void;
  onProgress: (elapsedSeconds: number) => void;
  onBuffering: (elapsedSeconds: number) => void;
  onDone: (elapsedSeconds: number) => void;
  onStop: (elapsedSeconds: number) => void;
}
```

The component must:

1. Parse manual input with `parseBreakMediaInput`.
2. Migrate localStorage values with `migrateSavedBreakMedia`.
3. Render the matching adapter through one `BreakPlayerHandle` ref.
4. Store duration and elapsed seconds from adapter callbacks.
5. Call `onReady(duration)` only for finite positive duration.
6. On the first play event, await `onPlay()`; if it returns false, pause the adapter and show `Start a focus session before starting a break.`
7. Forward pause, progress, buffering, natural end, and stop with the latest elapsed value.
8. Guard finalization with `finalizedRef` so end, stop, and unmount cannot record twice.
9. Save bookmarks as `SavedBreakMedia`, comparing `sourceUrl` for identity.
10. Show `This video cannot be played inside StudyRythms. Try another supported link.` for parse, metadata, or provider errors.

Start and clear a ten-second metadata timeout with the loaded descriptor:

```ts
useEffect(() => {
  if (!media) return;
  const timeout = window.setTimeout(() => {
    if (durationRef.current <= 0) {
      setErrorMsg("This video cannot be played inside StudyRythms. Try another supported link.");
      setMedia(null);
    }
  }, 10_000);
  return () => window.clearTimeout(timeout);
}, [media]);

const handleReady = (durationSeconds: number) => {
  const duration = Math.max(0, Math.floor(durationSeconds));
  if (!Number.isFinite(duration) || duration <= 0) {
    handlePlayerError();
    return;
  }
  durationRef.current = duration;
  setDurationSec(duration);
  setRemainingSec(duration);
  onReady(duration);
};
```

Use this provider selection:

```tsx
{media.provider === "youtube" && media.mediaId ? (
  <YouTubeBreakPlayer ref={playerRef} mediaId={media.mediaId} {...events} />
) : media.provider === "vimeo" && media.mediaId ? (
  <VimeoBreakPlayer ref={playerRef} mediaId={media.mediaId} {...events} />
) : (
  <DirectBreakPlayer ref={playerRef} sourceUrl={media.sourceUrl} {...events} />
)}
```

Keep the existing preset buttons by turning each preset `videoId` into a YouTube descriptor with `parseBreakMediaInput`. Keep the existing timer, progress bar, pause/resume, stop, bookmark, saved-list, and total-rest UI, but rename the visible copy to `Anime Break` and the input placeholder to `Paste a YouTube, Vimeo, MP4, or WebM link...`.

- [ ] **Step 4: Connect the new card in `RestCardContainer`**

Change the mode to `"plain" | "anime"`, accept `defaultMode?: "plain" | "anime"`, and replace the YouTube callback props with:

```ts
onAnimeReady: (durationSeconds: number) => void;
onAnimePlay: () => Promise<boolean>;
onAnimePause: (elapsedSeconds: number) => void;
onAnimeProgress: (elapsedSeconds: number) => void;
onAnimeBuffering: (elapsedSeconds: number) => void;
onAnimeDone: (elapsedSeconds: number) => void;
onAnimeStop: (elapsedSeconds: number) => void;
```

Initialize mode with `useState(defaultMode ?? "plain")`, label the segment `Anime video`, and pass the callbacks to `AnimeBreakCard`.

- [ ] **Step 5: Remove the obsolete YouTube-only component**

Delete `components/timer/YouTubeRestCard.tsx` after `rg -n "YouTubeRestCard" . --glob '!node_modules' --glob '!.next'` returns only that file.

- [ ] **Step 6: Run surface, parser, and adapter tests**

Run:

```bash
npm test -- tests/animeBreakSurface.test.ts tests/breakMedia.test.ts tests/breakPlayerAdapters.test.ts
npm run typecheck
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add components/timer/AnimeBreakCard.tsx components/timer/RestCardContainer.tsx components/timer/breakPlayers tests/animeBreakSurface.test.ts
git add -u components/timer/YouTubeRestCard.tsx
git commit -m "feat: replace YouTube breaks with Anime Break"
```

---

### Task 7: Open and synchronize Anime Break after Pomodoro

**Files:**
- Modify: `components/YouTubeRestTimer.tsx`
- Modify: `hooks/useFocusTimer.ts`
- Modify: `tests/animeBreakSurface.test.ts`

- [ ] **Step 1: Extend the failing integration test**

Add to `tests/animeBreakSurface.test.ts`:

```ts
const timer = readFileSync(new URL("../components/YouTubeRestTimer.tsx", import.meta.url), "utf8");

test("completed Pomodoro opens and wires Anime Break", () => {
  assert.match(timer, /followedByBreak\s*&&\s*mode === "pomodoro"/);
  assert.match(timer, /setOpenPanel\("rest"\)/);
  assert.match(timer, /defaultMode="anime"/);
  for (const token of [
    "prepareMediaBreak",
    "startMediaBreak",
    "updateMediaBreak",
    "finishMediaBreak",
    "stopMediaBreak",
  ]) {
    assert.match(timer, new RegExp(`focusTimer\\.${token}`));
  }
});
```

- [ ] **Step 2: Run the integration test and verify RED**

Run:

```bash
npm test -- tests/animeBreakSurface.test.ts
```

Expected: FAIL because the workspace is not wired to the media lifecycle.

- [ ] **Step 3: Pass the completed mode through the hook callback**

Change the hook option signature to:

```ts
onFocusDone?: (seconds: number, followedByBreak: boolean, mode: TimerMode) => void;
```

Call it with `previous.mode` in the clock completion effect.

- [ ] **Step 4: Open Anime Break after Pomodoro completion**

Change `handleLearnDone` in `components/YouTubeRestTimer.tsx` to:

```ts
const handleLearnDone = useCallback((seconds: number, followedByBreak: boolean, mode: TimerMode) => {
  const current = getLastMeasurements();
  checkpointSession({ ...current, learningSeconds: seconds }, true);
  if (followedByBreak && mode === "pomodoro") setOpenPanel("rest");
  if (!followedByBreak) finishSession("completed", seconds);
}, [checkpointSession, finishSession, getLastMeasurements]);
```

Import `TimerMode` from `@/types/focus`.

- [ ] **Step 5: Wire Anime Break callbacks**

Render `RestCardContainer` with:

```tsx
<RestCardContainer
  totalTodaySec={totalRestSec}
  defaultMode="anime"
  onBreakStart={handleBreakStart}
  onBreakProgress={handleBreakProgress}
  onRestDone={handleRestDone}
  onRestStop={handleRestStop}
  onAnimeReady={focusTimer.prepareMediaBreak}
  onAnimePlay={focusTimer.startMediaBreak}
  onAnimePause={(seconds) => focusTimer.updateMediaBreak(seconds, "paused")}
  onAnimeProgress={(seconds) => {
    focusTimer.updateMediaBreak(seconds, "running");
    handleBreakProgress(seconds);
  }}
  onAnimeBuffering={(seconds) => focusTimer.updateMediaBreak(seconds, "paused")}
  onAnimeDone={focusTimer.finishMediaBreak}
  onAnimeStop={focusTimer.stopMediaBreak}
/>
```

Use a dedicated close callback so closing the modal records an active media break once:

```ts
const closeBreakPanel = useCallback(() => {
  focusTimer.stopMediaBreak();
  closeWorkspacePanel();
}, [closeWorkspacePanel, focusTimer]);
```

Pass `closeBreakPanel` only to the Break tools modal. Normal panel closing remains unchanged.

- [ ] **Step 6: Run integration and timer tests**

Run:

```bash
npm test -- tests/animeBreakSurface.test.ts tests/mediaBreakHookContract.test.ts tests/focusTimerEngine.test.ts
npm run typecheck
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add components/YouTubeRestTimer.tsx hooks/useFocusTimer.ts tests/animeBreakSurface.test.ts
git commit -m "feat: open and synchronize Anime Break after Pomodoro"
```

---

### Task 8: Update migration, UI contracts, and documentation

**Files:**
- Modify: `tests/migrations.test.ts`
- Modify: `tests/uiRedesign.test.ts`
- Modify: `README.md`

- [ ] **Step 1: Add regression assertions**

In `tests/migrations.test.ts`, change the invalid focus fallback expectation from `25` to `50` only if the flexible-focus default is intentionally changed. Otherwise add this explicit assertion to document that the saved flexible value does not control Pomodoro:

```ts
test("legacy flexible focus settings do not redefine fixed Pomodoro", () => {
  const migrated = migrateFocusPreferences({ mode: "pomodoro", focusMinutes: 25 });
  assert.equal(migrated.focusMinutes, 25);
  assert.equal(createTimerState(migrated).targetSeconds, 3_000);
});
```

Import `createTimerState` from `../lib/focusTimerEngine.ts`.

In `tests/uiRedesign.test.ts`, replace the old shared break copy test with:

```ts
test("timer recipe distinguishes standard and media-derived breaks", () => {
  const restSource = readWorkspaceFile("components/timer/RestCardContainer.tsx");
  assert.match(settingsSource, /label: "Standard break"/);
  assert.match(restSource, /Anime video/);
  assert.match(restSource, /AnimeBreakCard/);
  assert.doesNotMatch(restSource, /YouTubeRestCard|label: "YouTube"/);
});
```

- [ ] **Step 2: Run the migration/UI tests and verify RED where copy changed**

Run:

```bash
npm test -- tests/migrations.test.ts tests/uiRedesign.test.ts
```

Expected: the new UI copy assertion fails until the source has been fully updated; the duration assertion passes once Task 1 is present.

- [ ] **Step 3: Update README**

Add under Focus timers:

```md
- Pomodoro uses a fixed 50-minute focus interval. After focus, Anime Break can play a supported YouTube, Vimeo, MP4, or WebM link inside StudyRythms and derives the break duration from the video.
```

Add under Security and privacy:

```md
- **Anime Break links**: StudyRythms accepts only validated HTTPS links from supported providers. It does not proxy videos, bypass DRM, or embed arbitrary page HTML.
```

- [ ] **Step 4: Run the migration/UI tests and verify GREEN**

Run:

```bash
npm test -- tests/migrations.test.ts tests/uiRedesign.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/migrations.ts tests/migrations.test.ts tests/uiRedesign.test.ts README.md
git commit -m "docs: explain fixed Pomodoro Anime Break behavior"
```

---

### Task 9: Full verification and browser acceptance

**Files:**
- Modify only if verification reveals a defect in the touched feature.

- [ ] **Step 1: Run the full automated suite**

Run:

```bash
npm test
npm run typecheck
npx eslint lib/focusTimerEngine.ts lib/breakMedia.ts hooks/useFocusTimer.ts components/timer/AnimeBreakCard.tsx components/timer/RestCardContainer.tsx components/timer/breakPlayers tests/focusTimerEngine.test.ts tests/breakMedia.test.ts tests/breakPlayerAdapters.test.ts tests/animeBreakSurface.test.ts tests/mediaBreakHookContract.test.ts
npm run build
git diff --check
```

Expected:

- all tests pass;
- TypeScript exits zero;
- touched-file lint exits zero;
- production build completes;
- `git diff --check` has no output.

- [ ] **Step 2: Start the app for browser verification**

Run:

```bash
npm run dev -- --hostname 127.0.0.1 --port 3001
```

Expected: Next.js reports `http://127.0.0.1:3001` ready.

- [ ] **Step 3: Verify the fixed focus interval**

In the authenticated app:

1. Select Pomodoro.
2. Confirm the focus dashboard shows `50:00` even if localStorage previously contained `focusMinutes: 25`.
3. Open Focus Timer settings and confirm `Pomodoro focus — 50 min` is read-only while flexible focus remains editable.

- [ ] **Step 4: Verify each supported provider**

For YouTube, Vimeo, and a CORS-accessible direct MP4/WebM test asset:

1. Open Break tools and select Anime video.
2. Paste the supported URL and load it.
3. Confirm playback stays inside StudyRythms.
4. Confirm the displayed duration matches the player's metadata.
5. Confirm play, pause, resume, buffering, stop, and natural completion update break time correctly.
6. Confirm completion returns to idle `50:00`.

- [ ] **Step 5: Verify rejection and exactly-once finalization**

1. Paste `javascript:alert(1)`, `http://example.com/video.mp4`, and an ordinary unsupported HTTPS page.
2. Confirm each shows the supported-link error and never starts break tracking.
3. Start a supported video, close Break tools, and confirm only the watched seconds are recorded once.
4. Reopen History and verify no duplicate session was created.

- [ ] **Step 6: Review the final diff**

Run:

```bash
git status --short
git diff --stat origin/main...HEAD
git log --oneline --decorate origin/main..HEAD
```

Expected: only the planned feature files and commits are present.

---

## Completion boundary

Implementation is complete only when:

- Pomodoro is demonstrably fixed at 3,000 seconds;
- supported videos play inside StudyRythms;
- video metadata sets break duration;
- player progress, pause, buffering, stop, and end drive actual break tracking;
- ending or closing records break time exactly once;
- unsupported links fail safely;
- legacy saved YouTube breaks still load;
- all automated and browser acceptance checks pass.
