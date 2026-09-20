export type MatrixTransform = {
  rows: number;
  columns: number;
  data: number[];
};

export type HeadPose = {
  yawDeg: number;
  pitchDeg: number;
};

function isValidTransform(transform: MatrixTransform | null): transform is MatrixTransform {
  return (
    transform !== null &&
    transform.rows === 4 &&
    transform.columns === 4 &&
    transform.data.length === 16 &&
    transform.data.every(Number.isFinite)
  );
}

export function extractHeadPose(transform: MatrixTransform | null): HeadPose | null {
  if (!isValidTransform(transform)) {
    return null;
  }

  const { data } = transform;
  const yaw = Math.atan2(-data[8], Math.hypot(data[0], data[4]));
  const pitch = Math.atan2(data[9], data[10]);
  const radiansToDegrees = 180 / Math.PI;

  return { yawDeg: yaw * radiansToDegrees, pitchDeg: pitch * radiansToDegrees };
}

export function classifyHeadTransform(
  transform: MatrixTransform | null,
  yawThresholdDeg: number,
  pitchThresholdDeg: number,
): "focused" | "away" {
  const pose = extractHeadPose(transform);
  if (pose === null) {
    return "away";
  }

  return Math.abs(pose.yawDeg) > yawThresholdDeg || Math.abs(pose.pitchDeg) > pitchThresholdDeg
    ? "away"
    : "focused";
}
