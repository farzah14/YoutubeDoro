import { NextResponse } from "next/server";

import { getAuthenticatedUser } from "@/lib/supabase/auth";
import { getStudyRythmsSiteUrl } from "@/lib/integrations/synapse/config";
import { listActiveGrants, revokeOwnedGrant } from "@/lib/integrations/synapse/grants";

function sameOrigin(request: Request) {
  return request.headers.get("origin") === new URL(getStudyRythmsSiteUrl()).origin;
}

export async function GET() {
  const { user } = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401, headers: { "cache-control": "private, no-store" } });
  try {
    return NextResponse.json({ grants: await listActiveGrants(user.id) }, { headers: { "cache-control": "private, no-store" } });
  } catch {
    return NextResponse.json({ error: "storage" }, { status: 503, headers: { "cache-control": "private, no-store" } });
  }
}

export async function DELETE(request: Request) {
  if (!sameOrigin(request)) return NextResponse.json({ error: "origin" }, { status: 403 });
  const { user } = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  let body: { grantId?: unknown };
  try { body = await request.json() as { grantId?: unknown }; } catch { return NextResponse.json({ error: "invalid_request" }, { status: 400 }); }
  if (typeof body.grantId !== "string") return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  try {
    const revoked = await revokeOwnedGrant(user.id, body.grantId);
    return revoked
      ? new Response(null, { status: 204, headers: { "cache-control": "private, no-store" } })
      : NextResponse.json({ error: "not_found" }, { status: 404 });
  } catch {
    return NextResponse.json({ error: "storage" }, { status: 503 });
  }
}
