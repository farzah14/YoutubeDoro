import {
  advanceAttention,
  createAttentionState,
  type AttentionState,
} from "./attentionEngine";
import { ATTENTION_CONFIG } from "./config";
import type { AttentionCamera } from "./browserCamera";
import type { AttentionDetector } from "./mediaPipeDetector";

export type AttentionMonitorStatus =
  | "idle"
  | "starting"
  | "focused"
  | "away"
  | "blocked"
  | "unavailable";

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

type MonitorRun = {
  generation: number;
  camera: AttentionCamera | null;
  detector: AttentionDetector | null;
  scheduled: ScheduleHandle | null;
  episode: AttentionState;
  released: boolean;
};

function startupErrorStatus(error: unknown): Exclude<AttentionMonitorStatus, "idle" | "starting" | "focused" | "away"> {
  const name = typeof error === "object" && error !== null && "name" in error
    ? String((error as { name: unknown }).name)
    : "";
  return name === "NotAllowedError" || name === "SecurityError" ? "blocked" : "unavailable";
}

function safeCall(callback: () => void): void {
  try {
    callback();
  } catch {
    // Releasing one browser resource must not prevent the remaining resources
    // from being released.
  }
}

export function createAttentionMonitor(
  dependencies: AttentionMonitorDependencies,
): AttentionMonitor {
  let generation = 0;
  let activeRun: MonitorRun | null = null;

  const emitStatus = (status: AttentionMonitorStatus): void => {
    safeCall(() => dependencies.onStatus(status));
  };

  const releaseRun = (run: MonitorRun): void => {
    if (run.released) return;
    run.released = true;

    const scheduled = run.scheduled;
    const detector = run.detector;
    const camera = run.camera;
    run.scheduled = null;
    run.detector = null;
    run.camera = null;
    run.episode = createAttentionState();

    if (scheduled !== null) {
      safeCall(() => dependencies.cancel(scheduled));
    }
    if (detector !== null) {
      safeCall(() => detector.close());
    }
    if (camera !== null) {
      safeCall(() => camera.stop());
    }
  };

  const isCurrent = (run: MonitorRun): boolean => (
    activeRun === run && run.generation === generation && !run.released
  );

  const failCurrentRun = (run: MonitorRun): void => {
    if (!isCurrent(run)) return;
    activeRun = null;
    releaseRun(run);
    emitStatus("unavailable");
  };

  const sample = (run: MonitorRun): void => {
    if (!isCurrent(run) || run.camera === null || run.detector === null) return;

    try {
      const timestampMs = dependencies.now();
      const observation = run.detector.observe(run.camera.frame, timestampMs);
      const transition = advanceAttention(
        run.episode,
        observation,
        timestampMs,
        ATTENTION_CONFIG.awayDurationMs,
      );
      run.episode = transition.state;
      emitStatus(observation === "focused" ? "focused" : "away");

      if (transition.shouldAlert) {
        safeCall(dependencies.playAlert);
      }

      if (!isCurrent(run)) return;
      run.scheduled = dependencies.schedule(() => {
        run.scheduled = null;
        sample(run);
      }, ATTENTION_CONFIG.sampleIntervalMs);
    } catch {
      failCurrentRun(run);
    }
  };

  const stop = (): void => {
    generation += 1;
    const run = activeRun;
    activeRun = null;
    if (run !== null) {
      releaseRun(run);
    }
    emitStatus("idle");
  };

  const start = async (): Promise<void> => {
    stop();
    const run: MonitorRun = {
      generation,
      camera: null,
      detector: null,
      scheduled: null,
      episode: createAttentionState(),
      released: false,
    };
    activeRun = run;
    emitStatus("starting");

    let pendingCamera: AttentionCamera | null = null;
    let pendingDetector: AttentionDetector | null = null;

    try {
      pendingCamera = await dependencies.openCamera();
      if (!isCurrent(run)) {
        safeCall(() => pendingCamera?.stop());
        pendingCamera = null;
        return;
      }
      run.camera = pendingCamera;
      pendingCamera = null;

      pendingDetector = await dependencies.createDetector();
      if (!isCurrent(run)) {
        safeCall(() => pendingDetector?.close());
        pendingDetector = null;
        releaseRun(run);
        return;
      }
      run.detector = pendingDetector;
      pendingDetector = null;

      sample(run);
    } catch (error) {
      safeCall(() => pendingDetector?.close());
      safeCall(() => pendingCamera?.stop());
      pendingDetector = null;
      pendingCamera = null;

      if (!isCurrent(run)) {
        releaseRun(run);
        return;
      }

      activeRun = null;
      releaseRun(run);
      emitStatus(startupErrorStatus(error));
    }
  };

  return { start, stop };
}
