import { NextRequest, NextResponse } from "next/server";
import { hasGoogleIdentity } from "@/lib/supabase/googleIdentity";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function safeNext(value: string | null) {
  return value && value.startsWith("/") && !value.startsWith("//") ? value : "/";
}

function authErrorRedirect(request: NextRequest, reason?: string) {
  const target = new URL("/auth", request.url);
  target.searchParams.set("error", "oauth");
  if (reason) target.searchParams.set("reason", reason);
  return NextResponse.redirect(target);
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const flowId = url.searchParams.get("sb_flow_id");
  const providerError = url.searchParams.get("error_code");
  const next = safeNext(url.searchParams.get("next"));
  const supabase = await createSupabaseServerClient();
  if (!supabase || !code) {
    return authErrorRedirect(request, providerError === "bad_oauth_state" ? providerError : undefined);
  }

  const { error } = await supabase.auth.exchangeCodeForSession(
    code,
    flowId ? { flowId } : undefined,
  );
  if (error) {
    return authErrorRedirect(request, error.code === "bad_oauth_state" ? error.code : undefined);
  }

  const { data, error: userError } = await supabase.auth.getUser();
  if (userError || !hasGoogleIdentity(data.user)) {
    await supabase.auth.signOut();
    return NextResponse.redirect(new URL("/auth?error=provider", request.url));
  }

  return NextResponse.redirect(new URL(next, request.url));
}
