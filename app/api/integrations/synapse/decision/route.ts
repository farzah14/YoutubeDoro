import { NextResponse } from "next/server";

import { createGrantAndCode } from "@/lib/integrations/synapse/grants";
import { getSynapseClientConfig, getStudyRythmsSiteUrl } from "@/lib/integrations/synapse/config";
import { getAuthenticatedUser } from "@/lib/supabase/auth";
import { SYNAPSE_SCOPE } from "@/lib/integrations/synapse/scope";

function redirectToCallback(redirectUri: string, values: Record<string, string>) {
  const target = new URL(redirectUri);
  for (const [key, value] of Object.entries(values)) target.searchParams.set(key, value);
  return NextResponse.redirect(target, { status: 303, headers: { "cache-control": "private, no-store" } });
}

export async function POST(request: Request) {
  const expectedOrigin = new URL(getStudyRythmsSiteUrl()).origin;
  if (request.headers.get("origin") !== expectedOrigin || request.headers.get("sec-fetch-site") === "cross-site") {
    return NextResponse.json({ error: "origin" }, { status: 403 });
  }
  const { user } = await getAuthenticatedUser();
  if (!user) return NextResponse.redirect(new URL("/auth", expectedOrigin), { status: 303 });
  const config = getSynapseClientConfig();
  if (!config) return NextResponse.json({ error: "integration_not_configured" }, { status: 503 });

  let form: FormData;
  try { form = await request.formData(); } catch { return NextResponse.json({ error: "invalid_request" }, { status: 400 }); }
  const clientId = form.get("client_id");
  const redirectUri = form.get("redirect_uri");
  const state = form.get("state");
  const challenge = form.get("code_challenge");
  const scope = form.get("scope");
  const decision = form.get("decision");
  const validRequest = clientId === config.clientId
    && redirectUri === config.redirectUri
    && typeof state === "string" && /^[A-Za-z0-9_-]{24,128}$/.test(state)
    && typeof challenge === "string" && /^[A-Za-z0-9_-]{43}$/.test(challenge)
    && scope === SYNAPSE_SCOPE;
  if (!validRequest) return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  if (decision === "cancel") return redirectToCallback(config.redirectUri, { error: "access_denied", state });
  if (decision !== "approve") return NextResponse.json({ error: "invalid_request" }, { status: 400 });

  try {
    const code = await createGrantAndCode({ userId: user.id, codeChallenge: challenge });
    return redirectToCallback(config.redirectUri, { code, state });
  } catch {
    return NextResponse.json({ error: "approval_failed" }, { status: 503, headers: { "cache-control": "private, no-store" } });
  }
}
