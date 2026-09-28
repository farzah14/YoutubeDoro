import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getAuthenticatedUser } from "@/lib/supabase/auth";
import { mapTaskRow } from "@/lib/trackerModel";
import { readTrackerTaskData } from "@/lib/trackerTaskRead";
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

  try {
    return NextResponse.json(await readTrackerTaskData(supabase, user.id));
  } catch {
    return errorResponse("Could not read the complete task list.", 500);
  }
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
