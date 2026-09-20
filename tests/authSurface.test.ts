import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const files = [
  "lib/supabase/client.ts",
  "lib/supabase/server.ts",
  "lib/supabase/auth.ts",
  "proxy.ts",
  "components/auth/LoginHomeBackdrop.tsx",
  "components/auth/AuthScreen.tsx",
  "app/auth/callback/route.ts",
  "app/page.tsx",
].map((file) => join(process.cwd(), file));
const stylesFile = join(process.cwd(), "app/globals.css");

test("auth surface has Google OAuth and no password flows", () => {
  for (const file of files) assert.equal(existsSync(file), true, `missing ${file}`);
  const source = files.map((file) => readFileSync(file, "utf8")).join("\n");
  for (const token of [
    "createBrowserClient",
    "createServerClient",
    "signInWithOAuth",
    "provider: \"google\"",
    "exchangeCodeForSession",
    "hasGoogleIdentity",
    "signOut",
    "/auth/callback",
  ]) {
    assert.equal(source.includes(token), true, `missing ${token}`);
  }
  for (const forbidden of [
    "signInWithPassword",
    "signUp",
    "resetPasswordForEmail",
    "type=\"password\"",
    "Create account",
    "Create an account",
    "Forgot password",
    "or use email",
  ]) {
    assert.equal(source.includes(forbidden), false, `Google-only auth should not include ${forbidden}`);
  }
  assert.equal(source.includes("verifyOtp"), false);
  assert.equal(source.toLowerCase().includes("verify your email before"), false);

  const authSource = readFileSync(join(process.cwd(), "components/auth/AuthScreen.tsx"), "utf8");
  assert.equal(authSource.includes("AuthShowcase"), false);
  assert.equal(authSource.includes("auth-grid"), false);
  assert.equal(authSource.includes("auth-card"), true, "sign-in should keep the auth card");
  assert.equal(authSource.includes("auth-google"), true);
  assert.match(authSource, /aria-label="StudyRythms login"/);
  assert.match(authSource, /<h1 id="auth-title">Login<\/h1>/);
  assert.equal(authSource.includes("StudyRythms · Google sign in"), false);
  assert.equal(existsSync(join(process.cwd(), "app/auth/reset-password/page.tsx")), false);

  const styles = readFileSync(stylesFile, "utf8");
  for (const selector of [
    ".auth-screen",
    ".auth-card",
    ".auth-google",
    ".auth-google__icon",
    ".auth-message",
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

const serverAuthSource = readFileSync(join(process.cwd(), "lib/supabase/auth.ts"), "utf8");
const callbackSource = readFileSync(join(process.cwd(), "app/auth/callback/route.ts"), "utf8");
const authPageSource = readFileSync(join(process.cwd(), "app/auth/page.tsx"), "utf8");

test("server authentication accepts Google identities only", () => {
  assert.match(serverAuthSource, /hasGoogleIdentity/);
  assert.match(serverAuthSource, /Google authentication is required/);
  assert.match(callbackSource, /hasGoogleIdentity/);
  assert.match(callbackSource, /auth\.getUser\(\)/);
  assert.match(callbackSource, /auth\.signOut\(\)/);
  assert.match(callbackSource, /error=provider/);
  assert.match(authPageSource, /Use a Google account to continue/);
});

test("README documents Google-only Supabase authentication", () => {
  const readme = readFileSync(join(process.cwd(), "README.md"), "utf8");
  assert.match(readme, /Google-only authentication/);
  assert.match(readme, /disable the Email provider/i);
  assert.match(readme, /http:\/\/127\.0\.0\.1:3000\/auth\/callback/);
  assert.match(readme, /https:\/\/study-rythms\.vercel\.app\/auth\/callback/);
  assert.doesNotMatch(readme, /Sign in, sign up, and password reset forms/);
  assert.doesNotMatch(readme, /disable \*\*Confirm email\*\*/);
});

test("login page includes an inert blurred Home workspace preview", () => {
  const backdropSource = readFileSync(join(process.cwd(), "components/auth/LoginHomeBackdrop.tsx"), "utf8");
  const authSource = readFileSync(join(process.cwd(), "components/auth/AuthScreen.tsx"), "utf8");

  for (const token of [
    "AmbientBackground",
    "Header",
    "HomeHero",
    "WorkspaceDock",
    "KEYS.themeBySlot(\"home\")",
    "KEYS.themeSlots",
    "aria-hidden=\"true\"",
    "inert",
    "Start focus",
  ]) {
    assert.equal(backdropSource.includes(token), true, `missing ${token}`);
  }

  assert.match(authSource, /<LoginHomeBackdrop\s*\/>/);

  const styles = readFileSync(stylesFile, "utf8");
  for (const selector of [
    ".auth-home-backdrop",
    ".auth-home-backdrop__preview",
    ".auth-home-backdrop__veil",
    ".auth-home-preview__timer",
  ]) {
    assert.match(styles, new RegExp(`\\${selector}\\s*\\{`), `missing ${selector} styles`);
  }
  assert.match(styles, /\.auth-home-backdrop__preview\s*\{[\s\S]*filter:\s*blur\(/);
  assert.match(styles, /\.auth-home-backdrop__preview\s*\{[\s\S]*pointer-events:\s*none/);
  assert.match(styles, /\.auth-home-backdrop__veil\s*\{[\s\S]*pointer-events:\s*none/);
  assert.match(styles, /\.auth-card\s*\{[\s\S]*position:\s*relative/);
  assert.match(styles, /\.auth-card\s*\{[\s\S]*z-index:\s*2/);
});
