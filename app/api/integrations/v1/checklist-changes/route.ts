import { z } from "zod";

import { synapseChecklistPrefix, sourceSubtaskId } from "@/lib/integrations/synapse/checklist";
import { authenticateIntegration, errorResponse, IntegrationError } from "@/lib/integrations/synapse/http";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

const privateHeaders = { "cache-control": "private, no-store" };
const sourceUserIdSchema = z.string().trim().min(1).max(128);

export async function GET(request: Request) {
  let principal;
  try { principal = await authenticateIntegration(request, "plan:write"); }
  catch (error) { return errorResponse(error instanceof IntegrationError ? error : new IntegrationError("storage")); }

  const parsed = sourceUserIdSchema.safeParse(new URL(request.url).searchParams.get("sourceUserId"));
  if (!parsed.success) return Response.json({ error: "invalid_request" }, { status: 400, headers: privateHeaders });
  const admin = getSupabaseAdminClient();
  if (!admin) return errorResponse(new IntegrationError("configuration"));
  const prefix = synapseChecklistPrefix(parsed.data);
  const { data, error } = await admin.from("synapse_checklist_overrides")
    .select("source_key, completed, changed_at")
    .eq("user_id", principal.userId)
    .like("source_key", `${prefix}%`)
    .order("changed_at", { ascending: true })
    .limit(1001);
  if (error || !data || data.length > 1000) return errorResponse(new IntegrationError("storage"));

  const changes = data.flatMap((row) => {
    const id = sourceSubtaskId(row.source_key, prefix);
    return id ? [{ id, completed: row.completed, changedAt: row.changed_at }] : [];
  });
  return Response.json({ changes }, { headers: privateHeaders });
}
