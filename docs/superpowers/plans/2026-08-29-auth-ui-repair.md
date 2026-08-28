# Auth Screen UI Repair Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restore the centered, responsive atelier styling for the existing auth and password-reset screens without changing authentication behavior.

**Architecture:** Keep the existing `AuthScreen` and reset-page markup. Add their missing `auth-*` selectors to the shared global stylesheet, using the existing theme variables and global focus treatment. Add one source-level regression assertion so the auth surface cannot silently return to browser-default styling.

**Tech Stack:** Next.js 16, React 19, Tailwind CSS 4 import, shared CSS variables, Node test runner, TypeScript, ESLint.

---

### Task 1: Add the auth-style regression check

**Files:**
- Modify: `tests/authSurface.test.ts:15-31`
- Test: `tests/authSurface.test.ts`

- [ ] **Step 1: Add the stylesheet read and selector assertions**

Add this after the existing `files` declaration and extend the auth test with the exact checks below:

```ts
const stylesFile = join(process.cwd(), "app/globals.css");

// Inside the existing test, after the auth behavior assertions:
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
assert.match(styles, /@media \\(max-width: 34rem\\)[\\s\\S]*\\.auth-card/);
```

- [ ] **Step 2: Run the focused test and confirm the regression is reproduced**

Run: `node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON --experimental-strip-types --test tests/authSurface.test.ts`

Expected: FAIL because `app/globals.css` currently has no `.auth-screen` selector.

### Task 2: Restore the centered atelier auth surface

**Files:**
- Modify: `app/globals.css:306` immediately after the shared `.eyebrow` rule

- [ ] **Step 1: Add the minimum responsive auth styles**

Insert this CSS block after `.eyebrow` and before `.workspace-grid`:

```css
.auth-screen {
  display: grid;
  min-height: 100dvh;
  place-items: center;
  padding: clamp(1rem, 4vw, 3rem);
  background:
    radial-gradient(circle at 15% 12%, color-mix(in srgb, var(--accent) 10%, transparent), transparent 34rem),
    radial-gradient(circle at 88% 86%, color-mix(in srgb, var(--timer-break) 8%, transparent), transparent 32rem),
    var(--bg);
}

.auth-card {
  width: min(100%, 32rem);
  border: 1px solid var(--border);
  border-radius: 14px;
  background: color-mix(in srgb, var(--surface) 96%, transparent);
  padding: clamp(1.5rem, 5vw, 2.75rem);
  box-shadow: var(--shadow-focus);
}

.auth-card h1 {
  margin-top: 0.65rem;
  color: var(--fg);
  font-size: clamp(1.8rem, 5vw, 2.5rem);
  font-weight: 800;
  letter-spacing: -0.045em;
}

.auth-card h1::after {
  display: block;
  width: 2.5rem;
  height: 2px;
  margin-top: 0.8rem;
  background: var(--accent);
  content: "";
}

.auth-card__copy {
  max-width: 30rem;
  margin-top: 1rem;
  color: var(--text-secondary);
  font-size: 0.82rem;
  line-height: 1.6;
}

.auth-google,
.auth-submit {
  display: inline-flex;
  min-height: 2.9rem;
  width: 100%;
  align-items: center;
  justify-content: center;
  border-radius: 7px;
  padding: 0.7rem 1rem;
  font-size: 0.76rem;
  font-weight: 800;
  transition: border-color 180ms ease, background-color 180ms ease, color 180ms ease, transform 180ms ease;
}

.auth-google {
  margin-top: 1.5rem;
  border: 1px solid var(--border);
  background: var(--surface-secondary);
  color: var(--fg);
}

.auth-google:hover:not(:disabled) {
  border-color: var(--border-focus);
  background: var(--surface-hover);
  transform: translateY(-1px);
}

.auth-divider {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin: 1.35rem 0;
  color: var(--text-muted);
  font-family: var(--font-mono);
  font-size: 0.62rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.auth-divider::before,
.auth-divider::after {
  height: 1px;
  flex: 1;
  background: var(--border-subtle);
  content: "";
}

.auth-form {
  display: grid;
  gap: 0.55rem;
}

.auth-form label {
  margin-top: 0.45rem;
  color: var(--text-secondary);
  font-size: 0.7rem;
  font-weight: 750;
}

.auth-form input {
  min-height: 2.9rem;
  width: 100%;
  border: 1px solid var(--border);
  border-radius: 7px;
  background: var(--bg);
  padding: 0.7rem 0.8rem;
  color: var(--fg);
  font-size: 0.82rem;
}

.auth-form input:hover {
  border-color: var(--border-focus);
}

.auth-submit {
  margin-top: 0.75rem;
  border: 1px solid var(--accent);
  background: var(--accent);
  color: var(--accent-fg);
}

.auth-submit:hover:not(:disabled) {
  background: var(--accent-hover);
  transform: translateY(-1px);
}

.auth-google:disabled,
.auth-submit:disabled {
  cursor: wait;
  opacity: 0.55;
}

.auth-message {
  margin-top: 1rem;
  border-left: 2px solid var(--success);
  padding: 0.65rem 0.75rem;
  background: color-mix(in srgb, var(--success) 8%, transparent);
  color: var(--text-secondary);
  font-size: 0.72rem;
  line-height: 1.5;
}

.auth-message--error {
  border-left-color: var(--danger);
  background: color-mix(in srgb, var(--danger) 8%, transparent);
  color: var(--danger);
}

.auth-links {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 0.65rem 1rem;
  margin-top: 1.25rem;
}

.auth-links button {
  color: var(--accent);
  font-size: 0.7rem;
  font-weight: 700;
  text-align: left;
}

.auth-links button:hover {
  color: var(--fg);
}

@media (max-width: 34rem) {
  .auth-screen {
    align-items: start;
    padding: 1rem;
  }

  .auth-card {
    margin-top: 4vh;
    padding: 1.35rem;
  }

  .auth-links {
    justify-content: flex-start;
  }
}
```

- [ ] **Step 2: Run the focused test again**

Run: `node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON --experimental-strip-types --test tests/authSurface.test.ts`

Expected: PASS with the auth surface and responsive selector checks.

### Task 3: Verify the finished UI and repository

**Files:**
- Inspect: `app/auth/page.tsx`, `app/auth/reset-password/page.tsx`, `app/globals.css`
- Test: `tests/authSurface.test.ts`, full project checks

- [ ] **Step 1: Run the full test suite**

Run: `npm test`

Expected: 80 existing tests plus the new auth-style assertions pass with 0 failures.

- [ ] **Step 2: Run compiler and lint checks**

Run: `npm run typecheck`

Expected: exit code 0.

Run: `npm run lint`

Expected: exit code 0 with no errors or warnings.

- [ ] **Step 3: Run the production build**

Run: `npm run build`

Expected: exit code 0 and the existing auth/tracker route list remains present.

- [ ] **Step 4: Inspect desktop and mobile rendering**

Open `/auth` at a desktop viewport and a viewport narrower than 544px. Confirm the card is centered on desktop, readable on mobile, inputs and buttons have visible focus outlines, and the reset page receives the same layout treatment.

- [ ] **Step 5: Commit only the UI repair files**

```powershell
git add -- app/globals.css tests/authSurface.test.ts
git commit -m "fix: restore auth screen styling"
```

Do not stage the existing `.env.example` edit, screenshots, Playwright state, theme assets, or scratch-file deletion.
