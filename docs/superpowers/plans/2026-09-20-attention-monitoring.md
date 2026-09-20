# Attention Monitoring Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add opt-in, on-device head-pose monitoring that plays one attention sound after five continuous seconds away during a running focus interval.

**Architecture:** Keep pose math and alert timing in pure TypeScript modules, hide MediaPipe and camera APIs behind narrow browser adapters, and use a tested monitor coordinator for lifecycle cleanup. A thin React hook activates that coordinator only for a running focus phase, while existing focus preferences and UI expose the opt-in control and status.

**Tech Stack:** Next.js 16, React 19, TypeScript 5, Web Audio API, Media Capture API, `@mediapipe/tasks-vision` 1.0.1, Node test runner.

---

## File map

- Modify `types/focus.ts`: add the stored opt-in preference.
- Modify `lib/migrations.ts`: default and sanitize the opt-in preference.
- Modify `components/settings/SettingsPanel.tsx`: render the privacy-first toggle.
- Modify `tests/migrations.test.ts`, `tests/focusTimerEngine.test.ts`, `tests/settingsPanel.test.ts`: lock the preference contract.
- Create `lib/attention/config.ts`: centralize thresholds, sample interval, dimensions, and local asset URLs.
- Create `lib/attention/attentionEngine.ts`: own the five-second, one-alert-per-episode state machine.
- Create `lib/attention/headPose.ts`: validate/decompose a MediaPipe 4x4 transform and classify it.
- Create `tests/attentionEngine.test.ts`, `tests/headPose.test.ts`: cover the pure domain behavior.
- Create `scripts/copy-mediapipe-assets.mjs`: copy installed WASM runtime files into `public`.
- Modify `package.json`, `package-lock.json`, `.gitignore`: pin MediaPipe and generate ignored WASM assets during install.
- Create `public/mediapipe/face_landmarker.task`, `public/mediapipe/SOURCES.md`: vendor and document the official model.
- Create `lib/attention/mediaPipeDetector.ts`: adapt Face Landmarker results to `focused`/`away` observations.
- Create `lib/attention/browserCamera.ts`: acquire a private hidden video feed and release tracks.
- Create `lib/attention/attentionMonitor.ts`: coordinate startup, sampling, errors, alerts, cancellation, and cleanup.
- Create `tests/attentionAdapters.test.ts`, `tests/attentionMonitor.test.ts`: verify normalization and lifecycle behavior with fakes.
- Create `hooks/useAttentionMonitor.ts`: bind monitor lifetime to React.
- Create `components/attention/AttentionStatus.tsx`: render the accessible status badge.
- Modify `lib/browserFeatures.ts`, `tests/browserFeatures.test.ts`: add the distinct attention alert.
- Modify `components/YouTubeRestTimer.tsx`, `components/timer/LearningCard.tsx`, `app/globals.css`, `tests/uiRedesign.test.ts`: activate and display monitoring.
- Modify `README.md`: document behavior, privacy, and local assets.

## Task 1: Add the opt-in preference and settings toggle

**Files:**
- Modify: `types/focus.ts`
- Modify: `lib/migrations.ts`
- Modify: `components/settings/SettingsPanel.tsx`
- Modify: `tests/migrations.test.ts`
- Modify: `tests/focusTimerEngine.test.ts`
- Modify: `tests/settingsPanel.test.ts`

- [ ] **Step 1: Write failing preference and settings tests**

Add `attentionMonitoringEnabled: false` to the expected object in `sanitizes focus preferences into supported ranges`, then add these tests:

```ts
test("attention monitoring is opt-in and preserves an explicit enabled value", () => {
  assert.equal(migrateFocusPreferences({}).attentionMonitoringEnabled, false);
  assert.equal(
    migrateFocusPreferences({ attentionMonitoringEnabled: true }).attentionMonitoringEnabled,
    true
  );
  assert.equal(
    migrateFocusPreferences({ attentionMonitoringEnabled: "true" }).attentionMonitoringEnabled,
    false
  );
});
```

```ts
test("Focus Timer settings exposes privacy-first attention monitoring", () => {
  assert.match(settingsPanelSource, /Attention monitoring/);
  assert.match(settingsPanelSource, /camera is used only while a focus interval is running/i);
  assert.match(settingsPanelSource, /preferences\.attentionMonitoringEnabled/);
  assert.match(settingsPanelSource, /attentionMonitoringEnabled: event\.target\.checked/);
});
```

Also add `attentionMonitoringEnabled: false` to the typed `preferences` fixture in `tests/focusTimerEngine.test.ts`.

- [ ] **Step 2: Run the focused tests and confirm RED**

Run:

```bash
node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON --experimental-strip-types --test tests/migrations.test.ts tests/settingsPanel.test.ts tests/focusTimerEngine.test.ts
```

Expected: FAIL because `FocusPreferences` and the settings source do not contain `attentionMonitoringEnabled`.

- [ ] **Step 3: Implement the stored preference**

Add this field to `FocusPreferences` in `types/focus.ts`:

```ts
attentionMonitoringEnabled: boolean;
```

Add this entry to `DEFAULT_FOCUS_PREFERENCES` in `lib/migrations.ts`:

```ts
attentionMonitoringEnabled: false,
```

Add this entry to the object returned by `migrateFocusPreferences`:

