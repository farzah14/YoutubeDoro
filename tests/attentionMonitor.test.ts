import assert from "node:assert/strict";
import test from "node:test";
import { createAttentionMonitor } from "../lib/attention/attentionMonitor.ts";
import type { AttentionObservation } from "../lib/attention/attentionEngine.ts";

function harness(observations: AttentionObservation[]) {
  let nowMs = 0;
  let scheduled: (() => void) | null = null;
  let scheduledHandle: number | null = null;
  let nextHandle = 0;
  const stats = {
    alerts: 0,
    cameraStops: 0,
    detectorCloses: 0,
    cancelled: 0,
  };
  const statuses: string[] = [];
  const camera = {
    frame: {} as HTMLVideoElement,
    stop: () => {
      stats.cameraStops += 1;
    },
  };
  const detector = {
    observe: () => observations.shift() ?? "focused",
    close: () => {
      stats.detectorCloses += 1;
    },
  };
  const monitor = createAttentionMonitor({
    openCamera: async () => camera,
    createDetector: async () => detector,
    now: () => nowMs,
    schedule: (callback) => {
      const handle = ++nextHandle;
      scheduled = callback;
      scheduledHandle = handle;
      return handle;
    },
    cancel: (handle) => {
      stats.cancelled += 1;
      if (scheduledHandle === handle) {
        scheduled = null;
        scheduledHandle = null;
      }
    },
    playAlert: () => {
      stats.alerts += 1;
    },
    onStatus: (status) => statuses.push(status),
  });

  return {
    monitor,
    stats,
    statuses,
    setNow: (value: number) => {
      nowMs = value;
    },
    runScheduled: () => {
      const callback = scheduled;
      scheduled = null;
      scheduledHandle = null;
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

test("stop cancels sampling and releases camera and detector idempotently", async () => {
  const run = harness(["focused"]);
  await run.monitor.start();
  run.monitor.stop();
  run.monitor.stop();

  assert.equal(run.stats.cameraStops, 1);
  assert.equal(run.stats.detectorCloses, 1);
  assert.equal(run.stats.cancelled, 1);
  assert.equal(run.statuses.at(-1), "idle");
});

test("permission denial reports blocked without starting the detector", async () => {
  const statuses: string[] = [];
  const denied = Object.assign(new Error("denied"), { name: "NotAllowedError" });
  let detectorStarted = false;
  const monitor = createAttentionMonitor({
    openCamera: async () => {
      throw denied;
    },
    createDetector: async () => {
      detectorStarted = true;
      throw new Error("must not run");
    },
    now: () => 0,
    schedule: () => 1,
    cancel: () => undefined,
    playAlert: () => undefined,
    onStatus: (status) => statuses.push(status),
  });

  await monitor.start();
  assert.equal(detectorStarted, false);
  assert.equal(statuses.at(-1), "blocked");
});

test("detector startup failure releases an acquired camera", async () => {
  let stopped = 0;
  const statuses: string[] = [];
  const monitor = createAttentionMonitor({
    openCamera: async () => ({
      frame: {} as HTMLVideoElement,
      stop: () => {
        stopped += 1;
      },
    }),
    createDetector: async () => {
      throw new Error("model failed");
    },
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

test("stopping while camera startup is pending releases the stale camera without changing status", async () => {
  let resolveCamera!: (camera: { frame: HTMLVideoElement; stop(): void }) => void;
  let stopped = 0;
  const statuses: string[] = [];
  const cameraPromise = new Promise<{ frame: HTMLVideoElement; stop(): void }>((resolve) => {
    resolveCamera = resolve;
  });
  const monitor = createAttentionMonitor({
    openCamera: () => cameraPromise,
    createDetector: async () => {
      throw new Error("stale startup must not create a detector");
    },
    now: () => 0,
    schedule: () => 1,
    cancel: () => undefined,
    playAlert: () => undefined,
    onStatus: (status) => statuses.push(status),
  });

  const startPromise = monitor.start();
  monitor.stop();
  resolveCamera({
    frame: {} as HTMLVideoElement,
    stop: () => {
      stopped += 1;
    },
  });
  await startPromise;

  assert.equal(stopped, 1);
  assert.equal(statuses.at(-1), "idle");
  assert.equal(statuses.includes("unavailable"), false);
});

test("stopping while detector startup is pending releases stale resources", async () => {
  let resolveDetector!: (detector: { observe(): AttentionObservation; close(): void }) => void;
  let cameraStops = 0;
  let detectorCloses = 0;
  const detectorPromise = new Promise<{ observe(): AttentionObservation; close(): void }>((resolve) => {
    resolveDetector = resolve;
  });
  const monitor = createAttentionMonitor({
    openCamera: async () => ({
      frame: {} as HTMLVideoElement,
      stop: () => {
        cameraStops += 1;
      },
    }),
    createDetector: () => detectorPromise,
    now: () => 0,
    schedule: () => 1,
    cancel: () => undefined,
    playAlert: () => undefined,
    onStatus: () => undefined,
  });

  const startPromise = monitor.start();
  await Promise.resolve();
  monitor.stop();
  resolveDetector({
    observe: () => "focused",
    close: () => {
      detectorCloses += 1;
    },
  });
  await startPromise;

  assert.equal(cameraStops, 1);
  assert.equal(detectorCloses, 1);
});

test("sampling failure releases resources and reports unavailable", async () => {
  const detectorError = new Error("camera frame failed");
  let stopped = 0;
  const statuses: string[] = [];
  let scheduled: (() => void) | null = null;
  const monitor = createAttentionMonitor({
    openCamera: async () => ({
      frame: {} as HTMLVideoElement,
      stop: () => {
        stopped += 1;
      },
    }),
    createDetector: async () => ({
      observe: () => {
        throw detectorError;
      },
      close: () => undefined,
    }),
    now: () => 0,
    schedule: (callback) => {
      scheduled = callback;
      return 1;
    },
    cancel: () => {
      scheduled = null;
    },
    playAlert: () => undefined,
    onStatus: (status) => statuses.push(status),
  });

  await monitor.start();
  assert.equal(stopped, 1);
  assert.equal(scheduled, null);
  assert.equal(statuses.at(-1), "unavailable");
});
