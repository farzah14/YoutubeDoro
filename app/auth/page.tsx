import { AuthScreen } from "@/components/auth/AuthScreen";
import { getOAuthErrorMessage } from "@/lib/supabase/oauthError";

export default async function AuthPage({ searchParams }: {
  searchParams: Promise<{ error?: string; error_code?: string; reason?: string }>;
}) {
  const params = await searchParams;
  const initialError = getOAuthErrorMessage({
    error: params.error,
    errorCode: params.error_code,
    reason: params.reason,
  });
  return <AuthScreen initialError={initialError} />;
}
