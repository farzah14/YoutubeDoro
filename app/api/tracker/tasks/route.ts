import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getAuthenticatedUser } from "@/lib/supabase/auth";
import { mapSubtaskRow, mapTaskRow } from "@/lib/trackerModel";
import { taskCreateSchema } from "@/lib/trackerValidation";

function errorResponse(message: string, status: number, details?: unknown) {
  return NextResponse.json({ error: message, details }, { status });
}

async function context() {
  const { user } = await getAuthenticatedUser();
  if (!user) return { user: null, supabase: null };
  return { user, supabase: await createSupabaseServerClient() };
}

export async function GET() {
  const { user, supabase } = await context();
  if (!user) return errorResponse("Authentication required.", 401);
  if (!supabase) return errorResponse("Supabase is not configured.", 500);

  const { data: taskRows, error: taskError } = await supabase
    .from("tasks")
    .select("*")
    .eq("user_id", user.id)
    .order("task_order", { ascending: true })
    .order("created_at", { ascending: true });
  if (taskError) return errorResponse(taskError.message, 500);

  const rows = taskRows ?? [];
  const ids = rows.map((row) => row.id as string);
  const subtasksByTask = new Map<string, ReturnType<typeof mapSubtaskRow>[]>();
  const focusByTask = new Map<string, { seconds: number; completed: number }>();

  if (ids.length) {
    const { data: subtaskRows, error: subtaskError } = await supabase
      .from("subtasks")
      .select("*")
      .in("task_id", ids)
      .order("subtask_order", { ascending: true });
    if (subtaskError) return errorResponse(subtaskError.message, 500);
    for (const row of subtaskRows ?? []) {
      const taskId = row.task_id as string;
      subtasksByTask.set(taskId, [...(subtasksByTask.get(taskId) ?? []), mapSubtaskRow(row)]);
    }

    const { data: sessionRows, error: sessionError } = await supabase
      .from("learning_sessions")
      .select("task_id, learning_seconds, status")
      .eq("user_id", user.id)
      .in("task_id", ids);
    if (sessionError) return errorResponse(sessionError.message, 500);
    for (const row of sessionRows ?? []) {
      const taskId = row.task_id as string;
      const current = focusByTask.get(taskId) ?? { seconds: 0, completed: 0 };
      current.seconds += Number(row.learning_seconds) || 0;
      if (row.status === "completed") current.completed += 1;
      focusByTask.set(taskId, current);
    }
  }

  return NextResponse.json({
    tasks: rows.map((row) => {
      const progress = focusByTask.get(row.id as string) ?? { seconds: 0, completed: 0 };
      return mapTaskRow(row, subtasksByTask.get(row.id as string) ?? [], progress.seconds, progress.completed);
    }),
  });
}

export async function POST(request: Request) {
  const { user, supabase } = await context();
  if (!user) return errorResponse("Authentication required.", 401);
  if (!supabase) return errorResponse("Supabase is not configured.", 500);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse("Invalid JSON body.", 400);
  }
  const parsed = taskCreateSchema.safeParse(body);
  if (!parsed.success) return errorResponse("Invalid task.", 400, parsed.error.flatten());

  const value = parsed.data;
  const { data, error } = await supabase.from("tasks").insert({
    user_id: user.id,
    title: value.title,
    completed: value.completed,
    estimated_minutes: value.estimatedMinutes,
    emoji: value.emoji,
    color: value.color,
    task_order: value.order,
    source_key: value.sourceKey ?? null,
  }).select().single();
  if (error) return errorResponse(error.message, error.code === "23505" ? 409 : 500);
  return NextResponse.json({ task: mapTaskRow(data) }, { status: 201 });
}