```ts
attentionMonitoringEnabled: source.attentionMonitoringEnabled === true,
```

Add this row after Browser notifications in the Focus Timer behavior list:

```tsx
<label className="settings-toggle settings-recipe-toggle">
  <span>
    <strong>Attention monitoring</strong>
    <small>Process head direction on this device; the camera is used only while a focus interval is running.</small>
  </span>
  <input
    type="checkbox"
    checked={preferences.attentionMonitoringEnabled}
    onChange={(event) => setStoredPreferences({
      ...preferences,
      attentionMonitoringEnabled: event.target.checked,
    })}
  />
</label>
```

- [ ] **Step 4: Run focused tests and confirm GREEN**

Run:

```bash
node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON --experimental-strip-types --test tests/migrations.test.ts tests/settingsPanel.test.ts tests/focusTimerEngine.test.ts
```

Expected: all selected tests pass.

- [ ] **Step 5: Commit the preference slice**

```bash
git add types/focus.ts lib/migrations.ts components/settings/SettingsPanel.tsx tests/migrations.test.ts tests/focusTimerEngine.test.ts tests/settingsPanel.test.ts
git commit -m "feat: add attention monitoring preference"
```

## Task 2: Build the pure attention engine and pose classifier

**Files:**
- Create: `lib/attention/config.ts`
- Create: `lib/attention/attentionEngine.ts`
- Create: `lib/attention/headPose.ts`
- Create: `tests/attentionEngine.test.ts`
- Create: `tests/headPose.test.ts`

- [ ] **Step 1: Write failing attention-episode tests**

Create `tests/attentionEngine.test.ts`:

```ts
import assert from "node:assert/strict";
import test from "node:test";
import {
  advanceAttention,
  createAttentionState,
} from "../lib/attention/attentionEngine.ts";

test("less than five continuous seconds away does not alert", () => {
  const first = advanceAttention(createAttentionState(), "away", 1_000, 5_000);
  const second = advanceAttention(first.state, "away", 5_999, 5_000);

  assert.equal(first.shouldAlert, false);
  assert.equal(second.shouldAlert, false);
});

test("five continuous seconds away alerts exactly once", () => {
  const started = advanceAttention(createAttentionState(), "away", 1_000, 5_000);
  const alerted = advanceAttention(started.state, "away", 6_000, 5_000);
  const continued = advanceAttention(alerted.state, "away", 20_000, 5_000);

  assert.equal(alerted.shouldAlert, true);
  assert.equal(continued.shouldAlert, false);
});

test("focused and inactive observations reset and rearm an away episode", () => {
  const started = advanceAttention(createAttentionState(), "away", 0, 5_000);
  const focused = advanceAttention(started.state, "focused", 4_000, 5_000);
  const restarted = advanceAttention(focused.state, "away", 8_000, 5_000);
  const alerted = advanceAttention(restarted.state, "away", 13_000, 5_000);
  const inactive = advanceAttention(alerted.state, "inactive", 14_000, 5_000);

  assert.equal(focused.state.awaySinceMs, null);
  assert.equal(alerted.shouldAlert, true);
  assert.deepEqual(inactive.state, createAttentionState());
});
```

- [ ] **Step 2: Write failing head-pose tests**

Create `tests/headPose.test.ts`:

```ts
import assert from "node:assert/strict";
import test from "node:test";
import { classifyHeadTransform, extractHeadPose } from "../lib/attention/headPose.ts";

function transform(yawDeg: number, pitchDeg: number) {
  const yaw = yawDeg * Math.PI / 180;
  const pitch = pitchDeg * Math.PI / 180;
  const cy = Math.cos(yaw);
  const sy = Math.sin(yaw);
  const cp = Math.cos(pitch);
  const sp = Math.sin(pitch);
  return {
    rows: 4,
    columns: 4,
    data: [
      cy, sy * sp, sy * cp, 0,
      0, cp, -sp, 0,
      -sy, cy * sp, cy * cp, 0,
      0, 0, 0, 1,
    ],
  };
}

test("extracts forward, yaw, and pitch angles from a row-major transform", () => {
  assert.deepEqual(extractHeadPose(transform(0, 0)), { yawDeg: 0, pitchDeg: 0 });
  assert.ok(Math.abs(extractHeadPose(transform(30, 0))!.yawDeg - 30) < 0.001);
  assert.ok(Math.abs(extractHeadPose(transform(0, -25))!.pitchDeg + 25) < 0.001);
});

test("classifies conservative forward and away thresholds", () => {
  assert.equal(classifyHeadTransform(transform(24, 19), 25, 20), "focused");
  assert.equal(classifyHeadTransform(transform(26, 0), 25, 20), "away");
  assert.equal(classifyHeadTransform(transform(-26, 0), 25, 20), "away");
  assert.equal(classifyHeadTransform(transform(0, 21), 25, 20), "away");
  assert.equal(classifyHeadTransform(null, 25, 20), "away");
});

test("rejects malformed or non-finite transforms as away", () => {
  assert.equal(extractHeadPose({ rows: 3, columns: 3, data: [1] }), null);
  assert.equal(classifyHeadTransform({ rows: 4, columns: 4, data: Array(16).fill(Number.NaN) }, 25, 20), "away");
});
```

- [ ] **Step 3: Run the new tests and confirm RED**

