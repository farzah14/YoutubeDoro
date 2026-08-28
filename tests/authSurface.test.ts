import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const files = [
  "lib/supabase/client.ts",
  "lib/supabase/server.ts",
  "lib/supabase/auth.ts",
  "proxy.ts",
  "components/auth/AuthScreen.tsx",
  "app/auth/callback/route.ts",
  "app/auth/reset-password/page.tsx",
  "app/page.tsx",
].map((file) => join(process.cwd(), file));
const stylesFile = join(process.cwd(), "app/globals.css");

test("auth surface has SSR clients, password flows, and OAuth callback", () => {
  for (const file of files) assert.equal(existsSync(file), true, `missing ${file}`);
  const source = files.map((file) => readFileSync(file, "utf8")).join("\n");
  for (const token of [
    "createBrowserClient",
    "createServerClient",
    "signInWithOAuth",
    "signInWithPassword",
    "signUp",
    "resetPasswordForEmail",
    "exchangeCodeForSession",
    "signOut",
    "/auth/callback",
  ]) {
    assert.equal(source.includes(token), true, `missing ${token}`);
  }
  assert.equal(source.includes("verifyOtp"), false);
  assert.equal(source.toLowerCase().includes("verify your email before"), false);

  const styles = readFileSync(stylesFile, "utf8");
  for (const selector of [
    ".auth-screen",
    ".auth-card",
    ".auth-google",
    ".auth-form",
    ".auth-submit",
    ".auth-links",
    ".auth-message",
  ]) {
    assert.match(styles, new RegExp(`\\${selector}\\s*\\{`), `missing ${selector} styles`);
  }
  assert.match(styles, /@media \(max-width: 34rem\)[\s\S]*\.auth-card/);
});
