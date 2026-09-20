// src/app/page.tsx
import { AuthScreen } from "@/components/auth/AuthScreen";
import YouTubeRestTimer from "@/components/YouTubeRestTimer";
import { getAuthenticatedUser } from "@/lib/supabase/auth";
import { getOAuthErrorMessage } from "@/lib/supabase/oauthError";

export default async function Home({ searchParams }: {
  searchParams: Promise<{ error?: string; error_code?: string; reason?: string }>;
}) {
  const params = await searchParams;
  const { user } = await getAuthenticatedUser();
  if (!user) {
    return (
      <AuthScreen
        initialError={getOAuthErrorMessage({
          error: params.error,
          errorCode: params.error_code,
          reason: params.reason,
        })}
      />
    );
  }
  return <YouTubeRestTimer accountEmail={user.email ?? ""} />;
}
