export type MatrixTransform = {
  rows: number;
  columns: number;
  data: number[];
};

export type HeadPose = {
  yawDeg: number;
  pitchDeg: number;
};

function isValidTransform(transform: unknown): transform is MatrixTransform {
  return (
    !!transform &&
    typeof transform === "object" &&
    (() => {
      const candidate = transform as {
        rows?: unknown;
        columns?: unknown;
        data?: unknown;
      };
      return (
        candidate.rows === 4 &&
        candidate.columns === 4 &&
        Array.isArray(candidate.data) &&
        candidate.data.length === 16 &&
        candidate.data.every(Number.isFinite)
      );
    })()
  );
}

export function extractHeadPose(transform: unknown): HeadPose | null {
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
  transform: unknown,
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