Run:

```bash
node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON --experimental-strip-types --test tests/attentionEngine.test.ts tests/headPose.test.ts
```

Expected: FAIL with missing `lib/attention/attentionEngine.ts` and `lib/attention/headPose.ts` modules.

- [ ] **Step 4: Implement the central configuration**

Create `lib/attention/config.ts`:

```ts
export const ATTENTION_CONFIG = {
  awayDurationMs: 5_000,
  sampleIntervalMs: 250,
  yawThresholdDeg: 25,
  pitchThresholdDeg: 20,
  videoWidth: 640,
  videoHeight: 480,
  wasmPath: "/mediapipe/wasm",
  modelPath: "/mediapipe/face_landmarker.task",
} as const;
```

- [ ] **Step 5: Implement the episode state machine**

Create `lib/attention/attentionEngine.ts`:

```ts
export type AttentionObservation = "focused" | "away" | "inactive";

export interface AttentionState {
  awaySinceMs: number | null;
  alerted: boolean;
}

export interface AttentionTransition {
  state: AttentionState;
  shouldAlert: boolean;
}

export function createAttentionState(): AttentionState {
  return { awaySinceMs: null, alerted: false };
}

export function advanceAttention(
  state: AttentionState,
  observation: AttentionObservation,
  nowMs: number,
  awayDurationMs: number,
): AttentionTransition {
  if (observation !== "away") {
    return { state: createAttentionState(), shouldAlert: false };
  }
  if (state.awaySinceMs === null) {
    return { state: { awaySinceMs: nowMs, alerted: false }, shouldAlert: false };
  }
  if (state.alerted || nowMs - state.awaySinceMs < awayDurationMs) {
    return { state, shouldAlert: false };
  }
  return {
    state: { awaySinceMs: state.awaySinceMs, alerted: true },
    shouldAlert: true,
  };
}
```

- [ ] **Step 6: Implement matrix validation, decomposition, and classification**

Create `lib/attention/headPose.ts`:

```ts
import type { AttentionObservation } from "./attentionEngine.ts";

export interface MatrixTransform {
  rows: number;
  columns: number;
  data: number[];
}

export interface HeadPose {
  yawDeg: number;
  pitchDeg: number;
}

const toDegrees = (radians: number) => radians * 180 / Math.PI;

export function extractHeadPose(transform: MatrixTransform | null): HeadPose | null {
  if (!transform || transform.rows !== 4 || transform.columns !== 4 || transform.data.length !== 16) return null;
  if (!transform.data.every(Number.isFinite)) return null;

  const yaw = Math.atan2(-transform.data[8], Math.hypot(transform.data[0], transform.data[4]));
  const pitch = Math.atan2(transform.data[9], transform.data[10]);
  return { yawDeg: toDegrees(yaw), pitchDeg: toDegrees(pitch) };
}

export function classifyHeadTransform(
  transform: MatrixTransform | null,
  yawThresholdDeg: number,
  pitchThresholdDeg: number,
): AttentionObservation {
  const pose = extractHeadPose(transform);
  if (!pose) return "away";
  if (Math.abs(pose.yawDeg) > yawThresholdDeg) return "away";
  if (Math.abs(pose.pitchDeg) > pitchThresholdDeg) return "away";
  return "focused";
}
```

- [ ] **Step 7: Run tests and confirm GREEN**

Run:

```bash
node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON --experimental-strip-types --test tests/attentionEngine.test.ts tests/headPose.test.ts
```

Expected: 6 tests pass.

- [ ] **Step 8: Commit the pure domain slice**

```bash
git add lib/attention/config.ts lib/attention/attentionEngine.ts lib/attention/headPose.ts tests/attentionEngine.test.ts tests/headPose.test.ts
git commit -m "feat: add attention detection domain logic"
```

## Task 3: Pin MediaPipe and prepare local runtime assets

**Files:**
- Create: `scripts/copy-mediapipe-assets.mjs`
- Create: `public/mediapipe/face_landmarker.task`
- Create: `public/mediapipe/SOURCES.md`
- Modify: `.gitignore`
- Modify: `package.json`
- Modify: `package-lock.json`

- [ ] **Step 1: Add the deterministic WASM copy script**

Create `scripts/copy-mediapipe-assets.mjs`:

```js
import { cp, mkdir } from "node:fs/promises";
import { resolve } from "node:path";

const source = resolve("node_modules/@mediapipe/tasks-vision/wasm");
const destination = resolve("public/mediapipe/wasm");

await mkdir(destination, { recursive: true });
await cp(source, destination, { recursive: true, force: true });
```

Add this ignored generated directory to `.gitignore`:

```gitignore
/public/mediapipe/wasm/
```

Add this script to `package.json`:

```json
"postinstall": "node scripts/copy-mediapipe-assets.mjs"
```

- [ ] **Step 2: Install the exact browser runtime**

Run:

```bash
npm install --save-exact @mediapipe/tasks-vision@1.0.1
```

Expected: `package.json` and `package-lock.json` pin version `1.0.1`, and `public/mediapipe/wasm` contains the package's JavaScript and WASM runtime files.

- [ ] **Step 3: Vendor and verify the official Face Landmarker model**

Run:

```bash
mkdir -p public/mediapipe
curl -fsSL https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task -o public/mediapipe/face_landmarker.task
sha256sum public/mediapipe/face_landmarker.task
```

