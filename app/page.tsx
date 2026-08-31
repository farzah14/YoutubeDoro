// src/app/page.tsx
import { AuthScreen } from "@/components/auth/AuthScreen";
import YouTubeRestTimer from "@/components/YouTubeRestTimer";
import { getAuthenticatedUser } from "@/lib/supabase/auth";

export default async function Home() {
  const { user } = await getAuthenticatedUser();
  if (!user) return <AuthScreen />;
  return <YouTubeRestTimer accountEmail={user.email ?? ""} accountProvider={typeof user.app_metadata?.provider === "string" ? user.app_metadata.provider : "email"} />;
}
