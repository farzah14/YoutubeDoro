// src/app/page.tsx
import { AuthScreen } from "@/components/auth/AuthScreen";
import YouTubeRestTimer from "@/components/YouTubeRestTimer";
import { getAuthenticatedUser } from "@/lib/supabase/auth";

export default async function Home() {
  const { user, error } = await getAuthenticatedUser();
  if (!user) return <AuthScreen initialError={error && error.message !== "Supabase is not configured." ? "Your sign-in session is unavailable. Please sign in again." : undefined} />;
  return <YouTubeRestTimer />;
}