Expected SHA-256:

```text
64184e229b263107bc2b804c6625db1341ff2bb731874b0bcc2fe6544e0bc9ff
```

Create `public/mediapipe/SOURCES.md`:

```md
# MediaPipe assets

- `face_landmarker.task`
  - Source: <https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task>
  - Retrieved: 2026-09-20
  - SHA-256: `64184e229b263107bc2b804c6625db1341ff2bb731874b0bcc2fe6544e0bc9ff`
- `wasm/`
  - Generated by `npm run postinstall` from `@mediapipe/tasks-vision@1.0.1`.
  - Package license: Apache-2.0.
```

- [ ] **Step 4: Verify local assets and package integrity**

Run:

```bash
npm run postinstall
test -f public/mediapipe/wasm/vision_wasm_internal.wasm
test -f public/mediapipe/wasm/vision_wasm_nosimd_internal.wasm
test -f public/mediapipe/face_landmarker.task
npm ls @mediapipe/tasks-vision
```

Expected: every command exits 0 and `npm ls` reports `@mediapipe/tasks-vision@1.0.1`.

- [ ] **Step 5: Commit dependencies and source-documented model**

```bash
git add .gitignore package.json package-lock.json scripts/copy-mediapipe-assets.mjs public/mediapipe/face_landmarker.task public/mediapipe/SOURCES.md
git commit -m "build: add local mediapipe face model"
```

## Task 4: Implement the MediaPipe and camera adapters

**Files:**
- Create: `lib/attention/mediaPipeDetector.ts`
- Create: `lib/attention/browserCamera.ts`
- Create: `tests/attentionAdapters.test.ts`

- [ ] **Step 1: Write failing adapter-contract tests**

Create `tests/attentionAdapters.test.ts`:

```ts
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { observationFromFaceResult } from "../lib/attention/mediaPipeDetector.ts";

const cameraSource = readFileSync(
  fileURLToPath(new URL("../lib/attention/browserCamera.ts", import.meta.url)),
  "utf8"
);

const forward = {
  rows: 4,
  columns: 4,
  data: [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1],
};

test("MediaPipe result normalization treats no face as away", () => {
  assert.equal(observationFromFaceResult({ facialTransformationMatrixes: [] }), "away");
  assert.equal(observationFromFaceResult({ facialTransformationMatrixes: [forward] }), "focused");
});

test("camera adapter requests only a user-facing 640 by 480 video and stops tracks", () => {
  assert.match(cameraSource, /audio:\s*false/);
  assert.match(cameraSource, /facingMode:\s*"user"/);
  assert.match(cameraSource, /videoWidth/);
  assert.match(cameraSource, /videoHeight/);
  assert.match(cameraSource, /getTracks\(\)\.forEach\(\(track\) => track\.stop\(\)\)/);
});
```

- [ ] **Step 2: Run the adapter test and confirm RED**

Run:

```bash
node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON --experimental-strip-types --test tests/attentionAdapters.test.ts
```

Expected: FAIL because the adapter modules do not exist.

- [ ] **Step 3: Implement the MediaPipe detector adapter**

Create `lib/attention/mediaPipeDetector.ts`:

```ts
import { ATTENTION_CONFIG } from "./config.ts";
import type { AttentionObservation } from "./attentionEngine.ts";
import { classifyHeadTransform, type MatrixTransform } from "./headPose.ts";

export interface FaceResultLike {
  facialTransformationMatrixes: MatrixTransform[];
}

export interface AttentionDetector {
  observe: (frame: HTMLVideoElement, timestampMs: number) => AttentionObservation;
  close: () => void;
}

export function observationFromFaceResult(result: FaceResultLike): AttentionObservation {
  return classifyHeadTransform(
    result.facialTransformationMatrixes[0] ?? null,
    ATTENTION_CONFIG.yawThresholdDeg,
    ATTENTION_CONFIG.pitchThresholdDeg,
  );
}

export async function createMediaPipeDetector(): Promise<AttentionDetector> {
  const { FaceLandmarker, FilesetResolver } = await import("@mediapipe/tasks-vision");
  const files = await FilesetResolver.forVisionTasks(ATTENTION_CONFIG.wasmPath);
  const landmarker = await FaceLandmarker.createFromOptions(files, {
    baseOptions: { modelAssetPath: ATTENTION_CONFIG.modelPath },
    runningMode: "VIDEO",
    numFaces: 1,
    outputFaceBlendshapes: false,
    outputFacialTransformationMatrixes: true,
  });

  return {
    observe: (frame, timestampMs) => observationFromFaceResult(
      landmarker.detectForVideo(frame, timestampMs)
    ),
    close: () => landmarker.close(),
  };
}
```

- [ ] **Step 4: Implement the camera adapter with guaranteed cleanup**

Create `lib/attention/browserCamera.ts`:

