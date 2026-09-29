import assert from "node:assert/strict";
import test from "node:test";
import type { SupabaseClient } from "@supabase/supabase-js";

import { fetchAllPages, mapSessionSummaryRows, readTrackerTaskData } from "../lib/trackerTaskRead";

type Row = { id: string };

function fakePageSource(rows: Row[], apiCap = 500, failAt?: number) {
  const ranges: Array<[number, number]> = [];
  return {
    ranges,
    load: async (from: number, to: number) => {
      ranges.push([from, to]);
      if (failAt === from) return { data: null, error: new Error("page failed"), count: rows.length };
      return { data: rows.slice(from, Math.min(to + 1, from + apiCap)), error: null, count: rows.length };
    },
  };
}

test("fetches every row using exact count at pagination boundaries", async () => {
  for (const count of [0, 499, 500, 501, 1_000, 1_001]) {
    const rows = Array.from({ length: count }, (_, index) => ({ id: `row-${index}` }));
    const source = fakePageSource(rows);
    const actual = await fetchAllPages(source.load, (row) => row.id);
    assert.deepEqual(actual, rows, `count ${count}`);
    assert.equal(new Set(actual.map((row) => row.id)).size, count);
    assert.ok(source.ranges.every(([from, to]) => to - from + 1 <= 500));
  }
});

test("continues after a page shorter than requested when the API row cap is lower", async () => {
  const rows = Array.from({ length: 1_001 }, (_, index) => ({ id: `row-${index}` }));
  const source = fakePageSource(rows, 100);

  const actual = await fetchAllPages(source.load, (row) => row.id);

  assert.equal(actual.length, 1_001);
  assert.deepEqual(source.ranges.map(([from]) => from), Array.from({ length: 11 }, (_, index) => index * 100));
});

test("fails instead of returning partial rows after a page error or invalid count", async () => {
  const rows = Array.from({ length: 501 }, (_, index) => ({ id: `row-${index}` }));
  const failed = fakePageSource(rows, 500, 500);
  await assert.rejects(fetchAllPages(failed.load, (row) => row.id), /page failed/);
  await assert.rejects(fetchAllPages<{ id: string }>(async () => ({ data: [], error: null, count: null }), (row) => row.id), /exact count/);
});

test("rejects duplicate row IDs and changing counts", async () => {
  await assert.rejects(fetchAllPages(async () => ({
    data: [{ id: "same" }, { id: "same" }], error: null, count: 2,
  }), (row) => row.id), /duplicate row ID/);

  let call = 0;
  await assert.rejects(fetchAllPages(async () => {
    call += 1;
    return { data: [{ id: `row-${call}` }], error: null, count: call === 1 ? 2 : 3 };
  }, (row) => row.id), /changed while it was being read/);
});

test("maps aggregate rows only for visible tasks and rejects invalid numeric values", () => {
  const metrics = mapSessionSummaryRows([
    { task_id: "task-a", focused_seconds: "15500", completed_sessions: "3", linked_session_count: "5" },
    { task_id: "inactive-task", focused_seconds: 8, completed_sessions: 0, linked_session_count: 1 },
  ], new Set(["task-a"]));
  assert.deepEqual(metrics.get("task-a"), { seconds: 15_500, completed: 3, linked: 5 });
  assert.equal(metrics.has("inactive-task"), false);
  assert.throws(() => mapSessionSummaryRows([
    { task_id: "task-a", focused_seconds: Number.MAX_SAFE_INTEGER + 1, completed_sessions: 0, linked_session_count: 0 },
  ], new Set(["task-a"])), /unsafe/);
  assert.throws(() => mapSessionSummaryRows([
    { task_id: "task-a", focused_seconds: "not-a-number", completed_sessions: 0, linked_session_count: 0 },
  ], new Set(["task-a"])), /unsafe/);
  assert.throws(() => mapSessionSummaryRows([
    { task_id: "inactive-task", focused_seconds: "not-a-number", completed_sessions: 0, linked_session_count: 0 },
  ], new Set(["task-a"])), /unsafe/);
  assert.throws(() => mapSessionSummaryRows([
    { task_id: "inactive-task", focused_seconds: 0, completed_sessions: 0, linked_session_count: -1 },
  ], new Set(["task-a"])), /unsafe/);
  assert.throws(() => mapSessionSummaryRows([
    { task_id: "task-a", focused_seconds: 0, completed_sessions: 0, linked_session_count: 0 },
    { task_id: "task-a", focused_seconds: 0, completed_sessions: 0, linked_session_count: 0 },
  ], new Set(["task-a"])), /duplicate task summary/);
  assert.throws(() => mapSessionSummaryRows([
    { task_id: "inactive-task", focused_seconds: 0, completed_sessions: 0, linked_session_count: 0 },
    { task_id: "inactive-task", focused_seconds: 0, completed_sessions: 0, linked_session_count: 0 },
  ], new Set(["task-a"])), /duplicate task summary/);
});

