import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getAuthenticatedUser } from "@/lib/supabase/auth";
import { mapSessionRow } from "@/lib/trackerModel";
import { parseSessionFilters, sessionCreateSchema } from "@/lib/trackerValidation";

function errorResponse(message: string, status: number, details?: unknown) {
  return NextResponse.json({ error: message, details }, { status });
}

async function context() {
  const { user } = await getAuthenticatedUser();
  if (!user) return { user: null, supabase: null };
  return { user, supabase: await createSupabaseServerClient() };
}

function filterDate(value: string, end = false) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  return `${value}T${end ? "23:59:59.999" : "00:00:00.000"}Z`;
}

export async function GET(request: Request) {
  const { user, supabase } = await context();
  if (!user) return errorResponse("Authentication required.", 401);
  if (!supabase) return errorResponse("Supabase is not configured.", 500);
  const parsed = parseSessionFilters(new URL(request.url).searchParams);
  if (!parsed.success) return errorResponse("Invalid session filters.", 400, parsed.error.flatten());

  let query = supabase.from("learning_sessions").select("*").eq("user_id", user.id);
  if (parsed.data.from) query = query.gte("started_at", filterDate(parsed.data.from));
  if (parsed.data.to) query = query.lte("started_at", filterDate(parsed.data.to, true));
  if (parsed.data.taskId) query = query.eq("task_id", parsed.data.taskId);
  const { data, error } = await query.order("created_at", { ascending: false }).limit(parsed.data.limit);
  if (error) return errorResponse(error.message, 500);
  return NextResponse.json({ sessions: (data ?? []).map(mapSessionRow) });
}

export async function POST(request: Request) {
  const { user, supabase } = await context();
  if (!user) return errorResponse("Authentication required.", 401);
  if (!supabase) return errorResponse("Supabase is not configured.", 500);
  let body: unknown;
  try { body = await request.json(); } catch { return errorResponse("Invalid JSON body.", 400); }
  const parsed = sessionCreateSchema.safeParse(body);
  if (!parsed.success) return errorResponse("Invalid session.", 400, parsed.error.flatten());
  const value = parsed.data;

  let taskTitle = value.taskTitleSnapshot;
  if (value.taskId) {
    const { data: task, error: taskError } = await supabase.from("tasks").select("id, title").eq("id", value.taskId).eq("user_id", user.id).maybeSingle();
    if (taskError) return errorResponse(taskError.message, 500);
    if (!task) return errorResponse("Task not found.", 404);
    taskTitle = task.title as string;
  }

  const { data, error } = await supabase.from("learning_sessions").insert({
    user_id: user.id,
    task_id: value.taskId ?? null,
    task_title_snapshot: taskTitle,
    title: value.title,
    timer_mode: value.timerMode,
    planned_seconds: value.plannedSeconds ?? null,
    learning_seconds: 0,
    break_count: 0,
    break_seconds: 0,
    status: "active",
    note: "",
    started_at: value.startedAt ?? new Date().toISOString(),
  }).select().single();
  if (error) return errorResponse(error.message, error.code === "23505" ? 409 : 500);
  return NextResponse.json({ session: mapSessionRow(data) }, { status: 201 });
}