```ts
import { ATTENTION_CONFIG } from "./config.ts";

export interface AttentionCamera {
  frame: HTMLVideoElement;
  stop: () => void;
}

function stopStream(stream: MediaStream): void {
  stream.getTracks().forEach((track) => track.stop());
}

export async function openAttentionCamera(): Promise<AttentionCamera> {
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error("Camera access is unavailable in this browser.");
  }

  const stream = await navigator.mediaDevices.getUserMedia({
    audio: false,
    video: {
      facingMode: "user",
      width: { ideal: ATTENTION_CONFIG.videoWidth },
      height: { ideal: ATTENTION_CONFIG.videoHeight },
    },
  });
  const video = document.createElement("video");
  video.muted = true;
  video.defaultMuted = true;
  video.autoplay = true;
  video.playsInline = true;
  video.srcObject = stream;

  try {
    await video.play();
  } catch (error) {
    stopStream(stream);
    video.srcObject = null;
    throw error;
  }

  return {
    frame: video,
    stop: () => {
      video.pause();
      video.srcObject = null;
      stopStream(stream);
    },
  };
}
```

- [ ] **Step 5: Run adapter tests, type-check, and confirm GREEN**

Run:

```bash
node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON --experimental-strip-types --test tests/attentionAdapters.test.ts
npm run typecheck
```

Expected: adapter tests pass and TypeScript reports no errors.

- [ ] **Step 6: Commit the browser adapters**

```bash
git add lib/attention/mediaPipeDetector.ts lib/attention/browserCamera.ts tests/attentionAdapters.test.ts
git commit -m "feat: add local head pose adapters"
```

## Task 5: Add a tested monitoring lifecycle coordinator

**Files:**
- Create: `lib/attention/attentionMonitor.ts`
- Create: `tests/attentionMonitor.test.ts`

- [ ] **Step 1: Write failing coordinator tests**

Create `tests/attentionMonitor.test.ts` with fake camera, detector, clock, and scheduler boundaries:

```ts
import assert from "node:assert/strict";
import test from "node:test";
import { createAttentionMonitor } from "../lib/attention/attentionMonitor.ts";
import type { AttentionObservation } from "../lib/attention/attentionEngine.ts";

function harness(observations: AttentionObservation[]) {
  let nowMs = 0;
  let scheduled: (() => void) | null = null;
  const stats = { alerts: 0, cameraStops: 0, detectorCloses: 0 };
  const statuses: string[] = [];
  const camera = {
    frame: {} as HTMLVideoElement,
    stop: () => { stats.cameraStops += 1; },
  };
  const detector = {
    observe: () => observations.shift() ?? "focused",
    close: () => { stats.detectorCloses += 1; },
  };
  const monitor = createAttentionMonitor({
    openCamera: async () => camera,
    createDetector: async () => detector,
    now: () => nowMs,
    schedule: (callback) => { scheduled = callback; return 1; },
    cancel: () => { scheduled = null; },
    playAlert: () => { stats.alerts += 1; },
    onStatus: (status) => statuses.push(status),
  });
  return {
    monitor,
    stats,
    statuses,
    setNow: (value: number) => { nowMs = value; },
    runScheduled: () => {
      const callback = scheduled;
      scheduled = null;
      assert.ok(callback);
      callback();
    },
  };
}

test("monitor alerts once after five continuous seconds and rearms after focus", async () => {
  const run = harness(["away", "away", "away", "focused", "away", "away"]);
  await run.monitor.start();
  run.setNow(4_999);
  run.runScheduled();
  run.setNow(5_000);
  run.runScheduled();
  run.setNow(8_000);
  run.runScheduled();
  run.setNow(9_000);
  run.runScheduled();
  run.setNow(14_000);
  run.runScheduled();

  assert.equal(run.stats.alerts, 2);
  assert.ok(run.statuses.includes("focused"));
  assert.ok(run.statuses.includes("away"));
});

test("stop cancels sampling and releases camera and detector", async () => {
  const run = harness(["focused"]);
  await run.monitor.start();
  run.monitor.stop();

  assert.equal(run.stats.cameraStops, 1);
  assert.equal(run.stats.detectorCloses, 1);
  assert.equal(run.statuses.at(-1), "idle");
});

test("permission denial reports blocked without starting the timer dependency", async () => {
  const statuses: string[] = [];
  const denied = Object.assign(new Error("denied"), { name: "NotAllowedError" });
  const monitor = createAttentionMonitor({
    openCamera: async () => { throw denied; },
    createDetector: async () => { throw new Error("must not run"); },
    now: () => 0,
    schedule: () => 1,
    cancel: () => undefined,
    playAlert: () => undefined,
    onStatus: (status) => statuses.push(status),
  });

  await monitor.start();
  assert.equal(statuses.at(-1), "blocked");
});

test("detector startup failure releases an acquired camera", async () => {
  let stopped = 0;
  const statuses: string[] = [];
  const monitor = createAttentionMonitor({
    openCamera: async () => ({ frame: {} as HTMLVideoElement, stop: () => { stopped += 1; } }),
    createDetector: async () => { throw new Error("model failed"); },
    now: () => 0,
    schedule: () => 1,
    cancel: () => undefined,
    playAlert: () => undefined,
    onStatus: (status) => statuses.push(status),
  });

  await monitor.start();
  assert.equal(stopped, 1);
  assert.equal(statuses.at(-1), "unavailable");
});
```

- [ ] **Step 2: Run the coordinator tests and confirm RED**

Run:

```bash
node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON --experimental-strip-types --test tests/attentionMonitor.test.ts
```

Expected: FAIL because `createAttentionMonitor` does not exist.

- [ ] **Step 3: Implement the lifecycle coordinator**

