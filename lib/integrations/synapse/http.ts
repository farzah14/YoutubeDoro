import { constantTimeEqual, hashCredential } from "./crypto";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { getSynapseClientConfig } from "./config";
import { SYNAPSE_CONSENT_VERSION } from "./scope";

export type IntegrationPrincipal = {
  grantId: string;
  userId: string;
  scope: string;
};

export type ProviderErrorCode = "unauthorized" | "forbidden" | "rate_limited" | "configuration" | "storage";

export class IntegrationError extends Error {
  constructor(public readonly code: ProviderErrorCode, public readonly retryAfter?: number) {
    super(code);
    this.name = "IntegrationError";
  }
}

export function errorResponse(error: IntegrationError): Response {
  const status = error.code === "unauthorized" ? 401
    : error.code === "forbidden" ? 403
      : error.code === "rate_limited" ? 429
        : error.code === "configuration" ? 503 : 500;
  const headers = new Headers({ "content-type": "application/json", "cache-control": "private, no-store" });
  if (error.retryAfter) headers.set("retry-after", String(error.retryAfter));
  return Response.json({ error: error.code }, { status, headers });
}

export async function authenticateIntegration(request: Request, requiredScope = "sessions:read"): Promise<IntegrationPrincipal> {
  const match = /^Bearer\s+([A-Za-z0-9_-]{32,128})$/i.exec(request.headers.get("authorization") ?? "");
  if (!match) throw new IntegrationError("unauthorized");
  const config = getSynapseClientConfig();
  const admin = getSupabaseAdminClient();
  if (!config || !admin) throw new IntegrationError("configuration");
  const tokenHash = await hashCredential(match[1]);
  const now = new Date().toISOString();
  const { data, error } = await admin.from("integration_tokens")
    .select("grant_id, integration_grants!inner(user_id, client_id, scope, revoked_at, consent_version)")
    .eq("token_hash", tokenHash)
    .eq("kind", "access")
    .is("consumed_at", null)
    .gt("expires_at", now)
    .eq("integration_grants.client_id", config.clientId)
    .is("integration_grants.revoked_at", null)
    .maybeSingle();
  if (error) throw new IntegrationError("storage");
  const grant = data?.integration_grants as unknown as { user_id?: unknown; scope?: unknown; consent_version?: unknown } | null;
  if (!data || typeof grant?.user_id !== "string" || typeof grant.scope !== "string") {
    throw new IntegrationError("unauthorized");
  }
  if (grant.consent_version !== SYNAPSE_CONSENT_VERSION) throw new IntegrationError("unauthorized");
  if (!grant.scope.split(/\s+/).includes(requiredScope)) throw new IntegrationError("forbidden");

  const bucket = new Date();
  bucket.setUTCSeconds(0, 0);
  const { data: requestCount, error: limitError } = await admin.rpc("consume_synapse_request", {
    p_grant_id: data.grant_id,
    p_client_id: config.clientId,
    p_minute_bucket: bucket.toISOString(),
  });
  if (limitError) throw new IntegrationError("storage");
  if (Number(requestCount) < 0) throw new IntegrationError("unauthorized");
  if (Number(requestCount) > 120) {
    throw new IntegrationError("rate_limited", 60 - new Date().getUTCSeconds());
  }
  return { grantId: data.grant_id, userId: grant.user_id, scope: grant.scope };
}

export async function runHousekeeping(): Promise<void> {
  const admin = getSupabaseAdminClient();
  if (!admin) return;
  try {
    await admin.rpc("cleanup_synapse_integration");
  } catch {
    // Housekeeping never blocks a session read.
  }
}

export async function validateClientCredentials(request: Request): Promise<{ clientId: string; redirectUri: string } | null> {
  const config = getSynapseClientConfig();
  if (!config) throw new IntegrationError("configuration");
  const header = request.headers.get("authorization") ?? "";
  if (!header.startsWith("Basic ")) return null;
  let decoded: string;
  try {
    decoded = Buffer.from(header.slice(6), "base64").toString("utf8");
  } catch {
    return null;
  }
  const separator = decoded.indexOf(":");
  if (separator < 1) return null;
  const clientId = decoded.slice(0, separator);
  const secret = decoded.slice(separator + 1);
  const secretHash = await hashCredential(secret);
  if (clientId !== config.clientId || !constantTimeEqual(secretHash, config.clientSecretHash)) return null;
  return { clientId: config.clientId, redirectUri: config.redirectUri };
}
