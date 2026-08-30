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

  const authSource = readFileSync(join(process.cwd(), "components/auth/AuthScreen.tsx"), "utf8");
  const resetSource = readFileSync(join(process.cwd(), "app/auth/reset-password/page.tsx"), "utf8");
  for (const [name, source] of [["sign-in", authSource], ["reset", resetSource]] as const) {
    assert.equal(source.includes("AuthShowcase"), false, `${name} should not render the showcase panel`);
    assert.equal(source.includes("auth-grid"), false, `${name} should use a single auth card`);
  }
  assert.equal(authSource.includes("auth-card"), true, "sign-in should keep the auth card");
  for (const text of [
    "AuthShowcase",
    "auth-grid",
    "Private space",
    "Your tasks, sessions, and notes are waiting in the studio.",
    "Create a calm home for your tasks, sessions, breaks, and notes.",
    "Your focus room stays yours. We keep the noise outside.",
  ]) {
    assert.equal(authSource.includes(text), false, `sign-in should not include ${text}`);
  }
  assert.equal(authSource.includes("auth-card__copy"), false, "sign-in should not render helper copy");

  const styles = readFileSync(stylesFile, "utf8");
  for (const selector of [
    ".auth-screen",
    ".auth-card",
    ".auth-google",
    ".auth-google__icon",
    ".auth-form",
    ".auth-field",
    ".auth-mode-switch",
    ".auth-submit",
    ".auth-links",
    ".auth-message",
    ".auth-card__footer",
  ]) {
    assert.match(styles, new RegExp(`\\${selector}\\s*\\{`), `missing ${selector} styles`);
  }
  assert.match(styles, /@media \(max-width: 34rem\)[\s\S]*\.auth-card/);
  assert.match(styles, /\.auth-card__header\s*\{[\s\S]*text-align:\s*center/);
  assert.match(styles, /\.auth-screen::before\s*\{[^}]*pointer-events:\s*none/);

  const settingsPaletteMarker = "/* Auth palette: match the Settings folio. */";
  assert.equal(styles.includes(settingsPaletteMarker), true, "missing Settings auth palette");
  const authPalette = styles.slice(styles.indexOf(settingsPaletteMarker));
  for (const token of ["var(--manga-charcoal)", "var(--manga-ink)", "var(--manga-paper)", "var(--manga-vermilion)"]) {
    assert.equal(authPalette.includes(token), true, `missing ${token} in auth palette`);
  }

  const mobileSizingMarker = "/* Auth mobile sizing: compact controls. */";
  assert.equal(styles.includes(mobileSizingMarker), true, "missing compact mobile auth sizing");
  const mobileSizing = styles.slice(styles.indexOf(mobileSizingMarker));
  for (const token of ["width: min(100%, 25rem)", "padding: 1rem", "min-height: 2.7rem"]) {
    assert.equal(mobileSizing.includes(token), true, `missing ${token} in mobile auth sizing`);
  }
  assert.equal(mobileSizing.includes("overflow-y: auto"), true, "mobile auth must allow vertical scrolling");
  assert.equal(mobileSizing.includes("overflow-x: hidden"), true, "mobile auth must avoid horizontal overflow");
});