Create `lib/attention/attentionMonitor.ts`:

```ts
import { ATTENTION_CONFIG } from "./config.ts";
import {
  advanceAttention,
  createAttentionState,
  type AttentionState,
} from "./attentionEngine.ts";
import type { AttentionCamera } from "./browserCamera.ts";
import type { AttentionDetector } from "./mediaPipeDetector.ts";

export type AttentionMonitorStatus =
  | "idle" | "starting" | "focused" | "away" | "blocked" | "unavailable";

type ScheduleHandle = number;

export interface AttentionMonitorDependencies {
  openCamera: () => Promise<AttentionCamera>;
  createDetector: () => Promise<AttentionDetector>;
  now: () => number;
  schedule: (callback: () => void, delayMs: number) => ScheduleHandle;
  cancel: (handle: ScheduleHandle) => void;
  playAlert: () => void;
  onStatus: (status: AttentionMonitorStatus) => void;
}

export interface AttentionMonitor {
  start: () => Promise<void>;
  stop: () => void;
}

function errorStatus(error: unknown): AttentionMonitorStatus {
  const name = typeof error === "object" && error !== null && "name" in error
    ? String((error as { name: unknown }).name)
    : "";
  return name === "NotAllowedError" || name === "SecurityError" ? "blocked" : "unavailable";
}

export function createAttentionMonitor(dependencies: AttentionMonitorDependencies): AttentionMonitor {
  let generation = 0;
  let camera: AttentionCamera | null = null;
  let detector: AttentionDetector | null = null;
  let scheduled: ScheduleHandle | null = null;
  let episode: AttentionState = createAttentionState();

  const release = () => {
    const activeSchedule = scheduled;
    const activeDetector = detector;
    const activeCamera = camera;
    scheduled = null;
    detector = null;
    camera = null;
    episode = createAttentionState();
    try { if (activeSchedule !== null) dependencies.cancel(activeSchedule); } catch { /* cleanup continues */ }
    try { activeDetector?.close(); } catch { /* cleanup continues */ }
    try { activeCamera?.stop(); } catch { /* cleanup is best effort */ }
  };

  const sample = () => {
    if (!camera || !detector) return;
    try {
      const timestampMs = dependencies.now();
      const observation = detector.observe(camera.frame, timestampMs);
      const transition = advanceAttention(
        episode,
        observation,
        timestampMs,
        ATTENTION_CONFIG.awayDurationMs,
      );
      episode = transition.state;
      dependencies.onStatus(observation === "focused" ? "focused" : "away");
      if (transition.shouldAlert) {
        try { dependencies.playAlert(); } catch { /* audio is non-fatal */ }
      }
      scheduled = dependencies.schedule(sample, ATTENTION_CONFIG.sampleIntervalMs);
    } catch {
      release();
      dependencies.onStatus("unavailable");
    }
  };

  const stop = () => {
    generation += 1;
    release();
    dependencies.onStatus("idle");
  };

  const start = async () => {
    stop();
    const currentGeneration = generation;
    dependencies.onStatus("starting");
    try {
      camera = await dependencies.openCamera();
      if (generation !== currentGeneration) { release(); return; }
      detector = await dependencies.createDetector();
      if (generation !== currentGeneration) { release(); return; }
      sample();
    } catch (error) {
      if (generation !== currentGeneration) { release(); return; }
      release();
      dependencies.onStatus(errorStatus(error));
    }
  };

  return { start, stop };
}
```

- [ ] **Step 4: Run coordinator and domain tests and confirm GREEN**

Run:

```bash
node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON --experimental-strip-types --test tests/attentionMonitor.test.ts tests/attentionEngine.test.ts tests/headPose.test.ts
```

Expected: all attention tests pass.

- [ ] **Step 5: Commit the coordinator**

```bash
git add lib/attention/attentionMonitor.ts tests/attentionMonitor.test.ts
git commit -m "feat: coordinate attention monitor lifecycle"
```

## Task 6: Integrate audio, React lifecycle, and focus UI

**Files:**
- Create: `hooks/useAttentionMonitor.ts`
- Create: `components/attention/AttentionStatus.tsx`
- Modify: `lib/browserFeatures.ts`
- Modify: `hooks/useFocusTimer.ts`
- Modify: `tests/browserFeatures.test.ts`
- Modify: `components/YouTubeRestTimer.tsx`
- Modify: `components/timer/LearningCard.tsx`
- Modify: `app/globals.css`
- Modify: `tests/uiRedesign.test.ts`

- [ ] **Step 1: Write failing audio and UI contract tests**

Add `playAttentionAlert` to the imports in `tests/browserFeatures.test.ts`, call it after the two timer alerts in `timer alerts reuse the primed audio context`, and change the expected oscillator starts from `2` to `5`:

```ts
await playAttentionAlert(70);
assert.equal(stats.starts, 5);
```

Extend `focus start primes the alert audio path for later completion` so Resume is also covered:

```ts
assert.match(
  focusTimerSource,
  /const resume = useCallback\(\(\) => \{\s*void primeTimerAlertAudio\(\)/,
);
```

Add these source fixtures and test to `tests/uiRedesign.test.ts`, reusing its existing `readWorkspaceFile` helper and `timerSource` fixture:

