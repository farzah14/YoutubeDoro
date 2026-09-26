import { authenticateIntegration, errorResponse, IntegrationError } from "@/lib/integrations/synapse/http";
import { applySynapsePlan, synapsePlanSchema } from "@/lib/integrations/synapse/plan";

const privateHeaders = { "cache-control": "private, no-store" };

export async function PUT(request: Request) {
  let principal;
  try { principal = await authenticateIntegration(request, "plan:write"); }
  catch (error) { return errorResponse(error instanceof IntegrationError ? error : new IntegrationError("storage")); }

  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) {
    return Response.json({ error: "invalid_request" }, { status: 415, headers: privateHeaders });
  }
  if (Number(request.headers.get("content-length") ?? 0) > 524_288) {
    return Response.json({ error: "payload_too_large" }, { status: 413, headers: privateHeaders });
  }
  let raw: string;
  try { raw = await request.text(); }
  catch { return Response.json({ error: "invalid_request" }, { status: 400, headers: privateHeaders }); }
  if (raw.length > 524_288) return Response.json({ error: "payload_too_large" }, { status: 413, headers: privateHeaders });
  let value: unknown;
  try { value = JSON.parse(raw); }
  catch { return Response.json({ error: "invalid_request" }, { status: 400, headers: privateHeaders }); }
  const parsed = synapsePlanSchema.safeParse(value);
  if (!parsed.success) return Response.json({ error: "invalid_plan" }, { status: 400, headers: privateHeaders });

  try {
    const applied = await applySynapsePlan(principal.userId, parsed.data);
    return Response.json({ applied }, { headers: privateHeaders });
  } catch {
    return errorResponse(new IntegrationError("storage"));
  }
}
