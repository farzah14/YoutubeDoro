# Google-Only Authentication Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace every email/password and registration surface with a single Google OAuth flow, enforce Google identity on server access, and document the required Supabase configuration.

**Architecture:** Put Google-identity classification in a small pure module so it can be tested without Next.js or Supabase runtime dependencies. Reuse that classifier in the shared server-auth helpers and OAuth callback, then reduce the client auth card to one Google button. Keep the existing Supabase SSR/browser clients, safe callback redirect, tracker API authorization pattern, and visual card styling.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript 5, Supabase Auth/SSR, Node test runner through `tsx`, ESLint.

---

## File map

- Create `lib/supabase/googleIdentity.ts`: pure Google-provider classification.
- Create `tests/googleIdentity.test.ts`: table-driven classifier coverage.
- Modify `lib/supabase/auth.ts`: filter all server users through the classifier.
- Modify `app/auth/callback/route.ts`: reject and sign out non-Google callback sessions.
- Modify `app/auth/page.tsx`: expose safe Google-specific callback errors.
- Modify `components/auth/AuthScreen.tsx`: keep only the Google OAuth button and accessible error state.
- Delete `app/auth/reset-password/page.tsx`: remove the password-reset route.
- Modify `app/page.tsx`: stop exposing a generic provider fallback.
- Modify `components/YouTubeRestTimer.tsx`: remove the now-redundant `accountProvider` prop.
- Modify `components/settings/SettingsPanel.tsx`: render Google as the only sign-in method.
- Modify `tests/authSurface.test.ts`: replace password-flow expectations with Google-only contracts.
- Modify `tests/branding.test.ts`: stop reading the deleted password-reset page.
- Modify `tests/settingsPanel.test.ts`: assert the fixed Google account method.
- Modify `README.md`: document Google-only setup, callbacks, and project structure.

### Task 1: Add a pure Google identity classifier

**Files:**
- Create: `lib/supabase/googleIdentity.ts`
- Create: `tests/googleIdentity.test.ts`

- [ ] **Step 1: Write the failing classifier tests**

Create `tests/googleIdentity.test.ts`:

```ts
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
```

- [ ] **Step 2: Run the test and confirm the missing-module failure**

Run:

```bash
npm exec --yes tsx -- --test tests/googleIdentity.test.ts
```

Expected: FAIL because `lib/supabase/googleIdentity.ts` does not exist.

- [ ] **Step 3: Implement the classifier**

Create `lib/supabase/googleIdentity.ts`:

```ts
export interface GoogleIdentityCandidate {
  app_metadata?: {
    provider?: unknown;
    providers?: unknown;
  };
}

export function hasGoogleIdentity(
  user: GoogleIdentityCandidate | null | undefined,
): boolean {
  if (user?.app_metadata?.provider === "google") return true;
  const providers = user?.app_metadata?.providers;
  return Array.isArray(providers) && providers.includes("google");
}
```

- [ ] **Step 4: Run the classifier tests**

Run:

```bash
npm exec --yes tsx -- --test tests/googleIdentity.test.ts
```

Expected: 3 tests pass.

- [ ] **Step 5: Commit the classifier**

```bash
git add lib/supabase/googleIdentity.ts tests/googleIdentity.test.ts
git commit -m "feat: classify Google auth identities"
```

### Task 2: Enforce Google identity on the server and OAuth callback

**Files:**
- Modify: `lib/supabase/auth.ts`
- Modify: `app/auth/callback/route.ts`
- Modify: `app/auth/page.tsx`
- Modify: `tests/authSurface.test.ts`

- [ ] **Step 1: Add failing server-enforcement contract tests**

Append these constants and test to `tests/authSurface.test.ts`:

```ts
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
```

- [ ] **Step 2: Run the contract test and verify it fails**

Run:

```bash
npm exec --yes tsx -- --test tests/authSurface.test.ts
```

Expected: FAIL because the shared auth helper and callback do not call `hasGoogleIdentity`.

- [ ] **Step 3: Filter users in the shared server helper**

Replace `lib/supabase/auth.ts` with:

```ts
import { hasGoogleIdentity } from "./googleIdentity";
import { createSupabaseServerClient, hasSupabaseConfig } from "./server";

const googleRequiredError = () => new Error("Google authentication is required.");

export async function getAuthenticatedUser() {
  if (!hasSupabaseConfig()) return { user: null, error: new Error("Supabase is not configured.") };
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { user: null, error: new Error("Supabase is not configured.") };
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return { user: null, error };
  if (!hasGoogleIdentity(data.user)) return { user: null, error: googleRequiredError() };
  return { user: data.user, error: null };
}

export async function getAuthenticatedContext() {
  if (!hasSupabaseConfig()) return { supabase: null, user: null, error: new Error("Supabase is not configured.") };
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { supabase: null, user: null, error: new Error("Supabase is not configured.") };
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return { supabase, user: null, error };
  if (!hasGoogleIdentity(data.user)) return { supabase, user: null, error: googleRequiredError() };
  return { supabase, user: data.user, error: null };
}
```

