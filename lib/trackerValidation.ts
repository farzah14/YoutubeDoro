import { z } from "zod";

export const timerModeSchema = z.enum(["pomodoro", "countdown", "stopwatch", "animedoro", "52-17"]);
export const sessionStatusSchema = z.enum(["active", "completed", "stopped", "interrupted", "legacy"]);
export const uuidSchema = z.string().uuid();
const titleSchema = z.string().trim().min(1).max(240);
const noteSchema = z.string().max(20_000);
const secondsSchema = z.number().int().min(0).max(31_536_000);
const dateSchema = z.string().refine((value) => {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return !Number.isNaN(Date.parse(`${value}T00:00:00Z`));
  return !Number.isNaN(Date.parse(value));
}, "Invalid date");

export const taskCreateSchema = z.object({
  title: titleSchema,
  completed: z.boolean().optional().default(false),
  estimatedMinutes: z.number().int().min(5).max(480).optional().default(25),
  emoji: z.string().trim().min(1).max(8).optional().default("✦"),
  color: z.string().regex(/^#[0-9a-f]{6}$/i).optional().default("#7c3aed"),
  order: z.number().int().min(0).max(100_000).optional().default(0),
  sourceKey: z.string().trim().min(1).max(500).optional(),
}).strict();

export const taskPatchSchema = z.object({
  title: titleSchema.optional(),
  completed: z.boolean().optional(),
  estimatedMinutes: z.number().int().min(5).max(480).optional(),
  emoji: z.string().trim().min(1).max(8).optional(),
  color: z.string().regex(/^#[0-9a-f]{6}$/i).optional(),
  order: z.number().int().min(0).max(100_000).optional(),
}).strict();

export const subtaskCreateSchema = z.object({
  text: titleSchema,
  completed: z.boolean().optional().default(false),
  order: z.number().int().min(0).max(100_000).optional().default(0),
}).strict();

export const subtaskPatchSchema = z.object({
  text: titleSchema.optional(),
  completed: z.boolean().optional(),
  order: z.number().int().min(0).max(100_000).optional(),
}).strict();

export const sessionCreateSchema = z.object({
  taskId: uuidSchema.nullable().optional(),
  taskTitleSnapshot: titleSchema,
  title: titleSchema,
  timerMode: timerModeSchema,
  plannedSeconds: secondsSchema.nullable().optional(),
  startedAt: z.string().datetime({ offset: true }).optional(),
}).strict();

export const sessionPatchSchema = z.object({
  learningSeconds: secondsSchema.optional(),
  breakCount: z.number().int().min(0).max(10_000).optional(),
  breakSeconds: secondsSchema.optional(),
  status: sessionStatusSchema.optional(),
  title: titleSchema.optional(),
  taskId: uuidSchema.nullable().optional(),
  note: noteSchema.optional(),
  endedAt: z.string().datetime({ offset: true }).nullable().optional(),
}).strict();

export const sessionFilterSchema = z.object({
  from: dateSchema.optional(),
  to: dateSchema.optional(),
  taskId: uuidSchema.optional(),
  limit: z.number().int().min(1).max(100).default(50),
}).strict();

export const migrationKeySchema = z.string().trim().min(10).max(200);

const migrationSubtaskSchema = z.object({
  sourceKey: z.string().trim().min(1).max(500),
  text: titleSchema,
  completed: z.boolean(),
  order: z.number().int().min(0).max(100_000),
}).strict();

const migrationTaskSchema = z.object({
  sourceKey: z.string().trim().min(1).max(500),
  title: titleSchema,
  estimatedMinutes: z.number().int().min(5).max(480),
  completed: z.boolean(),
  emoji: z.string().trim().min(1).max(8),
  color: z.string().regex(/^#[0-9a-f]{6}$/i),
  order: z.number().int().min(0).max(100_000),
  subtasks: z.array(migrationSubtaskSchema).max(500),
}).strict();

const migrationSessionSchema = z.object({
  sourceKey: z.string().trim().min(1).max(500),
  title: titleSchema,
  taskTitleSnapshot: titleSchema,
  timerMode: timerModeSchema,
  learningSeconds: secondsSchema,
  breakSeconds: secondsSchema,
  breakCount: z.number().int().min(0).max(10_000).nullable(),
  note: noteSchema,
  startedAt: z.string().datetime({ offset: true }),
  endedAt: z.string().datetime({ offset: true }),
}).strict();

export const browserMigrationSchema = z.object({
  migrationKey: migrationKeySchema,
  tasks: z.array(migrationTaskSchema).max(1_000),
  sessions: z.array(migrationSessionSchema).max(5_000),
}).strict();

export function parseSessionFilters(searchParams: URLSearchParams) {
  return sessionFilterSchema.safeParse({
    from: searchParams.get("from") || undefined,
    to: searchParams.get("to") || undefined,
    taskId: searchParams.get("taskId") || undefined,
    limit: searchParams.get("limit") ? Number(searchParams.get("limit")) : undefined,
  });
}
