import assert from "node:assert/strict";
import { test } from "node:test";

import { synapsePlanSchema } from "../lib/integrations/synapse/plan";

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
