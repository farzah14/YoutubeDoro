"use client";

import { FormEvent, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

type AuthMode = "sign-in" | "sign-up" | "reset";
type AccountMode = Exclude<AuthMode, "reset">;

interface AuthScreenProps {
  initialError?: string;
}

export function AuthScreen({ initialError }: AuthScreenProps) {
  const [mode, setMode] = useState<AuthMode>("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(initialError ?? "");
  const [message, setMessage] = useState("");

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setMessage("");
    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      setError("Supabase is not configured. Add the public values from .env.example.");
      return;
    }

    if (mode === "reset") {
      setBusy(true);
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      });
      setBusy(false);
      if (resetError) setError(resetError.message);
      else setMessage("If an account exists for that email, a reset link has been sent.");
      return;
    }

    if (mode === "sign-up" && password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setBusy(true);
    const result = mode === "sign-in"
      ? await supabase.auth.signInWithPassword({ email: email.trim(), password })
      : await supabase.auth.signUp({ email: email.trim(), password });
    setBusy(false);
    if (result.error) {
      setError(result.error.message);
      return;
    }
    if (result.data.session) window.location.assign("/");
    else if (mode === "sign-up") setMessage("Account created. You can continue to sign in.");
    else window.location.assign("/");
  };

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

  const changeAccountMode = (nextMode: AccountMode) => {
    setMode(nextMode);
    setError("");
    setMessage("");
  };

  const isSignUp = mode === "sign-up";
  const isReset = mode === "reset";
  const title = isReset ? "Reset your password" : isSignUp ? "Start your quiet practice" : "Welcome back";
  const modeLabel = isReset ? "password reset" : isSignUp ? "new account" : "sign in";

  return (
    <main className="auth-screen">
      <section className="auth-card" aria-labelledby="auth-title">
          <div className="auth-card__header">
            <div>
              <p className="eyebrow">Account / {modeLabel}</p>
              <h1 id="auth-title">{title}</h1>
            </div>
          </div>

          {!isReset && (
            <div className="auth-mode-switch" role="group" aria-label="Choose account action">
              <button
                type="button"
                className={mode === "sign-in" ? "is-active" : ""}
                aria-pressed={mode === "sign-in"}
                onClick={() => changeAccountMode("sign-in")}
              >
                Sign in
              </button>
              <button
                type="button"
                className={mode === "sign-up" ? "is-active" : ""}
                aria-pressed={mode === "sign-up"}
                onClick={() => changeAccountMode("sign-up")}
              >
                Create account
              </button>
            </div>
          )}

          {!isReset && (
            <button
              type="button"
              className="auth-google"
              onClick={() => { void signInWithGoogle(); }}
              disabled={busy}
            >
              <span className="auth-google__content">
                <span className="auth-google__icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" role="img">
                    <path fill="#4285F4" d="M21.35 12.27c0-.73-.06-1.27-.2-1.83H12v3.46h5.37a4.58 4.58 0 0 1-1.99 3.01v2.51h3.23c1.9-1.75 2.74-4.33 2.74-7.15Z" />
                    <path fill="#34A853" d="M12 21.75c2.7 0 4.97-.9 6.62-2.44l-3.23-2.51c-.9.6-2.05.96-3.39.96-2.6 0-4.8-1.76-5.59-4.12H3.07v2.59A9.99 9.99 0 0 0 12 21.75Z" />
                    <path fill="#FBBC05" d="M6.41 13.64A6 6 0 0 1 6.1 12c0-.57.11-1.13.3-1.64V7.77H3.07A9.99 9.99 0 0 0 2 12c0 1.61.39 3.14 1.07 4.23l3.34-2.59Z" />
                    <path fill="#EA4335" d="M12 6.24c1.47 0 2.79.5 3.83 1.5l2.87-2.87C16.96 3.26 14.7 2.25 12 2.25a9.99 9.99 0 0 0-8.93 5.52l3.34 2.59C7.2 8 9.4 6.24 12 6.24Z" />
                  </svg>
                </span>
                <span>Continue with Google</span>
              </span>
              <span className="auth-button__arrow" aria-hidden="true">↗</span>
            </button>
          )}
          {!isReset && <div className="auth-divider"><span>or use email</span></div>}

          <form onSubmit={submit} className="auth-form" aria-busy={busy}>
            <div className="auth-field">
              <div className="auth-field__label-row">
                <label htmlFor="auth-email">Email address</label>
                <span className="auth-field__meta">Required</span>
              </div>
              <input
                id="auth-email"
                type="email"
                autoComplete="email"
                inputMode="email"
                placeholder="you@example.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </div>

            {!isReset && (
              <div className="auth-field">
                <div className="auth-field__label-row">
                  <label htmlFor="auth-password">Password</label>
                  {mode === "sign-in" && (
                    <button
                      type="button"
                      className="auth-inline-link"
                      onClick={() => { setMode("reset"); setError(""); setMessage(""); }}
                    >
                      Forgot password?
                    </button>
                  )}
                </div>
                <input
                  id="auth-password"
                  type="password"
                  autoComplete={isSignUp ? "new-password" : "current-password"}
                  placeholder={isSignUp ? "At least 8 characters" : "Enter your password"}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  minLength={8}
                  required
                />
              </div>
            )}

            {isSignUp && (
              <div className="auth-field">
                <div className="auth-field__label-row">
                  <label htmlFor="auth-confirm-password">Confirm password</label>
                  <span className="auth-field__meta">Required</span>
                </div>
                <input
                  id="auth-confirm-password"
                  type="password"
                  autoComplete="new-password"
                  placeholder="Repeat your password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  minLength={8}
                  required
                />
              </div>
            )}

            <button type="submit" className="auth-submit" disabled={busy}>
              <span>{busy ? "Working…" : isReset ? "Send reset link" : isSignUp ? "Create account" : "Sign in"}</span>
              <span className="auth-button__arrow" aria-hidden="true">→</span>
            </button>
          </form>

          {error && <p className="auth-message auth-message--error" role="alert">{error}</p>}
          {message && <p className="auth-message" role="status">{message}</p>}

          <div className="auth-links">
            {isReset ? (
              <button type="button" onClick={() => { changeAccountMode("sign-in"); }}>
                <span aria-hidden="true">←</span> Back to sign in
              </button>
            ) : (
              <>
                <span>{isSignUp ? "Already have an account?" : "New to StudyRythms?"}</span>
                <button type="button" onClick={() => changeAccountMode(isSignUp ? "sign-in" : "sign-up")}>
                  {isSignUp ? "Sign in" : "Create an account"} <span aria-hidden="true">↗</span>
                </button>
              </>
            )}
          </div>
        </section>
    </main>
  );
}