function fakeSupabase(data: {
  tasks: Array<Record<string, unknown>>;
  courses: Array<Record<string, unknown>>;
  subtasks: Array<Record<string, unknown>>;
  summaries: Array<Record<string, unknown>>;
}, pageCap = 500) {
  const subtaskBatches: string[][] = [];
  const queriedTables: string[] = [];
  let rpcCalls = 0;

  function query(rows: Array<Record<string, unknown>>, table: string) {
    let selectedTaskIds: string[] | null = null;
    const builder = {
      select: () => builder,
      eq: () => builder,
      order: () => builder,
      in: (_column: string, ids: string[]) => {
        selectedTaskIds = ids;
        if (!subtaskBatches.some((batch) => batch.length === ids.length && batch.every((id, index) => id === ids[index]))) {
          subtaskBatches.push([...ids]);
        }
        return builder;
      },
      range: async (from: number, to: number) => {
        const matchingRows = selectedTaskIds
          ? rows.filter((row) => selectedTaskIds?.includes(String(row.task_id)))
          : rows;
        return {
          data: matchingRows.slice(from, Math.min(to + 1, from + pageCap)),
          error: null,
          count: matchingRows.length,
        };
      },
    };
    queriedTables.push(table);
    return builder;
  }

  const supabase = {
    from: (table: string) => query(
      table === "tasks" ? data.tasks : table === "synapse_courses" ? data.courses : data.subtasks,
      table,
    ),
    rpc: () => {
      rpcCalls += 1;
      return query(data.summaries, "rpc");
    },
  };
  return {
    client: supabase as unknown as SupabaseClient,
    subtaskBatches,
    queriedTables,
    get rpcCalls() { return rpcCalls; },
  };
}

test("reads every task and subtask across 50-ID batches and maps visible summaries", async () => {
  const tasks = Array.from({ length: 51 }, (_, index) => ({
    id: `task-${index}`,
    user_id: "user-a",
    title: `Task ${index}`,
    task_order: index,
    created_at: "2026-01-01T00:00:00.000Z",
  }));
  const subtasks = [
    ...Array.from({ length: 1_001 }, (_, index) => ({
      id: `subtask-${index}`,
      task_id: "task-0",
      text: `Child ${index}`,
      completed: false,
      subtask_order: index,
      created_at: "2026-01-01T00:00:00.000Z",
    })),
    ...tasks.slice(1).map((task, index) => ({
      id: `subtask-other-${index}`,
      task_id: task.id,
      text: `Child ${index}`,
      completed: false,
      subtask_order: 0,
      created_at: "2026-01-01T00:00:00.000Z",
    })),
  ];
  const source = fakeSupabase({
    tasks,
    courses: [{ source_key: "course-a", title: "Course A", course_order: 0 }],
    subtasks,
    summaries: [
      { task_id: "task-0", focused_seconds: "12502500", completed_sessions: "2500", linked_session_count: "5000" },
      { task_id: "inactive-task", focused_seconds: "800", completed_sessions: "1", linked_session_count: "1" },
    ],
  }, 100);

  const result = await readTrackerTaskData(source.client, "user-a");

  assert.equal(result.tasks.length, 51);
  assert.deepEqual(source.subtaskBatches.map((batch) => batch.length), [50, 1]);
  assert.equal(result.tasks.reduce((count, task) => count + task.subtasks.length, 0), 1_051);
  assert.equal(result.tasks[0].subtasks.length, 1_001);
  assert.deepEqual(
    [result.tasks[0].focusedSeconds, result.tasks[0].completedSessions, result.tasks[0].linkedSessionCount],
    [12_502_500, 2_500, 5_000],
  );
  assert.deepEqual(
    [result.tasks[1].focusedSeconds, result.tasks[1].completedSessions, result.tasks[1].linkedSessionCount],
    [0, 0, 0],
  );
  assert.deepEqual(result.synapseCourses, [{ id: "course-a", title: "Course A", order: 0 }]);
  assert.equal(source.rpcCalls, 1);
  assert.equal(source.queriedTables.includes("learning_sessions"), false);
});

test("pages more than 1,000 active tasks and aggregate rows without dropping any", async () => {
  const tasks = Array.from({ length: 1_001 }, (_, index) => ({
    id: `task-${index}`,
    user_id: "user-a",
    title: `Task ${index}`,
    task_order: index,
    created_at: "2026-01-01T00:00:00.000Z",
  }));
  const summaries = tasks.map((task, index) => ({
    task_id: task.id,
    focused_seconds: String(index * 10),
    completed_sessions: String(index % 3),
    linked_session_count: String(index % 5),
  }));
  const source = fakeSupabase({ tasks, courses: [], subtasks: [], summaries }, 100);

  const result = await readTrackerTaskData(source.client, "user-a");

  assert.equal(result.tasks.length, 1_001);
  assert.deepEqual([result.tasks[1_000].focusedSeconds, result.tasks[1_000].completedSessions, result.tasks[1_000].linkedSessionCount], [10_000, 1, 0]);
  assert.equal(source.rpcCalls, 11);
});

test("skips subtask and summary reads when the owner has no active tasks", async () => {
  const source = fakeSupabase({
    tasks: [],
    courses: [{ source_key: "course-a", title: "Course A", course_order: 0 }],
    subtasks: [],
    summaries: [],
  });

  const result = await readTrackerTaskData(source.client, "user-a");

  assert.deepEqual(result.tasks, []);
  assert.deepEqual(result.synapseCourses, [{ id: "course-a", title: "Course A", order: 0 }]);
  assert.deepEqual(source.queriedTables, ["tasks", "synapse_courses"]);
  assert.equal(source.rpcCalls, 0);
});
