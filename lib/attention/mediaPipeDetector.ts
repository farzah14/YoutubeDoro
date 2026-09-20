import type { AttentionObservation } from "./attentionEngine";
import { ATTENTION_CONFIG } from "./config";
import { classifyHeadTransform, type MatrixTransform } from "./headPose";

const MEDIAPIPE_XNNPACK_INFO = "INFO: Created TensorFlow Lite XNNPACK delegate for CPU.";

export type FaceResultLike = {
  facialTransformationMatrixes: MatrixTransform[];
};

export type AttentionDetector = {
  observe(frame: HTMLVideoElement, timestampMs: number): AttentionObservation;
  close(): void;
};

function suppressMediaPipeConsoleNoise(): () => void {
  const originalError = console.error;
  const filteredError: typeof console.error = (...args) => {
    if (args.some((arg) => typeof arg === "string" && arg.includes(MEDIAPIPE_XNNPACK_INFO))) {
      return;
    }
    originalError(...args);
  };

  console.error = filteredError;
  return () => {
    if (console.error === filteredError) {
      console.error = originalError;
    }
  };
}

export function withMediaPipeConsoleNoiseSuppressed<T>(operation: () => T): T {
  const restore = suppressMediaPipeConsoleNoise();
  try {
    return operation();
  } finally {
    restore();
  }
}

export function observationFromFaceResult(result: FaceResultLike): AttentionObservation {
  return classifyHeadTransform(
    result.facialTransformationMatrixes[0] ?? null,
    ATTENTION_CONFIG.yawThresholdDeg,
    ATTENTION_CONFIG.pitchThresholdDeg,
  );
}

export async function createMediaPipeDetector(): Promise<AttentionDetector> {
  const restoreConsoleNoise = suppressMediaPipeConsoleNoise();

  try {
    const { FaceLandmarker, FilesetResolver } = await import("@mediapipe/tasks-vision");
    const fileset = await FilesetResolver.forVisionTasks(ATTENTION_CONFIG.wasmPath);
    const landmarker = await FaceLandmarker.createFromOptions(fileset, {
      baseOptions: { modelAssetPath: ATTENTION_CONFIG.modelPath },
      runningMode: "VIDEO",
      numFaces: 1,
      outputFaceBlendshapes: false,
      outputFacialTransformationMatrixes: true,
    });

    return {
      observe(frame, timestampMs) {
        return observationFromFaceResult(landmarker.detectForVideo(frame, timestampMs));
      },
      close() {
        try {
          landmarker.close();
        } finally {
          restoreConsoleNoise();
        }
      },
    };
  } catch (error) {
    restoreConsoleNoise();
    throw error;
  }
}
