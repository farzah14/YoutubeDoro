import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getAuthenticatedUser } from "@/lib/supabase/auth";
import { mapSubtaskRow } from "@/lib/trackerModel";
import { subtaskCreateSchema, uuidSchema } from "@/lib/trackerValidation";

function errorResponse(message: string, status: number, details?: unknown) {
  return NextResponse.json({ error: message, details }, { status });
}

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: RouteContext) {
  const taskId = (await params).id;
  if (!uuidSchema.safeParse(taskId).success) return errorResponse("Invalid task id.", 400);
  const { user } = await getAuthenticatedUser();
  if (!user) return errorResponse("Authentication required.", 401);
  const supabase = await createSupabaseServerClient();
  if (!supabase) return errorResponse("Supabase is not configured.", 500);

  const { data: task, error: taskError } = await supabase.from("tasks").select("id").eq("id", taskId).eq("user_id", user.id).maybeSingle();
  if (taskError) return errorResponse(taskError.message, 500);
  if (!task) return errorResponse("Task not found.", 404);

  let body: unknown;
  try { body = await request.json(); } catch { return errorResponse("Invalid JSON body.", 400); }
  const parsed = subtaskCreateSchema.safeParse(body);
  if (!parsed.success) return errorResponse("Invalid subtask.", 400, parsed.error.flatten());
  const value = parsed.data;
  const { data, error } = await supabase.from("subtasks").insert({
    task_id: task.id,
    text: value.text,
    completed: value.completed,
    subtask_order: value.order,
  }).select().single();
  if (error) return errorResponse(error.message, 500);
  return NextResponse.json({ subtask: mapSubtaskRow(data) }, { status: 201 });
}
