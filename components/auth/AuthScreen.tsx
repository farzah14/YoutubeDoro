"use client";

import { useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

interface AuthScreenProps {
  initialError?: string;
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" role="img">
      <path fill="#4285F4" d="M21.35 12.27c0-.73-.06-1.27-.2-1.83H12v3.46h5.37a4.58 4.58 0 0 1-1.99 3.01v2.51h3.23c1.9-1.75 2.74-4.33 2.74-7.15Z" />
      <path fill="#34A853" d="M12 21.75c2.7 0 4.97-.9 6.62-2.44l-3.23-2.51c-.9.6-2.05.96-3.39.96-2.6 0-4.8-1.76-5.59-4.12H3.07v2.59A9.99 9.99 0 0 0 12 21.75Z" />
      <path fill="#FBBC05" d="M6.41 13.64A6 6 0 0 1 6.1 12c0-.57.11-1.13.3-1.64V7.77H3.07A9.99 9.99 0 0 0 2 12c0 1.61.39 3.14 1.07 4.23l3.34-2.59Z" />
      <path fill="#EA4335" d="M12 6.24c1.47 0 2.79.5 3.83 1.5l2.87-2.87C16.96 3.26 14.7 2.25 12 2.25a9.99 9.99 0 0 0-8.93 5.52l3.34 2.59C7.2 8 9.4 6.24 12 6.24Z" />
    </svg>
  );
}

export function AuthScreen({ initialError }: AuthScreenProps) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(initialError ?? "");

  const signInWithGoogle = async () => {
    setError("");
    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      setError("Supabase is not configured. Add the public values from .env.example.");
      return;
    }

    setBusy(true);
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (oauthError) {
      setBusy(false);
      setError(oauthError.message);
    }
  };

  return (
    <main className="auth-screen">
      <section className="auth-card" aria-label="StudyRythms login">
        <div className="auth-card__header">
          <h1 id="auth-title">Login</h1>
        </div>

        <button
          type="button"
          className="auth-google"
          onClick={() => { void signInWithGoogle(); }}
          disabled={busy}
          aria-busy={busy}
        >
          <span className="auth-google__content">
            <span className="auth-google__icon" aria-hidden="true"><GoogleIcon /></span>
            <span>{busy ? "Opening Google…" : "Continue with Google"}</span>
          </span>
        </button>

        {error && <p className="auth-message auth-message--error" role="alert">{error}</p>}
      </section>
    </main>
  );
}
