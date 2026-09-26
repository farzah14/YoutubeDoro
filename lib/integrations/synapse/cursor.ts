import { getCursorSigningKey } from "./config";

type CursorPayload = { userId: string; lastId: string; watermark: number };
const encoder = new TextEncoder();
const decoder = new TextDecoder();

function encode(bytes: Uint8Array) {
  return Buffer.from(bytes).toString("base64url");
}

function asArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}

async function signingKey() {
  const secret = getCursorSigningKey();
  if (!secret) throw new Error("Integration cursor signing is not configured.");
  return crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]);
}

export async function signSessionCursor(payload: CursorPayload): Promise<string> {
  const body = encode(encoder.encode(JSON.stringify(payload)));
  const signature = await crypto.subtle.sign("HMAC", await signingKey(), encoder.encode(body));
  return `${body}.${encode(new Uint8Array(signature))}`;
}

export async function readSessionCursor(value: string, userId: string): Promise<CursorPayload | null> {
  if (value.length > 2048) return null;
  const [body, encodedSignature, ...rest] = value.split(".");
  if (!body || !encodedSignature || rest.length > 0) return null;
  let signature: Uint8Array;
  let parsed: unknown;
  try {
    signature = Buffer.from(encodedSignature, "base64url");
    parsed = JSON.parse(decoder.decode(Buffer.from(body, "base64url")));
  } catch {
    return null;
  }
  if (!await crypto.subtle.verify("HMAC", await signingKey(), asArrayBuffer(signature), asArrayBuffer(encoder.encode(body)))) return null;
  if (!parsed || typeof parsed !== "object") return null;
  const cursor = parsed as Partial<CursorPayload>;
  if (cursor.userId !== userId || typeof cursor.lastId !== "string" || !Number.isSafeInteger(cursor.watermark) || Number(cursor.watermark) < 0) return null;
  return cursor as CursorPayload;
}
