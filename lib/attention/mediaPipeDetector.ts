import type { AttentionObservation } from "./attentionEngine";
import { ATTENTION_CONFIG } from "./config";
import { classifyHeadTransform, type MatrixTransform } from "./headPose";

export type FaceResultLike = {
  facialTransformationMatrixes: MatrixTransform[];
};

export type AttentionDetector = {
  observe(frame: HTMLVideoElement, timestampMs: number): AttentionObservation;
  close(): void;
};

export function observationFromFaceResult(result: FaceResultLike): AttentionObservation {
  return classifyHeadTransform(
    result.facialTransformationMatrixes[0] ?? null,
    ATTENTION_CONFIG.yawThresholdDeg,
    ATTENTION_CONFIG.pitchThresholdDeg,
  );
}

export async function createMediaPipeDetector(): Promise<AttentionDetector> {
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
      landmarker.close();
    },
  };
}
