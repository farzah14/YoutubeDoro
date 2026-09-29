import { authenticateIntegration, errorResponse, IntegrationError } from "@/lib/integrations/synapse/http";
import { applySynapsePlan, synapsePlanSchema } from "@/lib/integrations/synapse/plan";
import { MAX_PLAN_PAYLOAD_BYTES, parsePlanRequestBody } from "@/lib/integrations/synapse/planPayload";

const privateHeaders = { "cache-control": "private, no-store" };

export async function PUT(request: Request) {
  let principal;
  try { principal = await authenticateIntegration(request, "plan:write"); }
  catch (error) { return errorResponse(error instanceof IntegrationError ? error : new IntegrationError("storage")); }

  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) {
    return Response.json({ error: "invalid_request" }, { status: 415, headers: privateHeaders });
  }
  if (Number(request.headers.get("content-length") ?? 0) > MAX_PLAN_PAYLOAD_BYTES) {
    return Response.json({ error: "payload_too_large" }, { status: 413, headers: privateHeaders });
  }
  const body = await parsePlanRequestBody(request);
  if (body.kind === "too_large") {
    return Response.json({ error: "payload_too_large" }, { status: 413, headers: privateHeaders });
  }
  if (body.kind === "invalid_request") {
    return Response.json({ error: "invalid_request" }, { status: 400, headers: privateHeaders });
  }
  const parsed = synapsePlanSchema.safeParse(body.value);
  if (!parsed.success) return Response.json({ error: "invalid_plan" }, { status: 400, headers: privateHeaders });

  try {
    const applied = await applySynapsePlan(principal.userId, parsed.data);
    return Response.json({ applied }, { headers: privateHeaders });
  } catch {
    return errorResponse(new IntegrationError("storage"));
  }
}
