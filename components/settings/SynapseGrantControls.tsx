"use client";

import { useEffect, useState } from "react";

type Grant = { id: string; scope: string; created_at: string };

export function SynapseGrantControls() {
  const [grants, setGrants] = useState<Grant[]>([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [revoking, setRevoking] = useState<string | null>(null);

  async function loadGrants() {
    setLoading(true);
    try {
      const response = await fetch("/api/integrations/synapse/grants", { cache: "no-store" });
      if (!response.ok) throw new Error("Could not load app access.");
      const payload = await response.json() as { grants?: Grant[] };
      setGrants(payload.grants ?? []);
      setMessage("");
    } catch {
      setMessage("Connected app access is temporarily unavailable.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void loadGrants(); }, []);

  async function revoke(grant: Grant) {
    setRevoking(grant.id);
    setMessage("");
    try {
      const response = await fetch("/api/integrations/synapse/grants", {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ grantId: grant.id }),
      });
      if (!response.ok) throw new Error("Could not revoke app access.");
      setGrants((current) => current.filter((item) => item.id !== grant.id));
      setMessage("Synapse access revoked.");
    } catch {
      setMessage("Could not revoke Synapse access. Try again.");
    } finally {
      setRevoking(null);
    }
  }

  return (
    <section className="settings-info-card" aria-labelledby="connected-apps-title">
      <p className="eyebrow">Connected apps</p>
      <h3 id="connected-apps-title">Synapse access</h3>
      {loading ? <p>Loading connected apps…</p> : grants.length === 0 ? <p>No external app has access to your sessions.</p> : (
        <ul className="settings-duration-list">
          {grants.map((grant) => <li key={grant.id} className="settings-recipe-row">
            <span><strong>Synapse</strong><small>{grant.scope} · approved {new Date(grant.created_at).toLocaleDateString()}</small></span>
            <button type="button" className="settings-clear-custom" disabled={revoking !== null} onClick={() => { void revoke(grant); }}>
              {revoking === grant.id ? "Revoking…" : "Revoke"}
            </button>
          </li>)}
        </ul>
      )}
      {message && <p role="status" className="auth-message">{message}</p>}
    </section>
  );
}