- [ ] **Step 4: Verify the OAuth callback user before redirecting**

Update `app/auth/callback/route.ts` to:

```ts
import { NextRequest, NextResponse } from "next/server";
import { hasGoogleIdentity } from "@/lib/supabase/googleIdentity";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function safeNext(value: string | null) {
  return value && value.startsWith("/") && !value.startsWith("//") ? value : "/";
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = safeNext(url.searchParams.get("next"));
  const supabase = await createSupabaseServerClient();
  if (!supabase || !code) return NextResponse.redirect(new URL("/auth?error=oauth", request.url));

  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) return NextResponse.redirect(new URL("/auth?error=oauth", request.url));

  const { data, error: userError } = await supabase.auth.getUser();
  if (userError || !hasGoogleIdentity(data.user)) {
    await supabase.auth.signOut();
    return NextResponse.redirect(new URL("/auth?error=provider", request.url));
  }

  return NextResponse.redirect(new URL(next, request.url));
}
```

- [ ] **Step 5: Map the provider error to safe UI copy**

Replace `app/auth/page.tsx` with:

```tsx
import { AuthScreen } from "@/components/auth/AuthScreen";

export default async function AuthPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const params = await searchParams;
  const initialError = params.error === "provider"
    ? "Use a Google account to continue."
    : params.error === "oauth"
      ? "Google sign-in could not be completed. Please try again."
      : undefined;
  return <AuthScreen initialError={initialError} />;
}
```

- [ ] **Step 6: Run server-auth tests**

Run:

```bash
npm exec --yes tsx -- --test tests/googleIdentity.test.ts tests/authSurface.test.ts
```

Expected: classifier and server-enforcement tests pass; the existing password-flow contract still passes until Task 3 replaces it.

- [ ] **Step 7: Commit server enforcement**

```bash
git add lib/supabase/auth.ts app/auth/callback/route.ts app/auth/page.tsx tests/authSurface.test.ts
git commit -m "feat: enforce Google-only server authentication"
```

### Task 3: Reduce the authentication page to one Google button

**Files:**
- Modify: `components/auth/AuthScreen.tsx`
- Delete: `app/auth/reset-password/page.tsx`
- Modify: `tests/authSurface.test.ts`
- Modify: `tests/branding.test.ts`

- [ ] **Step 1: Replace password-flow expectations with a failing Google-only UI contract**

In `tests/authSurface.test.ts`:

1. Remove `app/auth/reset-password/page.tsx` from the `files` array.
2. Rename the first test to `auth surface has Google OAuth and no password flows`.
3. Replace its token loop and password assertions with:

```ts
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

  assert.equal(existsSync(join(process.cwd(), "app/auth/reset-password/page.tsx")), false);
```

Remove the reset-page source read and change the single-card check to:

```ts
  const authSource = readFileSync(join(process.cwd(), "components/auth/AuthScreen.tsx"), "utf8");
  assert.equal(authSource.includes("AuthShowcase"), false);
  assert.equal(authSource.includes("auth-grid"), false);
  assert.equal(authSource.includes("auth-card"), true);
  assert.equal(authSource.includes("auth-google"), true);
  assert.equal(authSource.includes("auth-form"), false);
  assert.equal(authSource.includes("auth-mode-switch"), false);
```

Reduce the required CSS selectors to the retained surface:

