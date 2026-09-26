import assert from "node:assert/strict";
import { after, test } from "node:test";

import { parseAuthorizationRequest } from "../lib/integrations/synapse/authorize.ts";
import {
  authorizationCodeChallengeMatches,
  createCodeChallenge,
  createOpaqueCredential,
  hashCredential,
} from "../lib/integrations/synapse/crypto.ts";

const previousEnv = {
  clientId: process.env.SYNAPSE_CLIENT_ID,
  secretHash: process.env.SYNAPSE_CLIENT_SECRET_HASH,
  redirectUri: process.env.SYNAPSE_REDIRECT_URI,
};
const clientId = "synapse-local";
const redirectUri = "http://localhost:5173/api/studyrythms/callback";
const verifier = "studyrythms-pkce-verifier-with-at-least-forty-three-characters";
const state = createOpaqueCredential();

process.env.SYNAPSE_CLIENT_ID = clientId;
process.env.SYNAPSE_CLIENT_SECRET_HASH = "x".repeat(43);
process.env.SYNAPSE_REDIRECT_URI = redirectUri;

after(() => {
  if (previousEnv.clientId === undefined) delete process.env.SYNAPSE_CLIENT_ID;
  else process.env.SYNAPSE_CLIENT_ID = previousEnv.clientId;
  if (previousEnv.secretHash === undefined) delete process.env.SYNAPSE_CLIENT_SECRET_HASH;
  else process.env.SYNAPSE_CLIENT_SECRET_HASH = previousEnv.secretHash;
  if (previousEnv.redirectUri === undefined) delete process.env.SYNAPSE_REDIRECT_URI;
  else process.env.SYNAPSE_REDIRECT_URI = previousEnv.redirectUri;
});

test("credentials are opaque, hashed, and use S256 PKCE", async () => {
  const first = createOpaqueCredential();
  const second = createOpaqueCredential();
  const challenge = await createCodeChallenge(verifier);

  assert.equal(first.length, 43);
  assert.notEqual(first, second);
  assert.equal(await hashCredential(verifier), challenge);
  assert.equal(await authorizationCodeChallengeMatches(verifier, challenge), true);
  assert.equal(await authorizationCodeChallengeMatches(`${verifier}x`, challenge), false);
});

test("authorization accepts only the exact client, callback, scope, state, and S256 challenge", async () => {
  const challenge = await createCodeChallenge(verifier);
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "sessions:read plan:write",
    state,
    code_challenge: challenge,
    code_challenge_method: "S256",
  });

  assert.deepEqual(parseAuthorizationRequest(params), {
    clientId,
    redirectUri,
    state,
    codeChallenge: challenge,
  });
  params.set("redirect_uri", "https://attacker.example/callback");
  assert.equal(parseAuthorizationRequest(params), null);
});
