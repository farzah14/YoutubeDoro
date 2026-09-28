import type { SupabaseClient } from "@supabase/supabase-js";

import { mapSubtaskRow, mapTaskRow } from "@/lib/trackerModel";

export const PAGE_SIZE = 500;
export const TASK_ID_BATCH_SIZE = 50;

type PageResult<Row> = {
  data: Row[] | null;
  error: { message?: string } | null;
  count: number | null;
};

export type SessionSummary = { seconds: number; completed: number; linked: number };

function requiredString(value: unknown, field: string): string {
  if (typeof value !== "string" || value.length === 0) throw new Error(`Invalid ${field}.`);
  return value;
}

export async function fetchAllPages<Row>(
  queryPage: (from: number, to: number) => PromiseLike<PageResult<Row>>,
  keyOf: (row: Row) => string,
): Promise<Row[]> {
  const rows: Row[] = [];
  const keys = new Set<string>();
  let expectedCount: number | null = null;
  let offset = 0;

  while (expectedCount === null || rows.length < expectedCount) {
    const page = await queryPage(offset, offset + PAGE_SIZE - 1);
    if (page.error) throw new Error(page.error.message ?? "Could not read a complete task list.");
    if (!Array.isArray(page.data)) throw new Error("Could not read a complete task list.");
    if (!Number.isSafeInteger(page.count) || page.count === null || page.count < 0) {
      throw new Error("The database did not return an exact count for a task list.");
    }
    if (expectedCount === null) expectedCount = page.count;
    else if (page.count !== expectedCount) throw new Error("A task list changed while it was being read.");

    if (page.data.length === 0 && rows.length < expectedCount) {
      throw new Error("The database returned an incomplete task list.");
    }
    if (rows.length + page.data.length > expectedCount) {
      throw new Error("The database returned more rows than the exact task count.");
    }
    for (const row of page.data) {
      const key = requiredString(keyOf(row), "row ID");
      if (keys.has(key)) throw new Error("The database returned a duplicate row ID.");
      keys.add(key);
      rows.push(row);
    }
    offset += page.data.length;
  }

  if (rows.length !== expectedCount) throw new Error("The database returned an incomplete task list.");
  return rows;
}

function safeCount(value: unknown, field: string): number {
  const numeric = typeof value === "string" && value.trim() !== "" ? Number(value) : value;
  if (typeof numeric !== "number" || !Number.isSafeInteger(numeric) || numeric < 0) {
    throw new Error(`Invalid or unsafe ${field} count.`);
  }
  return numeric;
}

export function mapSessionSummaryRows(
  rows: Array<Record<string, unknown>>,
  visibleTaskIds: Set<string>,
): Map<string, SessionSummary> {
  const summaries = new Map<string, SessionSummary>();
  const seenTaskIds = new Set<string>();
  for (const row of rows) {
    const taskId = requiredString(row.task_id, "session summary task ID");
    if (seenTaskIds.has(taskId)) throw new Error("The database returned a duplicate task summary.");
    seenTaskIds.add(taskId);
    if (!visibleTaskIds.has(taskId)) continue;
    summaries.set(taskId, {
      seconds: safeCount(row.focused_seconds, "focused-seconds"),
      completed: safeCount(row.completed_sessions, "completed-session"),
      linked: safeCount(row.linked_session_count, "linked-session"),
    });
  }
  return summaries;
}

export async function readTrackerTaskData(supabase: SupabaseClient, userId: string) {
  const taskRows = await fetchAllPages(
    (from, to) => supabase.from("tasks").select("*", { count: "exact" })
      .eq("user_id", userId).eq("synapse_active", true)
      .order("task_order", { ascending: true }).order("created_at", { ascending: true }).order("id", { ascending: true })
      .range(from, to),
    (row) => requiredString((row as Record<string, unknown>).id, "task ID"),
  );
  const courseRows = await fetchAllPages(
    (from, to) => supabase.from("synapse_courses").select("source_key, title, course_order", { count: "exact" })
      .eq("user_id", userId).eq("active", true)
      .order("course_order", { ascending: true }).order("source_key", { ascending: true })
      .range(from, to),
    (row) => requiredString((row as Record<string, unknown>).source_key, "course source key"),
  );

  const taskIds = taskRows.map((row) => requiredString((row as Record<string, unknown>).id, "task ID"));
  const visibleTaskIds = new Set(taskIds);
  const subtasksByTask = new Map<string, ReturnType<typeof mapSubtaskRow>[]>();
  const seenSubtaskIds = new Set<string>();
  for (let start = 0; start < taskIds.length; start += TASK_ID_BATCH_SIZE) {
    const ids = taskIds.slice(start, start + TASK_ID_BATCH_SIZE);
    const batchIds = new Set(ids);
    const subtaskRows = await fetchAllPages(
      (from, to) => supabase.from("subtasks").select("*", { count: "exact" })
        .in("task_id", ids)
        .order("task_id", { ascending: true }).order("subtask_order", { ascending: true }).order("id", { ascending: true })
        .range(from, to),
      (row) => requiredString((row as Record<string, unknown>).id, "subtask ID"),
    );
    for (const row of subtaskRows) {
      const value = row as Record<string, unknown>;
      const taskId = requiredString(value.task_id, "subtask task ID");
      const subtaskId = requiredString(value.id, "subtask ID");
      if (!batchIds.has(taskId) || !visibleTaskIds.has(taskId)) throw new Error("A subtask belongs to a task outside the current account task list.");
      if (seenSubtaskIds.has(subtaskId)) throw new Error("The database returned a duplicate subtask ID.");
      seenSubtaskIds.add(subtaskId);
      subtasksByTask.set(taskId, [...(subtasksByTask.get(taskId) ?? []), mapSubtaskRow(value)]);
    }
  }

  const summaryRows = taskIds.length === 0 ? [] : await fetchAllPages(
    (from, to) => supabase.rpc("task_session_summaries", {}, { count: "exact" })
      .order("task_id", { ascending: true }).range(from, to),
    (row) => requiredString((row as Record<string, unknown>).task_id, "session summary task ID"),
  );
  const focusByTask = mapSessionSummaryRows(
    summaryRows as Array<Record<string, unknown>>,
    visibleTaskIds,
  );

  return {
    synapseCourses: courseRows.map((row) => {
      const value = row as Record<string, unknown>;
      return {
        id: requiredString(value.source_key, "course source key"),
        title: requiredString(value.title, "course title"),
        order: safeCount(value.course_order, "course order"),
      };
    }),
    tasks: taskRows.map((row) => {
      const id = requiredString((row as Record<string, unknown>).id, "task ID");
      const progress = focusByTask.get(id) ?? { seconds: 0, completed: 0, linked: 0 };
      return mapTaskRow(
        row as Record<string, unknown>,
        subtasksByTask.get(id) ?? [],
        progress.seconds,
        progress.completed,
        progress.linked,
      );
    }),
  };
}
