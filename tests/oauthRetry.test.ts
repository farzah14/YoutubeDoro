import assert from "node:assert/strict";
import test from "node:test";
import { getOAuthErrorMessage } from "../lib/supabase/oauthError";
import { createOAuthAttempt } from "../lib/supabase/oauthAttempt";

test("replayed and expired Supabase states explain how to recover", () => {
  for (const code of ["flow_state_already_used", "flow_state_expired", "flow_state_not_found", "bad_oauth_state"]) {
    for (const params of [{ error: "invalid_request", errorCode: code }, { error: "oauth", reason: code }]) {
      assert.equal(getOAuthErrorMessage(params), "This Google sign-in attempt expired or was already used. Start again.");
    }
  }
});

test("rapid clicks start only one OAuth request and successful navigation stays locked", async () => {
  const run = createOAuthAttempt();
  let calls = 0;
  let finish!: () => void;
  const action = () => { calls++; return new Promise<void>(resolve => { finish = resolve; }); };
  const first = run(action);
  await run(action);
  assert.equal(calls, 1);
  finish();
  await first;
  await run(action);
  assert.equal(calls, 1);
});

test("failed OAuth startup unlocks a fresh attempt", async () => {
  const run = createOAuthAttempt();
  await assert.rejects(run(async () => { throw new Error("network failed"); }), /network failed/);
  let retried = false;
  await run(async () => { retried = true; });
  assert.equal(retried, true);
});
