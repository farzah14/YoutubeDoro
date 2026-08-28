"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

let browserClient: SupabaseClient | null = null;

export function getSupabaseBrowserClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key || typeof window === "undefined") return null;
  browserClient ??= createBrowserClient(url, key);
  return browserClient;
}

export async function signOut() {
  const client = getSupabaseBrowserClient();
  if (!client) return { error: new Error("Supabase is not configured.") };
  return client.auth.signOut();
}
