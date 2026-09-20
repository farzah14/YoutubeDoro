import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { observationFromFaceResult } from "../lib/attention/mediaPipeDetector.ts";

const cameraSource = readFileSync(
  fileURLToPath(new URL("../lib/attention/browserCamera.ts", import.meta.url)),
  "utf8",
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
