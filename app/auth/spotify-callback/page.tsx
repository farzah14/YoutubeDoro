"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { exchangeSpotifyCode, fetchSpotifyUserProfile } from "@/lib/spotifyApi";

function SpotifyCallbackHandler() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState("Connecting to Spotify…");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const code = searchParams.get("code");
    const oauthError = searchParams.get("error");

    if (oauthError) {
      setError(`Spotify authorization error: ${oauthError}`);
      return;
    }

    if (!code) {
      setError("No authorization code returned from Spotify.");
      return;
    }

    const redirectUri = `${window.location.origin}/auth/spotify-callback`;

    async function handleExchange() {
      try {
        const token = await exchangeSpotifyCode(code!, redirectUri);
        if (!token) {
          setError("Failed to exchange authorization code with Spotify. Check your Client ID configuration.");
          return;
        }

        setStatus("Fetching profile…");
        await fetchSpotifyUserProfile(token.accessToken);
        setStatus("Connected! Redirecting…");
        router.replace("/");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unexpected error during Spotify connection.");
      }
    }

    void handleExchange();
  }, [router, searchParams]);

  return (
    <div className="max-w-md w-full border border-border-subtle bg-surface-secondary p-6 text-center space-y-4">
      <h1 className="text-base font-bold tracking-wide uppercase text-accent">Spotify Music Connection</h1>
      {error ? (
        <div className="space-y-4">
          <p className="text-xs text-rose-400">{error}</p>
          <button
            type="button"
            className="px-4 py-2 text-xs bg-surface-hover border border-border-subtle hover:border-accent"
            onClick={() => router.replace("/")}
          >
            Return to StudyRythms
          </button>
        </div>
      ) : (
        <p className="text-xs text-text-muted animate-pulse">{status}</p>
      )}
    </div>
  );
}

export default function SpotifyCallbackPage() {
  return (
    <main className="flex min-h-screen items-center justify-center p-6 bg-background text-foreground font-mono">
      <Suspense fallback={<div className="text-xs text-text-muted">Loading…</div>}>
        <SpotifyCallbackHandler />
      </Suspense>
    </main>
  );
}
