import { NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getAuthenticatedUser } from "@/lib/supabase/auth";
import { mapSessionRow } from "@/lib/trackerModel";

function errorResponse(message: string, status: number, details?: unknown) {
  return NextResponse.json({ error: message, details }, { status });
}

export async function POST() {
  const parsed = z.object({}).safeParse({});
  if (!parsed.success) return errorResponse("Invalid recovery request.", 400);
  const { user } = await getAuthenticatedUser();
  if (!user) return errorResponse("Authentication required.", 401);
  const supabase = await createSupabaseServerClient();
  if (!supabase) return errorResponse("Supabase is not configured.", 500);
  const { data, error } = await supabase.from("learning_sessions")
    .update({ status: "interrupted", ended_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq("user_id", user.id)
    .eq("status", "active")
    .select();
  if (error) return errorResponse(error.message, 500);
  return NextResponse.json({ sessions: (data ?? []).map(mapSessionRow) });
}
