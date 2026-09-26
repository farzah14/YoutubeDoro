import { NextResponse } from "next/server";

import { exchangeAuthorizationCode, rotateRefreshToken } from "@/lib/integrations/synapse/grants";
import { hashCredential } from "@/lib/integrations/synapse/crypto";
import { IntegrationError, errorResponse, validateClientCredentials } from "@/lib/integrations/synapse/http";

const privateHeaders = { "cache-control": "private, no-store", "content-type": "application/json" };

function oauthError(error: string, status: number) {
  return NextResponse.json({ error }, { status, headers: privateHeaders });
}

export async function POST(request: Request) {
  if (Number(request.headers.get("content-length") ?? 0) > 10_000) return oauthError("invalid_request", 400);
  let client: Awaited<ReturnType<typeof validateClientCredentials>>;
  try {
    client = await validateClientCredentials(request);
  } catch (error) {
    if (error instanceof IntegrationError) return errorResponse(error);
    return oauthError("server_error", 503);
  }
  if (!client) return oauthError("invalid_client", 401);
  let form: URLSearchParams;
  try {
    const body = await request.text();
    if (body.length > 10_000) return oauthError("invalid_request", 400);
    form = new URLSearchParams(body);
  } catch {
    return oauthError("invalid_request", 400);
  }

  try {
    if (form.get("grant_type") === "authorization_code") {
      const code = form.get("code") ?? "";
      const verifier = form.get("code_verifier") ?? "";
      if (!/^[A-Za-z0-9_-]{32,128}$/.test(code) || !/^[A-Za-z0-9._~-]{43,128}$/.test(verifier) || form.get("redirect_uri") !== client.redirectUri) {
        return oauthError("invalid_grant", 400);
      }
      const tokenSet = await exchangeAuthorizationCode({ code, codeVerifier: verifier });
      return tokenSet ? NextResponse.json(tokenSet, { headers: privateHeaders }) : oauthError("invalid_grant", 400);
    }
    if (form.get("grant_type") === "refresh_token") {
      const refreshToken = form.get("refresh_token") ?? "";
      if (!/^[A-Za-z0-9_-]{32,128}$/.test(refreshToken)) return oauthError("invalid_grant", 400);
      const tokenSet = await rotateRefreshToken({ refreshHash: await hashCredential(refreshToken) });
      return tokenSet ? NextResponse.json(tokenSet, { headers: privateHeaders }) : oauthError("invalid_grant", 400);
    }
    return oauthError("unsupported_grant_type", 400);
  } catch {
    return oauthError("server_error", 503);
  }
}
