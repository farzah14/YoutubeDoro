import { NextResponse } from "next/server";

import { revokeRefreshCredential } from "@/lib/integrations/synapse/grants";
import { IntegrationError, errorResponse, validateClientCredentials } from "@/lib/integrations/synapse/http";

export async function POST(request: Request) {
  let client: Awaited<ReturnType<typeof validateClientCredentials>>;
  try {
    client = await validateClientCredentials(request);
  } catch (error) {
    if (error instanceof IntegrationError) return errorResponse(error);
    return NextResponse.json({ error: "server_error" }, { status: 503, headers: { "cache-control": "private, no-store" } });
  }
  if (!client) return NextResponse.json({ error: "invalid_client" }, { status: 401, headers: { "cache-control": "private, no-store" } });
  const body = await request.text();
  if (body.length > 10_000) return NextResponse.json({ error: "invalid_request" }, { status: 400, headers: { "cache-control": "private, no-store" } });
  const form = new URLSearchParams(body);
  const token = form.get("token") ?? "";
  if (!/^[A-Za-z0-9_-]{32,128}$/.test(token)) return NextResponse.json({ revoked: false }, { headers: { "cache-control": "private, no-store" } });
  try {
    const revoked = await revokeRefreshCredential(token, client.clientId);
    return NextResponse.json({ revoked }, { headers: { "cache-control": "private, no-store" } });
  } catch {
    return NextResponse.json({ error: "server_error" }, { status: 503, headers: { "cache-control": "private, no-store" } });
  }
}