```ts
const learningCardSource = readWorkspaceFile("components/timer/LearningCard.tsx");
const attentionStatusSource = readWorkspaceFile("components/attention/AttentionStatus.tsx");

test("focus UI activates and reports attention monitoring without a camera preview", () => {
  assert.match(timerSource, /useAttentionMonitor/);
  assert.match(timerSource, /workspaceMode === "focus"/);
  assert.match(timerSource, /focusTimer\.state\.phase === "focus"/);
  assert.match(timerSource, /focusTimer\.state\.status === "running"/);
  assert.match(learningCardSource, /AttentionStatus/);
  assert.match(attentionStatusSource, /Camera starting/);
  assert.match(attentionStatusSource, /Focused/);
  assert.match(attentionStatusSource, /Look back/);
  assert.match(attentionStatusSource, /Camera blocked/);
  assert.match(attentionStatusSource, /Unavailable/);
  assert.doesNotMatch(attentionStatusSource, /<video|<canvas/);
  assert.match(stylesSource, /\.focus-dashboard__attention/);
});
```

- [ ] **Step 2: Run the focused tests and confirm RED**

Run:

```bash
node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON --experimental-strip-types --test tests/browserFeatures.test.ts tests/uiRedesign.test.ts
```

Expected: FAIL because the attention sound, hook, and status component do not exist.

- [ ] **Step 3: Add the distinct Web Audio attention pattern**

Add this function after `playTimerAlert` in `lib/browserFeatures.ts`:

```ts
export function playAttentionAlert(volume: number): void {
  try {
    const context = getTimerAudioContext();
    if (!context || context.state === "closed") return;
    const normalizedVolume = Math.min(1, Math.max(0, volume / 100));
    if (normalizedVolume === 0) return;
    if (context.state !== "running") void context.resume().catch(() => undefined);

    const peak = Math.max(0.02, normalizedVolume * 0.18);
    const startAt = context.currentTime;
    [659.25, 783.99, 659.25].forEach((frequency, index) => {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      const toneStart = startAt + index * 0.16;
      oscillator.type = "triangle";
      oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(0.0001, toneStart);
      gain.gain.exponentialRampToValueAtTime(peak, toneStart + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, toneStart + 0.12);
      oscillator.connect(gain).connect(context.destination);
      oscillator.start(toneStart);
      oscillator.stop(toneStart + 0.15);
    });
  } catch {
    // Attention audio must never affect the timer or camera cleanup.
  }
}
```

- [ ] **Step 4: Add the React orchestration hook**

First replace the one-line `resume` callback in `hooks/useFocusTimer.ts` with:

```ts
const resume = useCallback(() => {
  void primeTimerAlertAudio();
  setState((current) => resumeTimer(current, Date.now()));
}, []);
```

Create `hooks/useAttentionMonitor.ts`:

```ts
"use client";

import { useEffect, useRef, useState } from "react";
import { playAttentionAlert } from "@/lib/browserFeatures";
import { createAttentionMonitor, type AttentionMonitorStatus } from "@/lib/attention/attentionMonitor";
import { openAttentionCamera } from "@/lib/attention/browserCamera";
import { createMediaPipeDetector } from "@/lib/attention/mediaPipeDetector";

export function useAttentionMonitor(active: boolean, volume: number): AttentionMonitorStatus {
  const [runtimeStatus, setRuntimeStatus] = useState<AttentionMonitorStatus>("idle");
  const volumeRef = useRef(volume);
  volumeRef.current = volume;

  useEffect(() => {
    if (!active) return;
    let mounted = true;
    const monitor = createAttentionMonitor({
      openCamera: openAttentionCamera,
      createDetector: createMediaPipeDetector,
      now: () => performance.now(),
      schedule: (callback, delayMs) => window.setTimeout(callback, delayMs),
      cancel: (handle) => window.clearTimeout(handle),
      playAlert: () => playAttentionAlert(volumeRef.current),
      onStatus: (status) => { if (mounted) setRuntimeStatus(status); },
    });
    void monitor.start();
    return () => {
      mounted = false;
      monitor.stop();
    };
  }, [active]);

  return active ? runtimeStatus : "idle";
}
```

- [ ] **Step 5: Add the accessible status badge**

Create `components/attention/AttentionStatus.tsx`:

```tsx
import type { AttentionMonitorStatus } from "@/lib/attention/attentionMonitor";

const labels: Record<Exclude<AttentionMonitorStatus, "idle">, string> = {
  starting: "Camera starting",
  focused: "Focused",
  away: "Look back",
  blocked: "Camera blocked",
  unavailable: "Unavailable",
};

export function AttentionStatus({ status }: { status: AttentionMonitorStatus }) {
  if (status === "idle") return null;
  return (
    <p className="focus-dashboard__attention" data-status={status} role="status" aria-live="polite">
      <span aria-hidden="true" />
      {labels[status]}
    </p>
  );
}
```

- [ ] **Step 6: Activate monitoring only for a running focus interval**

Import `useAttentionMonitor` in `components/YouTubeRestTimer.tsx`. Immediately after `focusTimer` is created, add:

```ts
const attentionActive = workspaceMode === "focus"
  && focusTimer.preferences.attentionMonitoringEnabled
  && focusTimer.state.phase === "focus"
  && focusTimer.state.status === "running";
const attentionStatus = useAttentionMonitor(
  attentionActive,
  focusTimer.preferences.alertVolume,
);
```

