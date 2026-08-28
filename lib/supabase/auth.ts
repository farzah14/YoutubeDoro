import { createSupabaseServerClient, hasSupabaseConfig } from "./server";

export async function getAuthenticatedUser() {
  if (!hasSupabaseConfig()) return { user: null, error: new Error("Supabase is not configured.") };
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { user: null, error: new Error("Supabase is not configured.") };
  const { data, error } = await supabase.auth.getUser();
  return { user: data.user, error };
}

export async function getAuthenticatedContext() {
  if (!hasSupabaseConfig()) return { supabase: null, user: null, error: new Error("Supabase is not configured.") };
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { supabase: null, user: null, error: new Error("Supabase is not configured.") };
  const { data, error } = await supabase.auth.getUser();
  return { supabase, user: data.user, error };
}
