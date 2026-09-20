import assert from "node:assert/strict";
import test from "node:test";
import { hasGoogleIdentity } from "../lib/supabase/googleIdentity.ts";

test("accepts Google as the primary Supabase provider", () => {
  assert.equal(hasGoogleIdentity({ app_metadata: { provider: "google" } }), true);
});

test("accepts Google in the Supabase provider list", () => {
  assert.equal(
    hasGoogleIdentity({ app_metadata: { provider: "email", providers: ["email", "google"] } }),
    true,
  );
});

test("rejects missing, malformed, and email-only identities", () => {
  assert.equal(hasGoogleIdentity(null), false);
  assert.equal(hasGoogleIdentity({}), false);
  assert.equal(hasGoogleIdentity({ app_metadata: { provider: "email" } }), false);
  assert.equal(hasGoogleIdentity({ app_metadata: { providers: "google" } }), false);
  assert.equal(hasGoogleIdentity({ app_metadata: { providers: ["email"] } }), false);
});
