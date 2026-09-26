import { timingSafeEqual } from "node:crypto";

const encoder = new TextEncoder();

function base64Url(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString("base64url");
}

export function createOpaqueCredential(): string {
  return base64Url(crypto.getRandomValues(new Uint8Array(32)));
}

export async function hashCredential(value: string): Promise<string> {
  return base64Url(new Uint8Array(await crypto.subtle.digest("SHA-256", encoder.encode(value))));
}

export async function createCodeChallenge(verifier: string): Promise<string> {
  return hashCredential(verifier);
}

export function constantTimeEqual(left: string, right: string): boolean {
  const leftBytes = Buffer.from(left);
  const rightBytes = Buffer.from(right);
  if (leftBytes.length !== rightBytes.length) return false;
  return timingSafeEqual(leftBytes, rightBytes);
}

export function authorizationCodeChallengeMatches(verifier: string, challenge: string): Promise<boolean> {
  return createCodeChallenge(verifier).then((actual) => constantTimeEqual(actual, challenge));
}
