import { redirect } from "next/navigation";

import { getAuthenticatedUser } from "@/lib/supabase/auth";
import { getStudyRythmsSiteUrl } from "@/lib/integrations/synapse/config";
import { parseAuthorizationRequest } from "@/lib/integrations/synapse/authorize";
import { SYNAPSE_SCOPE } from "@/lib/integrations/synapse/scope";

export default async function SynapseAuthorizationPage({ searchParams }: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const values = await searchParams;
  const params = new URLSearchParams();
  for (const key of ["client_id", "redirect_uri", "response_type", "scope", "state", "code_challenge", "code_challenge_method"]) {
    const value = values[key];
    if (typeof value === "string") params.set(key, value);
  }
  const authorization = parseAuthorizationRequest(params);
  if (!authorization) return <Message title="Invalid connection request" body="Return to Synapse and start the connection again." />;

  const { user } = await getAuthenticatedUser();
  if (!user) {
    const next = `/integrations/synapse/authorize?${params.toString()}`;
    redirect(`/auth?next=${encodeURIComponent(next)}`);
  }

  return (
    <main className="auth-screen">
      <section className="auth-card" aria-labelledby="synapse-consent-title">
        <div className="auth-card__header">
          <p className="eyebrow">Connected app request</p>
          <h1 id="synapse-consent-title">Connect Synapse</h1>
          <p>Allow Synapse to read saved focus sessions and send your Synapse courses, selected priorities, and sub-tasks to StudyRythms.</p>
        </div>
        <div className="settings-info-card" role="note">
          <p className="eyebrow">Permission</p>
          <strong>Read focus sessions and update your Synapse study plan</strong>
          <p>Synapse can add or update its own courses, selected priorities, and sub-tasks here. It cannot change your StudyRythms timer, notes, or personal priorities.</p>
        </div>
        <form action="/api/integrations/synapse/decision" method="post" className="settings-extras-actions">
          <input type="hidden" name="client_id" value={authorization.clientId} />
          <input type="hidden" name="redirect_uri" value={authorization.redirectUri} />
          <input type="hidden" name="state" value={authorization.state} />
          <input type="hidden" name="code_challenge" value={authorization.codeChallenge} />
          <input type="hidden" name="scope" value={SYNAPSE_SCOPE} />
          <button type="submit" name="decision" value="cancel" className="auth-google">Cancel</button>
          <button type="submit" name="decision" value="approve" className="auth-google">Approve connection</button>
        </form>
        <p className="auth-message">Signed in as {user.email ?? "your StudyRythms account"}. Synapse connects to this account only.</p>
        <a className="settings-clear-custom" href={getStudyRythmsSiteUrl()}>Return to StudyRythms</a>
      </section>
    </main>
  );
}

function Message({ title, body }: { title: string; body: string }) {
  return <main className="auth-screen"><section className="auth-card"><div className="auth-card__header"><h1>{title}</h1><p>{body}</p></div></section></main>;
}
