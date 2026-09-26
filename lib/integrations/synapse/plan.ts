import { z } from "zod";

import { getSupabaseAdminClient } from "@/lib/supabase/admin";

const uuid = z.string().uuid();
const course = z.object({
  id: uuid,
  title: z.string().trim().min(1).max(120),
  order: z.number().int().min(0).max(100_000),
}).strict();
const subtask = z.object({
  id: uuid,
  text: z.string().trim().min(1).max(240),
  completed: z.boolean(),
  order: z.number().int().min(0).max(100_000),
}).strict();
const priority = z.object({
  id: uuid,
  title: z.string().trim().min(1).max(240),
  completed: z.boolean(),
  estimatedMinutes: z.number().int().min(5).max(480),
  courseId: uuid.nullable(),
  order: z.number().int().min(0).max(100_000),
  subtasks: z.array(subtask).max(100),
}).strict();

export const synapsePlanSchema = z.object({
  sourceUserId: z.string().trim().min(1).max(128),
  snapshotAt: z.string().datetime({ offset: true }),
  courses: z.array(course).max(200),
  priorities: z.array(priority).max(200),
}).strict().superRefine((plan, context) => {
  const courseIds = new Set(plan.courses.map((item) => item.id));
  if (courseIds.size !== plan.courses.length) {
    context.addIssue({ code: z.ZodIssueCode.custom, message: "Duplicate course IDs." });
  }
  const taskIds = new Set<string>();
  let subtaskCount = 0;
  for (const task of plan.priorities) {
    if (taskIds.has(task.id)) context.addIssue({ code: z.ZodIssueCode.custom, message: "Duplicate priority IDs." });
    taskIds.add(task.id);
    if (task.courseId && !courseIds.has(task.courseId)) {
      context.addIssue({ code: z.ZodIssueCode.custom, message: "Priority course is missing." });
    }
    const subtaskIds = new Set(task.subtasks.map((item) => item.id));
    if (subtaskIds.size !== task.subtasks.length) {
      context.addIssue({ code: z.ZodIssueCode.custom, message: "Duplicate sub-task IDs." });
    }
    subtaskCount += task.subtasks.length;
  }
  if (subtaskCount > 1_000) context.addIssue({ code: z.ZodIssueCode.custom, message: "Too many sub-tasks." });
});

export type SynapsePlan = z.infer<typeof synapsePlanSchema>;

export async function applySynapsePlan(ownerId: string, plan: SynapsePlan): Promise<boolean> {
  const admin = getSupabaseAdminClient();
  if (!admin) throw new Error("StudyRythms integration storage is not configured.");
  const { data, error } = await admin.rpc("apply_synapse_plan", {
    p_user_id: ownerId,
    p_source_user_id: plan.sourceUserId,
    p_snapshot_at: plan.snapshotAt,
    p_courses: plan.courses,
    p_priorities: plan.priorities,
  });
  if (error || typeof data !== "boolean") throw new Error("Could not save the Synapse study plan.");
  return data;
}
