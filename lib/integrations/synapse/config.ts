export type SynapseClientConfig = {
  clientId: string;
  clientSecretHash: string;
  redirectUri: string;
};

export function getSynapseClientConfig(): SynapseClientConfig | null {
  const clientId = process.env.SYNAPSE_CLIENT_ID;
  const clientSecretHash = process.env.SYNAPSE_CLIENT_SECRET_HASH;
  const redirectUri = process.env.SYNAPSE_REDIRECT_URI;
  if (!clientId || !clientSecretHash || !/^[A-Za-z0-9_-]{43}$/.test(clientSecretHash) || !redirectUri) return null;
  try {
    const callback = new URL(redirectUri);
    if (callback.protocol !== "https:" && callback.hostname !== "localhost" && callback.hostname !== "127.0.0.1") return null;
    if (callback.pathname !== "/api/studyrythms/callback" || callback.search || callback.hash || callback.username || callback.password) return null;
  } catch {
    return null;
  }
  return { clientId, clientSecretHash, redirectUri };
}

export function getCursorSigningKey(): string | null {
  const key = process.env.INTEGRATION_CURSOR_KEY;
  return key && key.length >= 32 ? key : null;
}

export function getStudyRythmsSiteUrl(): string {
  return process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
}
