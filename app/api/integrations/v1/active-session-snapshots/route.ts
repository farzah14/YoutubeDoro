import { NextResponse } from "next/server";

import { authenticateIntegration, errorResponse, IntegrationError, runHousekeeping } from "@/lib/integrations/synapse/http";
import { getActiveSessionSnapshots, SessionFeedError } from "@/lib/integrations/synapse/sessions";

export async function GET(request: Request) {
  try {
    const principal = await authenticateIntegration(request);
    await runHousekeeping();
    const result = await getActiveSessionSnapshots(principal.userId);
    return NextResponse.json(result, { headers: { "cache-control": "private, no-store" } });
  } catch (error) {
    if (error instanceof IntegrationError) return errorResponse(error);
    if (error instanceof SessionFeedError) {
      return NextResponse.json({ error: error.code }, { status: 503, headers: { "cache-control": "private, no-store" } });
    }
    return NextResponse.json({ error: "storage" }, { status: 503, headers: { "cache-control": "private, no-store" } });
  }
}
