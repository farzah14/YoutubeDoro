import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getAuthenticatedUser } from "@/lib/supabase/auth";
import { mapSubtaskRow } from "@/lib/trackerModel";
import { subtaskPatchSchema, uuidSchema } from "@/lib/trackerValidation";

function errorResponse(message: string, status: number, details?: unknown) {
  return NextResponse.json({ error: message, details }, { status });
}

type RouteContext = { params: Promise<{ id: string }> };

async function ownedSubtask(id: string, userId: string) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { supabase: null, row: null };
  const { data: row, error } = await supabase.from("subtasks").select("*").eq("id", id).maybeSingle();
  if (error || !row) return { supabase, row: null };
  const { data: task } = await supabase.from("tasks").select("id").eq("id", row.task_id).eq("user_id", userId).maybeSingle();
  return { supabase, row: task ? row : null };
}

export async function PATCH(request: Request, { params }: RouteContext) {
  const id = (await params).id;
  if (!uuidSchema.safeParse(id).success) return errorResponse("Invalid subtask id.", 400);
  const { user } = await getAuthenticatedUser();
  if (!user) return errorResponse("Authentication required.", 401);
  const { supabase, row } = await ownedSubtask(id, user.id);
  if (!supabase) return errorResponse("Supabase is not configured.", 500);
  if (!row) return errorResponse("Subtask not found.", 404);
  let body: unknown;
  try { body = await request.json(); } catch { return errorResponse("Invalid JSON body.", 400); }
  const parsed = subtaskPatchSchema.safeParse(body);
  if (!parsed.success) return errorResponse("Invalid subtask update.", 400, parsed.error.flatten());
  const value = parsed.data;
  const update = {
    ...(value.text === undefined ? {} : { text: value.text }),
    ...(value.completed === undefined ? {} : { completed: value.completed }),
    ...(value.order === undefined ? {} : { subtask_order: value.order }),
    updated_at: new Date().toISOString(),
  };
  const { data, error } = await supabase.from("subtasks").update(update).eq("id", id).select().single();
  if (error) return errorResponse(error.message, 500);
  return NextResponse.json({ subtask: mapSubtaskRow(data) });
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  const id = (await params).id;
  if (!uuidSchema.safeParse(id).success) return errorResponse("Invalid subtask id.", 400);
  const { user } = await getAuthenticatedUser();
  if (!user) return errorResponse("Authentication required.", 401);
  const { supabase, row } = await ownedSubtask(id, user.id);
  if (!supabase) return errorResponse("Supabase is not configured.", 500);
  if (!row) return errorResponse("Subtask not found.", 404);
  const { error } = await supabase.from("subtasks").delete().eq("id", id).select().single();
  if (error) return errorResponse(error.message, 500);
  return NextResponse.json({ deleted: true });
}
