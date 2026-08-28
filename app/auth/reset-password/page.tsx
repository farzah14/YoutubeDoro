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
        <p className="eyebrow">YoutubeDoro · account</p>
        <h1 id="reset-title">Choose a new password</h1>
        <form onSubmit={submit} className="auth-form">
          <label htmlFor="new-password">New password</label>
          <input id="new-password" type="password" autoComplete="new-password" minLength={8} value={password} onChange={(event) => setPassword(event.target.value)} required />
          <label htmlFor="confirm-new-password">Confirm password</label>
          <input id="confirm-new-password" type="password" autoComplete="new-password" minLength={8} value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} required />
          <button type="submit" className="auth-submit" disabled={busy}>{busy ? "Saving…" : "Update password"}</button>
        </form>
        {error && <p className="auth-message auth-message--error" role="alert">{error}</p>}
        {message && <p className="auth-message" role="status">{message}</p>}
        <Link href="/">Back to sign in</Link>
      </section>
    </main>
  );
}
