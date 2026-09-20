export interface GoogleIdentityCandidate {
  app_metadata?: {
    provider?: unknown;
    providers?: unknown;
  };
}

export function hasGoogleIdentity(
  user: GoogleIdentityCandidate | null | undefined,
): boolean {
  if (user?.app_metadata?.provider === "google") return true;
  const providers = user?.app_metadata?.providers;
  return Array.isArray(providers) && providers.includes("google");
}
