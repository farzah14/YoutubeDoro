import { getSynapseClientConfig } from "./config";
import { SYNAPSE_SCOPE } from "./scope";

export type AuthorizationRequest = {
  clientId: string;
  redirectUri: string;
  state: string;
  codeChallenge: string;
};

export function parseAuthorizationRequest(params: URLSearchParams): AuthorizationRequest | null {
  const config = getSynapseClientConfig();
  const clientId = params.get("client_id");
  const redirectUri = params.get("redirect_uri");
  const responseType = params.get("response_type");
  const scope = params.get("scope");
  const state = params.get("state");
  const codeChallenge = params.get("code_challenge");
  const challengeMethod = params.get("code_challenge_method");
  if (!config || clientId !== config.clientId || redirectUri !== config.redirectUri) return null;
  if (responseType !== "code" || scope !== SYNAPSE_SCOPE || challengeMethod !== "S256") return null;
  if (!state || !/^[A-Za-z0-9_-]{24,128}$/.test(state)) return null;
  if (!codeChallenge || !/^[A-Za-z0-9_-]{43}$/.test(codeChallenge)) return null;
  return { clientId, redirectUri, state, codeChallenge };
}
