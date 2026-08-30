"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setMessage("");
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      setError("Supabase is not configured.");
      return;
    }
    setBusy(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (updateError) setError(updateError.message);
    else setMessage("Password updated. You can return to YoutubeDoro.");
  };

  return (
    <main className="auth-screen">
      <section className="auth-card" aria-labelledby="reset-title">
          <div className="auth-card__header">
            <div>
              <p className="eyebrow">Account / password reset</p>
              <h1 id="reset-title">Choose a new password</h1>
            </div>
            <span className="auth-card__badge">
              <span className="auth-card__badge-dot" aria-hidden="true" />
              Secure update
            </span>
          </div>
          <p className="auth-card__copy">
            Choose a fresh password and get back to your study rhythm.
          </p>

          <form onSubmit={submit} className="auth-form" aria-busy={busy}>
            <div className="auth-field">
              <div className="auth-field__label-row">
                <label htmlFor="new-password">New password</label>
                <span className="auth-field__meta">8+ characters</span>
              </div>
              <input
                id="new-password"
                type="password"
                autoComplete="new-password"
                placeholder="Create a new password"
                minLength={8}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
            </div>

            <div className="auth-field">
              <div className="auth-field__label-row">
                <label htmlFor="confirm-new-password">Confirm password</label>
                <span className="auth-field__meta">Required</span>
              </div>
              <input
                id="confirm-new-password"
                type="password"
                autoComplete="new-password"
                placeholder="Repeat your password"
                minLength={8}
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                required
              />
            </div>

            <button type="submit" className="auth-submit" disabled={busy}>
              <span>{busy ? "Saving…" : "Update password"}</span>
              <span className="auth-button__arrow" aria-hidden="true">→</span>
            </button>
          </form>

          {error && <p className="auth-message auth-message--error" role="alert">{error}</p>}
          {message && <p className="auth-message" role="status">{message}</p>}

          <div className="auth-links">
            <Link href="/">
              <span aria-hidden="true">←</span> Back to sign in
            </Link>
          </div>
          <p className="auth-card__footer">
            <span className="auth-card__footer-mark" aria-hidden="true">✦</span>
            Keep your account details private and secure.
          </p>
        </section>
    </main>
  );
}