```ts
  for (const selector of [
    ".auth-screen",
    ".auth-card",
    ".auth-google",
    ".auth-google__icon",
    ".auth-message",
  ]) {
    assert.match(styles, new RegExp(`\\${selector}\\s*\\{`), `missing ${selector} styles`);
  }
```

In `tests/branding.test.ts`, remove this array entry:

```ts
readWorkspaceFile("../app/auth/reset-password/page.tsx"),
```

- [ ] **Step 2: Run the auth and branding tests and verify they fail**

Run:

```bash
npm exec --yes tsx -- --test tests/authSurface.test.ts tests/branding.test.ts
```

Expected: FAIL because password controls and the reset route still exist.

- [ ] **Step 3: Replace `AuthScreen` with the Google-only card**

Replace `components/auth/AuthScreen.tsx` with:

```tsx
"use client";

import { useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

interface AuthScreenProps {
  initialError?: string;
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" role="img">
      <path fill="#4285F4" d="M21.35 12.27c0-.73-.06-1.27-.2-1.83H12v3.46h5.37a4.58 4.58 0 0 1-1.99 3.01v2.51h3.23c1.9-1.75 2.74-4.33 2.74-7.15Z" />
      <path fill="#34A853" d="M12 21.75c2.7 0 4.97-.9 6.62-2.44l-3.23-2.51c-.9.6-2.05.96-3.39.96-2.6 0-4.8-1.76-5.59-4.12H3.07v2.59A9.99 9.99 0 0 0 12 21.75Z" />
      <path fill="#FBBC05" d="M6.41 13.64A6 6 0 0 1 6.1 12c0-.57.11-1.13.3-1.64V7.77H3.07A9.99 9.99 0 0 0 2 12c0 1.61.39 3.14 1.07 4.23l3.34-2.59Z" />
      <path fill="#EA4335" d="M12 6.24c1.47 0 2.79.5 3.83 1.5l2.87-2.87C16.96 3.26 14.7 2.25 12 2.25a9.99 9.99 0 0 0-8.93 5.52l3.34 2.59C7.2 8 9.4 6.24 12 6.24Z" />
    </svg>
  );
}

export function AuthScreen({ initialError }: AuthScreenProps) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(initialError ?? "");

  const signInWithGoogle = async () => {
    setError("");
    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      setError("Supabase is not configured. Add the public values from .env.example.");
      return;
    }

    setBusy(true);
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (oauthError) {
      setBusy(false);
      setError(oauthError.message);
    }
  };

  return (
    <main className="auth-screen">
      <section className="auth-card" aria-labelledby="auth-title">
        <div className="auth-card__header">
          <div>
            <p className="eyebrow">Google sign in</p>
            <h1 id="auth-title">Welcome back</h1>
          </div>
        </div>

        <button
          type="button"
          className="auth-google"
          onClick={() => { void signInWithGoogle(); }}
          disabled={busy}
          aria-busy={busy}
        >
          <span className="auth-google__content">
            <span className="auth-google__icon" aria-hidden="true"><GoogleIcon /></span>
            <span>{busy ? "Opening Google…" : "Continue with Google"}</span>
          </span>
        </button>

        {error && <p className="auth-message auth-message--error" role="alert">{error}</p>}
      </section>
    </main>
  );
}
```

- [ ] **Step 4: Remove the password-reset route**

Delete exactly:

```text
app/auth/reset-password/page.tsx
```

Do not remove `app/auth/callback/route.ts` or `app/auth/page.tsx`.

- [ ] **Step 5: Run auth, branding, and type checks**

Run:

```bash
npm exec --yes tsx -- --test tests/authSurface.test.ts tests/branding.test.ts
npm run typecheck
```

Expected: both test files pass and TypeScript exits 0.

- [ ] **Step 6: Commit the Google-only auth card**

```bash
git add components/auth/AuthScreen.tsx app/auth/reset-password/page.tsx tests/authSurface.test.ts tests/branding.test.ts
git commit -m "feat: replace password auth with Google login"
```

### Task 4: Align account settings and README with Google-only auth

**Files:**
- Modify: `app/page.tsx`
- Modify: `components/YouTubeRestTimer.tsx`
- Modify: `components/settings/SettingsPanel.tsx`
- Modify: `tests/settingsPanel.test.ts`
- Modify: `tests/authSurface.test.ts`
- Modify: `README.md`

- [ ] **Step 1: Write failing account-settings and README contracts**

In `tests/settingsPanel.test.ts`, replace the `accountProvider` assertion in `settings exposes the signed-in account and session history` with:

```ts
assert.doesNotMatch(settingsPanelSource, /accountProvider/);
assert.match(settingsPanelSource, /<strong>Google<\/strong>/);
```

Append to `tests/authSurface.test.ts`:

```ts
test("README documents Google-only Supabase authentication", () => {
  const readme = readFileSync(join(process.cwd(), "README.md"), "utf8");
  assert.match(readme, /Google-only authentication/);
  assert.match(readme, /disable the Email provider/i);
  assert.match(readme, /http:\/\/127\.0\.0\.1:3000\/auth\/callback/);
  assert.match(readme, /https:\/\/study-rythms\.vercel\.app\/auth\/callback/);
  assert.doesNotMatch(readme, /Sign in, sign up, and password reset forms/);
  assert.doesNotMatch(readme, /disable \*\*Confirm email\*\*/);
});
```

- [ ] **Step 2: Run the settings and README tests and verify they fail**

Run:

```bash
npm exec --yes tsx -- --test tests/settingsPanel.test.ts tests/authSurface.test.ts
```

Expected: FAIL because account-provider plumbing and password-oriented README text remain.

- [ ] **Step 3: Remove generic provider plumbing**

In `app/page.tsx`, render the dashboard as:

```tsx
return <YouTubeRestTimer accountEmail={user.email ?? ""} />;
```

In `components/YouTubeRestTimer.tsx`:

- change the component parameter type to `{ accountEmail?: string }`;
- remove `accountProvider` from destructuring; and
- remove `accountProvider={accountProvider}` from the `SettingsPanel` call.

In `components/settings/SettingsPanel.tsx`:

- remove `accountProvider?: string` from `SettingsPanelProps`;
- remove `accountProvider` from component destructuring; and
- replace the sign-in method card with:

```tsx
<div className="settings-info-card">
  <p className="eyebrow">Sign-in method</p>
  <strong>Google</strong>
</div>
```

- [ ] **Step 4: Update README project structure and Google setup**

Make these documentation changes in `README.md`:

1. Add this feature bullet under Study tracking and analytics:

```markdown
- Google-only authentication through Supabase OAuth; there are no email/password or registration forms.
```

2. Change the project-tree auth descriptions to:

```text
│   ├── auth/                   # Google OAuth entry and callback routes
│   ├── auth/                   # Google-only sign-in card
```

3. Replace authentication setup step 5 with:

```markdown
5. Configure Google-only authentication:
   - In **Authentication** -> **Providers** -> **Google**, enable Google and add the OAuth client ID and secret from Google Cloud.
   - In **Authentication** -> **Providers** -> **Email**, disable the Email provider.
   - In **Authentication** -> **URL Configuration**, add these redirect URLs:
     - `http://127.0.0.1:3000/auth/callback`
     - `https://study-rythms.vercel.app/auth/callback`
   - Add the equivalent `/auth/callback` URL for every additional deployed domain.

StudyRythms uses Google-only authentication. A user's first Google login creates the Supabase user automatically; the application does not provide a separate registration page.
```

4. Add this security bullet:

```markdown
- **Google-only authentication**: The UI, OAuth callback, server pages, and tracker APIs accept Google identities only. Disable Supabase's Email provider so the hosted auth configuration matches the application policy.
```

- [ ] **Step 5: Run account and documentation tests**

Run:

```bash
npm exec --yes tsx -- --test tests/settingsPanel.test.ts tests/authSurface.test.ts
npm run typecheck
```

Expected: tests pass and TypeScript exits 0.

- [ ] **Step 6: Commit settings and documentation**

```bash
git add app/page.tsx components/YouTubeRestTimer.tsx components/settings/SettingsPanel.tsx tests/settingsPanel.test.ts tests/authSurface.test.ts README.md
git commit -m "docs: explain Google-only authentication"
```

### Task 5: Run final verification

**Files:**
- Verify all modified files from Tasks 1-4.

- [ ] **Step 1: Confirm forbidden password surface is gone**

Run:

```bash
rg -n "signInWithPassword|resetPasswordForEmail|type=\"password\"|Forgot password|Create account|Create an account|or use email" app components lib README.md
```

Expected: no matches in the runtime application or README. Negative assertions may still mention these strings inside test files.

- [ ] **Step 2: Run the complete test suite with the compatible TypeScript runner**

Run:

```bash
npm exec --yes tsx -- --test "tests/*.test.ts"
```

Expected: all tests pass with zero failures.

- [ ] **Step 3: Run type checking and targeted linting**

Run:

```bash
npm run typecheck
npx eslint components/auth/AuthScreen.tsx lib/supabase/googleIdentity.ts lib/supabase/auth.ts app/auth/callback/route.ts app/auth/page.tsx app/page.tsx components/YouTubeRestTimer.tsx components/settings/SettingsPanel.tsx tests/googleIdentity.test.ts tests/authSurface.test.ts tests/branding.test.ts tests/settingsPanel.test.ts
```

Expected: both commands exit 0.

- [ ] **Step 4: Build the production application**

Run:

```bash
npm run build
```

Expected: Next.js production build exits 0 and lists `/`, `/auth`, and `/auth/callback`; `/auth/reset-password` is absent.

- [ ] **Step 5: Inspect the final diff and branch state**

Run:

```bash
git diff --check
git status --short --branch
git log --oneline -6
```

Expected: no whitespace errors, no uncommitted implementation files, and the Google-only auth commits are at the branch tip.
