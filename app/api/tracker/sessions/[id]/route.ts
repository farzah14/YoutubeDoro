import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getAuthenticatedUser } from "@/lib/supabase/auth";
import { mapSessionRow, normalizeSessionPatch } from "@/lib/trackerModel";
import { sessionPatchSchema, uuidSchema } from "@/lib/trackerValidation";

function errorResponse(message: string, status: number, details?: unknown) {
  return NextResponse.json({ error: message, details }, { status });
}

type RouteContext = { params: Promise<{ id: string }> };
const finalizedStatuses = new Set(["completed", "stopped", "interrupted", "legacy"]);

export async function PATCH(request: Request, { params }: RouteContext) {
  const id = (await params).id;
  if (!uuidSchema.safeParse(id).success) return errorResponse("Invalid session id.", 400);
  const { user } = await getAuthenticatedUser();
  if (!user) return errorResponse("Authentication required.", 401);
  const supabase = await createSupabaseServerClient();
  if (!supabase) return errorResponse("Supabase is not configured.", 500);
  const { data: current, error: currentError } = await supabase.from("learning_sessions").select("*").eq("id", id).eq("user_id", user.id).maybeSingle();
  if (currentError) return errorResponse(currentError.message, 500);
  if (!current) return errorResponse("Session not found.", 404);

  let body: unknown;
  try { body = await request.json(); } catch { return errorResponse("Invalid JSON body.", 400); }
  const parsed = sessionPatchSchema.safeParse(body);
  if (!parsed.success) return errorResponse("Invalid session update.", 400, parsed.error.flatten());
  const value = parsed.data;
  const hasTiming = value.learningSeconds !== undefined || value.breakCount !== undefined || value.breakSeconds !== undefined;
  const currentFinalized = finalizedStatuses.has(current.status as string);
  if (currentFinalized && (hasTiming || value.status !== undefined || value.endedAt !== undefined)) {
    return errorResponse("Finalized session timing is immutable.", 409);
  }
  if (current.status !== "active" && value.status !== undefined) return errorResponse("Session status is immutable.", 409);
  if (value.endedAt !== undefined && value.status !== "completed" && value.status !== "stopped" && value.status !== "interrupted") {
    return errorResponse("An ended session needs a final status.", 400);
  }

  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (current.status === "active" && hasTiming) {
    const normalized = normalizeSessionPatch(value);
    if (value.learningSeconds !== undefined) update.learning_seconds = normalized.learningSeconds;
    if (value.breakCount !== undefined) update.break_count = normalized.breakCount;
    if (value.breakSeconds !== undefined) update.break_seconds = normalized.breakSeconds;
  }
  if (value.title !== undefined) update.title = value.title;
  if (value.note !== undefined) update.note = value.note;
  if (value.taskId !== undefined) {
    if (value.taskId === null) {
      update.task_id = null;
      update.task_title_snapshot = "Untitled learning session";
    } else {
      const { data: task, error: taskError } = await supabase.from("tasks").select("id, title").eq("id", value.taskId).eq("user_id", user.id).maybeSingle();
      if (taskError) return errorResponse(taskError.message, 500);
      if (!task) return errorResponse("Task not found.", 404);
      update.task_id = task.id;
      update.task_title_snapshot = task.title;
    }
  }
  if (value.status !== undefined) {
    if (value.status === "legacy") return errorResponse("Live sessions cannot become legacy.", 400);
    update.status = value.status;
    if (finalizedStatuses.has(value.status)) update.ended_at = value.endedAt ?? new Date().toISOString();
  }

  const { data, error } = await supabase.from("learning_sessions").update(update).eq("id", id).eq("user_id", user.id).select().single();
  if (error) return errorResponse(error.message, 500);
  return NextResponse.json({ session: mapSessionRow(data) });
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  const id = (await params).id;
  if (!uuidSchema.safeParse(id).success) return errorResponse("Invalid session id.", 400);
  const { user } = await getAuthenticatedUser();
  if (!user) return errorResponse("Authentication required.", 401);
  const supabase = await createSupabaseServerClient();
  if (!supabase) return errorResponse("Supabase is not configured.", 500);
  const { data, error } = await supabase.from("learning_sessions").delete().eq("id", id).eq("user_id", user.id).select("id").maybeSingle();
  if (error) return errorResponse(error.message, 500);
  if (!data) return errorResponse("Session not found.", 404);
  return NextResponse.json({ deleted: true });
}
