import assert from "node:assert/strict";
import { test } from "node:test";

import { synapsePlanSchema } from "../lib/integrations/synapse/plan";
import { MAX_PLAN_PAYLOAD_BYTES, parsePlanRequestBody } from "../lib/integrations/synapse/planPayload";

const courseId = "a83b21d0-9597-41f2-98bf-489aa2ba02a1";
const taskId = "b83b21d0-9597-41f2-98bf-489aa2ba02a2";
const subtaskId = "c83b21d0-9597-41f2-98bf-489aa2ba02a3";
const plan = {
  sourceUserId: "synapse-user-1",
  snapshotAt: "2026-09-26T10:00:00.000Z",
  courses: [{ id: courseId, title: "Learning SQL", order: 0 }],
  priorities: [{
    id: taskId, title: "Review joins", completed: false, estimatedMinutes: 25,
    courseId, order: 0,
    subtasks: [{ id: subtaskId, text: "Try an inner join", completed: false, order: 0 }],
  }],
};

test("accepts a scoped plan with courses, selected priorities, and sub-tasks", () => {
  assert.equal(synapsePlanSchema.safeParse(plan).success, true);
  assert.equal(synapsePlanSchema.safeParse({ ...plan, priorities: [] }).success, true);
  assert.equal(synapsePlanSchema.safeParse({ ...plan, priorities: [{
    ...plan.priorities[0],
    subtasks: [{ ...plan.priorities[0].subtasks[0], completedChangedAt: "2026-09-28T02:00:00.000Z" }],
  }] }).success, true);
  assert.equal(synapsePlanSchema.safeParse({ ...plan, priorities: [{
    ...plan.priorities[0],
    subtasks: [{ ...plan.priorities[0].subtasks[0], completedChangedAt: "yesterday" }],
  }] }).success, false);
});

test("rejects missing course references and duplicate source identifiers", () => {
  assert.equal(synapsePlanSchema.safeParse({ ...plan, courses: [] }).success, false);
  assert.equal(synapsePlanSchema.safeParse({ ...plan, courses: [plan.courses[0], plan.courses[0]] }).success, false);
  assert.equal(synapsePlanSchema.safeParse({ ...plan, priorities: [plan.priorities[0], plan.priorities[0]] }).success, false);
  assert.equal(synapsePlanSchema.safeParse({
    ...plan,
    priorities: [{ ...plan.priorities[0], subtasks: [plan.priorities[0].subtasks[0], plan.priorities[0].subtasks[0]] }],
  }).success, false);
});

test("accepts one priority for every starred course and every selected task", () => {
  const uuid = (value: number) => `00000000-0000-4000-8000-${value.toString(16).padStart(12, "0")}`;
  const boundaryPlan = {
    ...plan,
    courses: Array.from({ length: 200 }, (_, index) => ({
      id: uuid(index + 1), title: `Course ${index + 1}`, order: index,
    })),
    priorities: Array.from({ length: 400 }, (_, index) => ({
      id: uuid(index + 1_000), title: `Priority ${index + 1}`, completed: false,
      estimatedMinutes: 25, courseId: index < 200 ? uuid(index + 1) : null,
      order: index, subtasks: [],
    })),
  };
  assert.equal(synapsePlanSchema.safeParse(boundaryPlan).success, true);
  assert.equal(synapsePlanSchema.safeParse({
    ...boundaryPlan,
    priorities: [...boundaryPlan.priorities, { ...boundaryPlan.priorities[0], id: uuid(9999), order: 400 }],
  }).success, false);
});

test("measures the actual request byte count at the inclusive plan payload boundary", async () => {
  const atLimit = new Request("https://example.test/plan", {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: `${" ".repeat(MAX_PLAN_PAYLOAD_BYTES - 4)}null`,
  });
  const overLimit = new Request("https://example.test/plan", {
    method: "PUT",
    headers: { "content-type": "application/json", "content-length": "1" },
    body: `${" ".repeat(MAX_PLAN_PAYLOAD_BYTES - 3)}null`,
  });

  assert.deepEqual(await parsePlanRequestBody(atLimit), { kind: "parsed", value: null });
  assert.deepEqual(await parsePlanRequestBody(overLimit), { kind: "too_large" });
});

test("rejects a valid multibyte plan whose UTF-8 request body exceeds 512 KiB", async () => {
  const uuid = (value: number) => `00000000-0000-4000-8000-${value.toString(16).padStart(12, "0")}`;
  let nextId = 1;
  const validLargePlan = {
    sourceUserId: "synapse-user-1",
    snapshotAt: "2026-09-26T10:00:00.000Z",
    courses: [],
    priorities: Array.from({ length: 10 }, (_, taskIndex) => ({
      id: uuid(nextId++), title: `Priority ${taskIndex}`, completed: false,
      estimatedMinutes: 25, courseId: null, order: taskIndex,
      subtasks: Array.from({ length: 100 }, (_, subtaskIndex) => ({
        id: uuid(nextId++), text: "界".repeat(240), completed: false, order: subtaskIndex,
      })),
    })),
  };
  const raw = JSON.stringify(validLargePlan);
  assert.equal(synapsePlanSchema.safeParse(validLargePlan).success, true);
  assert.ok(raw.length < MAX_PLAN_PAYLOAD_BYTES);
  assert.ok(Buffer.byteLength(raw, "utf8") > MAX_PLAN_PAYLOAD_BYTES);

  const requestWithoutLength = new Request("https://example.test/plan", {
    method: "PUT", headers: { "content-type": "application/json" }, body: raw,
  });
  const requestWithUnderstatedLength = new Request("https://example.test/plan", {
    method: "PUT", headers: { "content-type": "application/json", "content-length": "1" }, body: raw,
  });

  assert.deepEqual(await parsePlanRequestBody(requestWithoutLength), { kind: "too_large" });
  assert.deepEqual(await parsePlanRequestBody(requestWithUnderstatedLength), { kind: "too_large" });
});

test("rejects malformed JSON and invalid UTF-8 plan request bodies", async () => {
  const malformed = new Request("https://example.test/plan", { method: "PUT", body: "{" });
  const invalidUtf8 = new Request("https://example.test/plan", { method: "PUT", body: new Uint8Array([0xff]) });
  assert.deepEqual(await parsePlanRequestBody(malformed), { kind: "invalid_request" });
  assert.deepEqual(await parsePlanRequestBody(invalidUtf8), { kind: "invalid_request" });
});
