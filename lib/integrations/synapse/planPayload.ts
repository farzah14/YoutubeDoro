export const MAX_PLAN_PAYLOAD_BYTES = 524_288;

export type PlanRequestBodyResult =
  | { kind: "too_large" }
  | { kind: "invalid_request" }
  | { kind: "parsed"; value: unknown };

export async function parsePlanRequestBody(request: Request): Promise<PlanRequestBodyResult> {
  let bytes: ArrayBuffer;
  try {
    bytes = await request.arrayBuffer();
  } catch {
    return { kind: "invalid_request" };
  }
  if (bytes.byteLength > MAX_PLAN_PAYLOAD_BYTES) return { kind: "too_large" };

  let raw: string;
  try {
    raw = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    return { kind: "invalid_request" };
  }
  try {
    return { kind: "parsed", value: JSON.parse(raw) as unknown };
  } catch {
    return { kind: "invalid_request" };
  }
}
