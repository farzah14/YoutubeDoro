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