Pass this prop to `LearningCard`:

```tsx
attentionStatus={attentionStatus}
```

In `components/timer/LearningCard.tsx`, import `AttentionStatus` and `AttentionMonitorStatus`, add this required prop:

```ts
attentionStatus: AttentionMonitorStatus;
```

Destructure it and render the badge between the context header and timer:

```tsx
<AttentionStatus status={attentionStatus} />
```

- [ ] **Step 7: Style the compact status without adding a preview surface**

Add to `app/globals.css` near the other `.focus-dashboard__*` rules:

```css
.focus-dashboard__attention {
  display: inline-flex;
  width: fit-content;
  align-items: center;
  justify-self: center;
  gap: 0.45rem;
  margin: 0 auto;
  color: var(--manga-paper);
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.focus-dashboard__attention > span {
  width: 0.5rem;
  height: 0.5rem;
  border-radius: 999px;
  background: #e9b44c;
  box-shadow: 0 0 0 3px rgb(233 180 76 / 18%);
}

.focus-dashboard__attention[data-status="focused"] > span {
  background: #57b894;
  box-shadow: 0 0 0 3px rgb(87 184 148 / 18%);
}

.focus-dashboard__attention[data-status="away"],
.focus-dashboard__attention[data-status="blocked"],
.focus-dashboard__attention[data-status="unavailable"] {
  color: #f2a18c;
}

.focus-dashboard__attention[data-status="away"] > span,
.focus-dashboard__attention[data-status="blocked"] > span,
.focus-dashboard__attention[data-status="unavailable"] > span {
  background: var(--manga-vermilion);
  box-shadow: 0 0 0 3px rgb(195 68 45 / 20%);
}
```

- [ ] **Step 8: Run focused tests and checks and confirm GREEN**

Run:

```bash
node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON --experimental-strip-types --test tests/browserFeatures.test.ts tests/uiRedesign.test.ts tests/attentionMonitor.test.ts
npm run typecheck
npm run lint
```

Expected: selected tests pass, TypeScript exits 0, and ESLint exits 0.

- [ ] **Step 9: Commit the end-to-end UI slice**

```bash
git add hooks/useAttentionMonitor.ts hooks/useFocusTimer.ts components/attention/AttentionStatus.tsx lib/browserFeatures.ts tests/browserFeatures.test.ts components/YouTubeRestTimer.tsx components/timer/LearningCard.tsx app/globals.css tests/uiRedesign.test.ts
git commit -m "feat: alert when focus attention drifts"
```

## Task 7: Document and verify the complete feature

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Document the feature and privacy boundary**

Add this bullet under Focus timers:

```md
- Optional on-device attention monitoring uses the camera only during a running focus interval and sounds once after five continuous seconds looking away.
```

Add these bullets under Security and privacy:

```md
- **Attention camera**: Attention monitoring is off by default. When enabled, camera frames and head-pose results stay in the browser and are never recorded, uploaded, or stored.
- **Local model assets**: The MediaPipe runtime and Face Landmarker model are served from this application; no remote inference service receives camera data.
```

- [ ] **Step 2: Run the complete automated verification suite**

Run:

```bash
npm test
npm run typecheck
npm run lint
npm run build
git diff --check
```

Expected: every command exits 0 with no test failures, type errors, lint errors, build errors, or whitespace errors.

- [ ] **Step 3: Verify generated assets are excluded and required assets are included**

Run:

```bash
git status --short
git check-ignore public/mediapipe/wasm/vision_wasm_internal.wasm
git ls-files public/mediapipe/face_landmarker.task public/mediapipe/SOURCES.md
sha256sum public/mediapipe/face_landmarker.task
```

Expected: generated WASM is ignored, the model and source record are tracked, and the model hash is `64184e229b263107bc2b804c6625db1341ff2bb731874b0bcc2fe6544e0bc9ff`.

- [ ] **Step 4: Perform the live browser acceptance flow**

Run the app with its configured Supabase environment:

```bash
npm run dev
```

In a supported browser with a camera:

1. Confirm no camera request occurs while monitoring is off.
2. Enable Attention monitoring in Focus Timer settings.
3. Start a focus interval and grant camera permission.
4. Confirm `Camera starting` changes to `Focused` when facing the laptop.
5. Look away for under five seconds and confirm silence.
6. Look away for at least five seconds and confirm one attention pattern.
7. Stay away and confirm the sound does not repeat.
8. Refocus, look away for five seconds, and confirm it sounds again.
9. Pause, reset, enter a break, leave Focus mode, and disable monitoring; confirm the browser camera indicator turns off in every case.
10. Deny camera permission and confirm `Camera blocked` appears while the timer continues.

If authentication, camera hardware, or browser permission state prevents this live check, record that exact external gate separately; do not describe the browser acceptance flow as verified.

- [ ] **Step 5: Commit documentation and any verification-only corrections**

```bash
git add README.md
git commit -m "docs: explain attention monitoring privacy"
```

- [ ] **Step 6: Inspect the final branch state**

Run:

```bash
git status --short --branch
git log --oneline --decorate -8
```

Expected: the worktree is clean and the recent commits show the preference, domain, local assets, adapters, lifecycle, UI, and documentation slices.
