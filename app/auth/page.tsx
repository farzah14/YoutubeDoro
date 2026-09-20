import { AuthScreen } from "@/components/auth/AuthScreen";

export default async function AuthPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const params = await searchParams;
  const initialError = params.error === "provider"
    ? "Use a Google account to continue."
    : params.error === "oauth"
      ? "Google sign-in could not be completed. Please try again."
      : undefined;
  return <AuthScreen initialError={initialError} />;
}
