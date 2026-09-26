import { z } from "zod";

import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { readSessionCursor, signSessionCursor } from "./cursor";

const PAGE_SIZE = 100;
const sessionSchema = z.object({
  id: z.string().uuid(),
  title: z.string().trim().min(1).max(300),
  startedAt: z.string().datetime({ offset: true }),
  endedAt: z.string().datetime({ offset: true }).nullable(),
  learningSeconds: z.number().int().nonnegative().safe(),
  updatedAt: z.string().datetime({ offset: true }),
});

export class SessionFeedError extends Error {
  constructor(public readonly code: "configuration" | "storage" | "invalid_cursor" | "cursor_expired") {
    super(code);
    this.name = "SessionFeedError";
  }
}

type SessionRow = {
  id: string;
  title: string;
  started_at: string;
  ended_at: string | null;
  learning_seconds: number;
  updated_at: string;
};

function toSession(row: SessionRow) {
  return sessionSchema.parse({
    id: row.id,
    title: row.title,
    startedAt: row.started_at,
    endedAt: row.ended_at,
    learningSeconds: Number(row.learning_seconds),
    updatedAt: row.updated_at,
  });
}

async function latestUserRevision(userId: string): Promise<number> {
  const admin = getSupabaseAdminClient();
  if (!admin) throw new SessionFeedError("configuration");
  const [{ data, error }, { data: watermark, error: watermarkError }] = await Promise.all([
    admin.from("integration_session_changes")
    .select("revision")
    .eq("user_id", userId)
    .order("revision", { ascending: false })
    .limit(1)
    .maybeSingle(),
    admin.from("integration_change_watermarks").select("pruned_through_revision").eq("user_id", userId).maybeSingle(),
  ]);
  if (error || watermarkError) throw new SessionFeedError("storage");
  return Math.max(Number(data?.revision ?? 0), Number(watermark?.pruned_through_revision ?? 0));
}

export async function getInitialSessionPage(userId: string, cursorValue: string | null) {
  const admin = getSupabaseAdminClient();
  if (!admin) throw new SessionFeedError("configuration");
  const cursor = cursorValue ? await readSessionCursor(cursorValue, userId) : null;
  if (cursorValue && !cursor) throw new SessionFeedError("invalid_cursor");
  const watermark = cursor?.watermark ?? await latestUserRevision(userId);
  let query = admin.from("learning_sessions")
    .select("id, title, started_at, ended_at, learning_seconds, updated_at")
    .eq("user_id", userId)
    .gt("learning_seconds", 0)
    .order("id", { ascending: true })
    .limit(PAGE_SIZE + 1);
  if (cursor) query = query.gt("id", cursor.lastId);
  const { data, error } = await query;
  if (error) throw new SessionFeedError("storage");
  const rows = (data ?? []) as SessionRow[];
  const hasMore = rows.length > PAGE_SIZE;
  const sessions = rows.slice(0, PAGE_SIZE).map(toSession);
  const lastId = sessions.at(-1)?.id;
  return {
    sessions,
    watermark,
    nextCursor: hasMore && lastId ? await signSessionCursor({ userId, lastId, watermark }) : null,
  };
}

export async function getActiveSessionSnapshots(userId: string) {
  const admin = getSupabaseAdminClient();
  if (!admin) throw new SessionFeedError("configuration");

  const sessions = [];
  let lastId: string | null = null;
  while (true) {
    let query = admin.from("learning_sessions")
      .select("id, title, started_at, ended_at, learning_seconds, updated_at")
      .eq("user_id", userId)
      .eq("status", "active")
      .gt("learning_seconds", 0)
      .order("id", { ascending: true })
      .limit(PAGE_SIZE);
    if (lastId) query = query.gt("id", lastId);

    const { data, error } = await query;
    if (error) throw new SessionFeedError("storage");
    const rows = (data ?? []) as SessionRow[];
    sessions.push(...rows.map(toSession));
    if (rows.length < PAGE_SIZE) break;
    lastId = rows.at(-1)?.id ?? null;
    if (!lastId) throw new SessionFeedError("storage");
  }

  return { sessions };
}

function parseRevision(value: string | null): number {
  if (!value || !/^\d{1,15}$/.test(value)) throw new SessionFeedError("invalid_cursor");
  const revision = Number(value);
  if (!Number.isSafeInteger(revision)) throw new SessionFeedError("invalid_cursor");
  return revision;
}

export async function getSessionChanges(userId: string, afterValue: string | null) {
  const admin = getSupabaseAdminClient();
  if (!admin) throw new SessionFeedError("configuration");
  const after = parseRevision(afterValue);
  const { data: watermark, error: watermarkError } = await admin.from("integration_change_watermarks")
    .select("pruned_through_revision")
    .eq("user_id", userId)
    .maybeSingle();
  if (watermarkError) throw new SessionFeedError("storage");
  if (watermark && after < Number(watermark.pruned_through_revision)) throw new SessionFeedError("cursor_expired");

  const { data, error } = await admin.from("integration_session_changes")
    .select("revision, session_id, event_type, payload")
    .eq("user_id", userId)
    .gt("revision", after)
    .order("revision", { ascending: true })
    .limit(PAGE_SIZE + 1);
  if (error) throw new SessionFeedError("storage");
  const rows = data ?? [];
  const hasMore = rows.length > PAGE_SIZE;
  const changes = rows.slice(0, PAGE_SIZE).map((row) => {
    const revision = Number(row.revision);
    if (!Number.isSafeInteger(revision) || revision <= after) throw new SessionFeedError("storage");
    if (row.event_type === "delete") return { revision, type: "delete" as const, id: row.session_id };
    const parsed = sessionSchema.safeParse(row.payload);
    if (!parsed.success || parsed.data.id !== row.session_id) throw new SessionFeedError("storage");
    return { revision, type: "upsert" as const, session: parsed.data };
  });
  return {
    changes,
    nextRevision: changes.at(-1)?.revision ?? after,
    hasMore,
  };
}
