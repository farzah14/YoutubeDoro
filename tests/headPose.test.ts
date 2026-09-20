import assert from "node:assert/strict";
import test from "node:test";

import {
  classifyHeadTransform,
  extractHeadPose,
  type MatrixTransform,
} from "../lib/attention/headPose";

function transformFor(yawDeg: number, pitchDeg: number): MatrixTransform {
  const yaw = (yawDeg * Math.PI) / 180;
  const pitch = (pitchDeg * Math.PI) / 180;
  const cy = Math.cos(yaw);
  const sy = Math.sin(yaw);
  const cp = Math.cos(pitch);
  const sp = Math.sin(pitch);

  return {
    rows: 4,
    columns: 4,
    data: [
      cy,
      sy * sp,
      sy * cp,
      0,
      0,
      cp,
      -sp,
      0,
      -sy,
      cy * sp,
      cy * cp,
      0,
      0,
      0,
      0,
      1,
    ],
  };
}

test("extracts a representative forward pose", () => {
  const pose = extractHeadPose(transformFor(0, 0));

  assert.ok(pose);
  assert.ok(Math.abs(pose.yawDeg) < 1e-10);
  assert.ok(Math.abs(pose.pitchDeg) < 1e-10);
});

test("classifies representative forward, yaw, and pitch poses", () => {
  assert.equal(classifyHeadTransform(transformFor(24, 19), 25, 20), "focused");
  assert.equal(classifyHeadTransform(transformFor(26, -26), 25, 20), "away");
  assert.equal(classifyHeadTransform(transformFor(0, 21), 25, 20), "away");
  assert.equal(classifyHeadTransform(null, 25, 20), "away");
});

test("rejects malformed and non-finite transforms as away", () => {
  const valid = transformFor(0, 0);

  assert.equal(
    classifyHeadTransform({ ...valid, rows: 3 }, 25, 20),
    "away",
  );
  assert.equal(
    classifyHeadTransform({ ...valid, data: valid.data.slice(0, 15) }, 25, 20),
    "away",
  );
  assert.equal(
    classifyHeadTransform(
      { ...valid, data: valid.data.map((value, index) => (index === 8 ? Number.NaN : value)) },
      25,
      20,
    ),
    "away",
  );
  assert.equal(
    classifyHeadTransform(
      { rows: 4, columns: 4, data: null as unknown as number[] },
      25,
      20,
    ),
    "away",
  );
  assert.equal(
    classifyHeadTransform(undefined as unknown as MatrixTransform, 25, 20),
    "away",
  );
  assert.equal(
    classifyHeadTransform("invalid" as unknown as MatrixTransform, 25, 20),
    "away",
  );
  assert.equal(extractHeadPose(null), null);
});
