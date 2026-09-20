import { hasGoogleIdentity } from "./googleIdentity";
import { createSupabaseServerClient, hasSupabaseConfig } from "./server";

const googleRequiredError = () => new Error("Google authentication is required.");

export async function getAuthenticatedUser() {
  if (!hasSupabaseConfig()) return { user: null, error: new Error("Supabase is not configured.") };
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { user: null, error: new Error("Supabase is not configured.") };
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return { user: null, error };
  if (!hasGoogleIdentity(data.user)) return { user: null, error: googleRequiredError() };
  return { user: data.user, error: null };
}

export async function getAuthenticatedContext() {
  if (!hasSupabaseConfig()) return { supabase: null, user: null, error: new Error("Supabase is not configured.") };
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { supabase: null, user: null, error: new Error("Supabase is not configured.") };
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return { supabase, user: null, error };
  if (!hasGoogleIdentity(data.user)) return { supabase, user: null, error: googleRequiredError() };
  return { supabase, user: data.user, error: null };
}
