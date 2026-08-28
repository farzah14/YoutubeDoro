"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "@/lib/supabase/client";

interface HeaderProps {
  quote: string;
  showQuote?: boolean;
  accountEmail?: string;
  accountProvider?: string;
}

export function Header({ quote, showQuote = true, accountEmail, accountProvider }: HeaderProps) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const handleSignOut = async () => {
    setBusy(true);
    const result = await signOut();
    if (result.error) {
      setBusy(false);
      return;
    }
    router.replace("/");
    router.refresh();
  };

  return (
    <header className="scene-header">
      <div className="scene-brand">
        <h1>YoutubeDoro</h1>
        <p>anime focus room</p>
      </div>
      <div className="scene-account">
        <span title={accountProvider ? `Signed in with ${accountProvider}` : undefined}>{accountEmail || "Signed in"}</span>
        <button type="button" onClick={() => { void handleSignOut(); }} disabled={busy}>{busy ? "Signing out…" : "Sign out"}</button>
      </div>
      {showQuote && <blockquote className="scene-quote">“{quote}”</blockquote>}
    </header>
  );
}
