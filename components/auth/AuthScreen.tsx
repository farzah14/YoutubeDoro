"use client";

import { FormEvent, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

type AuthMode = "sign-in" | "sign-up" | "reset";

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
    if (mode === "sign-up") setMessage("Account created. You can continue to sign in.");
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

  const title = mode === "reset" ? "Reset your password" : mode === "sign-up" ? "Create your account" : "Welcome back";
  return (
    <main className="auth-screen">
      <section className="auth-card" aria-labelledby="auth-title">
        <p className="eyebrow">YoutubeDoro · online tracker</p>
        <h1 id="auth-title">{title}</h1>
        <p className="auth-card__copy">Sign in to keep your tasks, sessions, breaks, and notes with your account.</p>

        {mode !== "reset" && <button type="button" className="auth-google" onClick={() => { void signInWithGoogle(); }} disabled={busy}>Continue with Google</button>}
        {mode !== "reset" && <div className="auth-divider"><span>or use email</span></div>}

        <form onSubmit={submit} className="auth-form">
          <label htmlFor="auth-email">Email</label>
          <input id="auth-email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
          {mode !== "reset" && <>
            <label htmlFor="auth-password">Password</label>
            <input id="auth-password" type="password" autoComplete={mode === "sign-up" ? "new-password" : "current-password"} value={password} onChange={(event) => setPassword(event.target.value)} minLength={8} required />
          </>}
          {mode === "sign-up" && <>
            <label htmlFor="auth-confirm-password">Confirm password</label>
            <input id="auth-confirm-password" type="password" autoComplete="new-password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} minLength={8} required />
          </>}
          <button type="submit" className="auth-submit" disabled={busy}>{busy ? "Working…" : mode === "reset" ? "Send reset link" : mode === "sign-up" ? "Create account" : "Sign in"}</button>
        </form>

        {error && <p className="auth-message auth-message--error" role="alert">{error}</p>}
        {message && <p className="auth-message" role="status">{message}</p>}

        <div className="auth-links">
          {mode === "reset" ? <button type="button" onClick={() => { setMode("sign-in"); setMessage(""); }}>Back to sign in</button> : <>
            <button type="button" onClick={() => { setMode(mode === "sign-in" ? "sign-up" : "sign-in"); setMessage(""); }}>{mode === "sign-in" ? "Create an account" : "Already have an account? Sign in"}</button>
            {mode === "sign-in" && <button type="button" onClick={() => { setMode("reset"); setMessage(""); }}>Forgot password?</button>}
          </>}
        </div>
      </section>
    </main>
  );
}
