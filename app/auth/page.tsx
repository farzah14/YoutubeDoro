import { AuthScreen } from "@/components/auth/AuthScreen";

export default async function AuthPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const params = await searchParams;
  return <AuthScreen initialError={params.error === "oauth" ? "Google sign-in could not be completed. Please try again." : undefined} />;
}
