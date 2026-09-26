import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { authorizationCodeChallengeMatches, createOpaqueCredential, hashCredential } from "./crypto";
import { getSynapseClientConfig } from "./config";
import { SYNAPSE_SCOPE } from "./scope";

export const ACCESS_TOKEN_SECONDS = 60 * 60;
export const REFRESH_TOKEN_SECONDS = 30 * 24 * 60 * 60;

export type IssuedTokenSet = {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: "Bearer";
  scope: typeof SYNAPSE_SCOPE;
  user_id: string;
};

function expiry(seconds: number) {
  return new Date(Date.now() + seconds * 1000).toISOString();
}

export async function createGrantAndCode(input: {
  userId: string;
  codeChallenge: string;
}): Promise<string> {
  const config = getSynapseClientConfig();
  const admin = getSupabaseAdminClient();
  if (!config || !admin) throw new Error("Synapse integration is not configured.");

  const code = createOpaqueCredential();
  const { data, error } = await admin.rpc("create_synapse_grant_v3", {
    p_user_id: input.userId,
    p_client_id: config.clientId,
    p_code_hash: await hashCredential(code),
    p_redirect_uri: config.redirectUri,
    p_code_challenge: input.codeChallenge,
    p_expires_at: expiry(10 * 60),
  });
  if (error || typeof data !== "string") throw new Error("Could not create the StudyRythms approval.");
  return code;
}

export async function exchangeAuthorizationCode(input: {
  code: string;
  codeVerifier: string;
}): Promise<IssuedTokenSet | null> {
  const config = getSynapseClientConfig();
  const admin = getSupabaseAdminClient();
  if (!config || !admin) throw new Error("Synapse integration is not configured.");

  const codeHash = await hashCredential(input.code);
  const { data: pendingCode, error: readError } = await admin.from("integration_auth_codes")
    .select("code_challenge, redirect_uri, client_id, expires_at, consumed_at, integration_grants!inner(revoked_at)")
    .eq("code_hash", codeHash)
    .maybeSingle();
  const grant = pendingCode?.integration_grants as unknown as { revoked_at?: string | null } | null;
  if (readError) throw new Error("Could not read the StudyRythms authorization code.");
  if (!pendingCode || pendingCode.client_id !== config.clientId || pendingCode.redirect_uri !== config.redirectUri || pendingCode.consumed_at || Date.parse(pendingCode.expires_at) <= Date.now() || grant?.revoked_at) return null;
  if (!await authorizationCodeChallengeMatches(input.codeVerifier, pendingCode.code_challenge)) return null;

  const accessToken = createOpaqueCredential();
  const refreshToken = createOpaqueCredential();
  const accessExpiry = expiry(ACCESS_TOKEN_SECONDS);
  const refreshExpiry = expiry(REFRESH_TOKEN_SECONDS);
  const { data, error } = await admin.rpc("exchange_synapse_code", {
    p_code_hash: codeHash,
    p_client_id: config.clientId,
    p_redirect_uri: config.redirectUri,
    p_access_hash: await hashCredential(accessToken),
    p_refresh_hash: await hashCredential(refreshToken),
    p_access_expiry: accessExpiry,
    p_refresh_expiry: refreshExpiry,
  });
  if (error) throw new Error("Could not exchange the StudyRythms authorization code.");
  const row = Array.isArray(data) ? data[0] as { owner_id?: unknown } | undefined : undefined;
  if (typeof row?.owner_id !== "string") return null;
  return {
    access_token: accessToken,
    refresh_token: refreshToken,
    expires_in: ACCESS_TOKEN_SECONDS,
    token_type: "Bearer",
    scope: SYNAPSE_SCOPE,
    user_id: row.owner_id,
  };
}

export async function rotateRefreshToken(input: {
  refreshHash: string;
}): Promise<IssuedTokenSet | null> {
  const config = getSynapseClientConfig();
  const admin = getSupabaseAdminClient();
  if (!config || !admin) throw new Error("Synapse integration is not configured.");

  const accessToken = createOpaqueCredential();
  const refreshToken = createOpaqueCredential();
  const { data, error } = await admin.rpc("rotate_synapse_refresh", {
    p_refresh_hash: input.refreshHash,
    p_client_id: config.clientId,
    p_access_hash: await hashCredential(accessToken),
    p_next_refresh_hash: await hashCredential(refreshToken),
    p_access_expiry: expiry(ACCESS_TOKEN_SECONDS),
    p_refresh_expiry: expiry(REFRESH_TOKEN_SECONDS),
  });
  if (error) throw new Error("Could not refresh the StudyRythms connection.");
  const row = Array.isArray(data) ? data[0] as { owner_id?: unknown } | undefined : undefined;
  if (typeof row?.owner_id !== "string") return null;
  return {
    access_token: accessToken,
    refresh_token: refreshToken,
    expires_in: ACCESS_TOKEN_SECONDS,
    token_type: "Bearer",
    scope: SYNAPSE_SCOPE,
    user_id: row.owner_id,
  };
}

export async function revokeGrant(grantId: string, clientId: string): Promise<boolean> {
  const admin = getSupabaseAdminClient();
  if (!admin) throw new Error("StudyRythms integration storage is not configured.");
  const { data, error } = await admin.rpc("revoke_synapse_grant", {
    p_grant_id: grantId,
    p_client_id: clientId,
  });
  if (error) throw new Error("Could not revoke the Synapse connection.");
  return data === true;
}

export async function listActiveGrants(userId: string) {
  const config = getSynapseClientConfig();
  const admin = getSupabaseAdminClient();
  if (!config || !admin) throw new Error("Synapse integration is not configured.");
  const { data, error } = await admin.from("integration_grants")
    .select("id, scope, created_at")
    .eq("user_id", userId)
    .eq("client_id", config.clientId)
    .is("revoked_at", null)
    .order("created_at", { ascending: false });
  if (error) throw new Error("Could not read connected applications.");
  return data ?? [];
}

export async function revokeOwnedGrant(userId: string, grantId: string) {
  const config = getSynapseClientConfig();
  const admin = getSupabaseAdminClient();
  if (!config || !admin) throw new Error("Synapse integration is not configured.");
  const { data, error } = await admin.from("integration_grants")
    .select("id")
    .eq("id", grantId)
    .eq("user_id", userId)
    .eq("client_id", config.clientId)
    .is("revoked_at", null)
    .maybeSingle();
  if (error || !data) return false;
  return revokeGrant(grantId, config.clientId);
}

export async function revokeRefreshCredential(refreshToken: string, clientId: string): Promise<boolean> {
  const admin = getSupabaseAdminClient();
  if (!admin) throw new Error("StudyRythms integration storage is not configured.");
  const { data, error } = await admin.from("integration_tokens")
    .select("grant_id, integration_grants!inner(client_id, revoked_at)")
    .eq("token_hash", await hashCredential(refreshToken))
    .eq("kind", "refresh")
    .is("consumed_at", null)
    .gt("expires_at", new Date().toISOString())
    .eq("integration_grants.client_id", clientId)
    .is("integration_grants.revoked_at", null)
    .maybeSingle();
  if (error) throw new Error("Could not read the Synapse refresh token.");
  if (!data) return false;
  return revokeGrant(data.grant_id, clientId);
}
