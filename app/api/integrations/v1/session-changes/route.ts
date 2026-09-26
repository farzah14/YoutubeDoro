import { NextResponse } from "next/server";

import { authenticateIntegration, errorResponse, IntegrationError, runHousekeeping } from "@/lib/integrations/synapse/http";
import { getSessionChanges, SessionFeedError } from "@/lib/integrations/synapse/sessions";

export async function GET(request: Request) {
  try {
    const principal = await authenticateIntegration(request);
    await runHousekeeping();
    const after = new URL(request.url).searchParams.get("after");
    const result = await getSessionChanges(principal.userId, after);
    return NextResponse.json(result, { headers: { "cache-control": "private, no-store" } });
  } catch (error) {
    if (error instanceof IntegrationError) return errorResponse(error);
    if (error instanceof SessionFeedError) {
      const status = error.code === "invalid_cursor" ? 400 : error.code === "cursor_expired" ? 410 : 503;
      return NextResponse.json({ error: error.code }, { status, headers: { "cache-control": "private, no-store" } });
    }
    return NextResponse.json({ error: "storage" }, { status: 503, headers: { "cache-control": "private, no-store" } });
  }
}
