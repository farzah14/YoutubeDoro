import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getAuthenticatedUser } from "@/lib/supabase/auth";
import { browserMigrationSchema } from "@/lib/trackerValidation";

function errorResponse(message: string, status: number, details?: unknown) {
  return NextResponse.json({ error: message, details }, { status });
}

async function findTask(supabase: NonNullable<Awaited<ReturnType<typeof createSupabaseServerClient>>>, userId: string, sourceKey: string) {
  const { data, error } = await supabase.from("tasks").select("id").eq("user_id", userId).eq("source_key", sourceKey).maybeSingle();
  return { data, error };
}

export async function POST(request: Request) {
  const { user } = await getAuthenticatedUser();
  if (!user) return errorResponse("Authentication required.", 401);
  const supabase = await createSupabaseServerClient();
  if (!supabase) return errorResponse("Supabase is not configured.", 500);

  let body: unknown;
  try { body = await request.json(); } catch { return errorResponse("Invalid JSON body.", 400); }
  if (JSON.stringify(body).length > 2_000_000) return errorResponse("Migration payload is too large.", 400);
  const parsed = browserMigrationSchema.safeParse(body);
  if (!parsed.success) return errorResponse("Invalid browser migration.", 400, parsed.error.flatten());
  const value = parsed.data;

  const { data: priorRun, error: priorError } = await supabase.from("migration_runs")
    .select("summary")
    .eq("user_id", user.id)
    .eq("source", "browser-local")
    .eq("source_key", value.migrationKey)
    .maybeSingle();
  if (priorError) return errorResponse(priorError.message, 500);
  if (priorRun) return NextResponse.json({ summary: priorRun.summary });

  const summary = { tasks: 0, subtasks: 0, sessions: 0, notes: 0 };
  for (const task of value.tasks) {
    let { data: savedTask, error: taskError } = await findTask(supabase, user.id, task.sourceKey);
    if (taskError) return errorResponse(taskError.message, 500);
    if (!savedTask) {
      const result = await supabase.from("tasks").insert({
        user_id: user.id,
        title: task.title,
        estimated_minutes: task.estimatedMinutes,
        completed: task.completed,
        emoji: task.emoji,
        color: task.color,
        task_order: task.order,
        source_key: task.sourceKey,
      }).select("id").single();
      savedTask = result.data;
      taskError = result.error;
      if (taskError?.code === "23505") {
        const retry = await findTask(supabase, user.id, task.sourceKey);
        savedTask = retry.data;
        taskError = retry.error;
      }
    }
    if (taskError) return errorResponse(taskError.message, 500);
    if (!savedTask) return errorResponse("Could not save migrated task.", 500);
    summary.tasks += 1;

    for (const subtask of task.subtasks) {
      const { data: existingSubtask, error: existingError } = await supabase.from("subtasks")
        .select("id")
        .eq("task_id", savedTask.id)
        .eq("source_key", subtask.sourceKey)
        .maybeSingle();
      if (existingError) return errorResponse(existingError.message, 500);
      if (!existingSubtask) {
        const { error } = await supabase.from("subtasks").insert({
          task_id: savedTask.id,
          text: subtask.text,
          completed: subtask.completed,
          subtask_order: subtask.order,
          source_key: subtask.sourceKey,
        });
        if (error && error.code !== "23505") return errorResponse(error.message, 500);
      }
      summary.subtasks += 1;
    }
  }

  for (const session of value.sessions) {
    const { data: existing, error: existingError } = await supabase.from("learning_sessions")
      .select("id")
      .eq("user_id", user.id)
      .eq("source_key", session.sourceKey)
      .maybeSingle();
    if (existingError) return errorResponse(existingError.message, 500);
    if (!existing) {
      const { error } = await supabase.from("learning_sessions").insert({
        user_id: user.id,
        task_id: null,
        task_title_snapshot: session.taskTitleSnapshot,
        title: session.title,
        timer_mode: session.timerMode,
        planned_seconds: null,
        learning_seconds: session.learningSeconds,
        break_count: session.breakCount,
        break_seconds: session.breakSeconds,
        status: "legacy",
        note: session.note,
        started_at: session.startedAt,
        ended_at: session.endedAt,
        source_key: session.sourceKey,
      });
      if (error && error.code !== "23505") return errorResponse(error.message, 500);
    }
    summary.sessions += 1;
    if (session.note.trim()) summary.notes += 1;
  }

  const { data: savedRun, error: runError } = await supabase.from("migration_runs").insert({
    user_id: user.id,
    source: "browser-local",
    source_key: value.migrationKey,
    summary,
  }).select("summary").single();
  if (runError?.code === "23505") {
    const { data: concurrentRun } = await supabase.from("migration_runs").select("summary").eq("user_id", user.id).eq("source", "browser-local").eq("source_key", value.migrationKey).maybeSingle();
    return NextResponse.json({ summary: concurrentRun?.summary ?? summary });
  }
  if (runError) return errorResponse(runError.message, 500);
  return NextResponse.json({ summary: savedRun?.summary ?? summary }, { status: 201 });
}
