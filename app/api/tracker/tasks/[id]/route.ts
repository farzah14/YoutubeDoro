import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getAuthenticatedUser } from "@/lib/supabase/auth";
import { mapTaskRow } from "@/lib/trackerModel";
import { taskPatchSchema, uuidSchema } from "@/lib/trackerValidation";

function errorResponse(message: string, status: number, details?: unknown) {
  return NextResponse.json({ error: message, details }, { status });
}

async function ownedTask(id: string) {
  const { user } = await getAuthenticatedUser();
  if (!user) return { user: null, supabase: null, row: null };
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { user, supabase: null, row: null };
  const { data: row, error } = await supabase.from("tasks").select("*").eq("id", id).eq("user_id", user.id).maybeSingle();
  return { user, supabase, row: error ? null : row };
}

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: RouteContext) {
  const id = (await params).id;
  if (!uuidSchema.safeParse(id).success) return errorResponse("Invalid task id.", 400);
  const { user, supabase, row } = await ownedTask(id);
  if (!user) return errorResponse("Authentication required.", 401);
  if (!supabase) return errorResponse("Supabase is not configured.", 500);
  if (!row) return errorResponse("Task not found.", 404);

  let body: unknown;
  try { body = await request.json(); } catch { return errorResponse("Invalid JSON body.", 400); }
  const parsed = taskPatchSchema.safeParse(body);
  if (!parsed.success) return errorResponse("Invalid task update.", 400, parsed.error.flatten());
  const value = parsed.data;
  const update = {
    ...(value.title === undefined ? {} : { title: value.title }),
    ...(value.completed === undefined ? {} : { completed: value.completed }),
    ...(value.estimatedMinutes === undefined ? {} : { estimated_minutes: value.estimatedMinutes }),
    ...(value.emoji === undefined ? {} : { emoji: value.emoji }),
    ...(value.color === undefined ? {} : { color: value.color }),
    ...(value.order === undefined ? {} : { task_order: value.order }),
    updated_at: new Date().toISOString(),
  };
  const { data, error } = await supabase.from("tasks").update(update).eq("id", id).eq("user_id", user.id).select().single();
  if (error) return errorResponse(error.message, 500);
  return NextResponse.json({ task: mapTaskRow(data) });
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  const id = (await params).id;
  if (!uuidSchema.safeParse(id).success) return errorResponse("Invalid task id.", 400);
  const { user, supabase, row } = await ownedTask(id);
  if (!user) return errorResponse("Authentication required.", 401);
  if (!supabase) return errorResponse("Supabase is not configured.", 500);
  if (!row) return errorResponse("Task not found.", 404);

  const { count, error: countError } = await supabase.from("learning_sessions").select("id", { count: "exact", head: true }).eq("user_id", user.id).eq("task_id", id);
  if (countError) return errorResponse(countError.message, 500);
  const { error } = await supabase.from("tasks").delete().eq("id", id).eq("user_id", user.id);
  if (error) return errorResponse(error.message, 500);
  return NextResponse.json({ deleted: true, linkedSessions: count ?? 0 });
}
