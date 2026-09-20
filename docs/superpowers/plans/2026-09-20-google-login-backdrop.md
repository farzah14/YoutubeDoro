# Blurred Home Workspace Login Backdrop Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show a blurred, disabled Home workspace preview behind the Google-only login card without starting authenticated or device-sensitive application behavior.

**Architecture:** Add a focused `LoginHomeBackdrop` client component that reads the same Home theme, custom background, clock, greeting, and overlay preferences as the dashboard, then composes the existing background, header, hero, and dock with a static disabled timer panel. Mount it behind `AuthScreen` and isolate it with `aria-hidden`, `inert`, `pointer-events: none`, blur, scale, and a dimming veil; never render the authenticated `YouTubeRestTimer` on the login route.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript 5, existing theme/local-storage components, CSS in `app/globals.css`, Node test runner through `tsx`.

---

## File map

- Create `components/auth/LoginHomeBackdrop.tsx`: inert Home workspace preview and preference readers.
- Modify `components/auth/AuthScreen.tsx`: render the backdrop behind the login card.
- Modify `app/globals.css`: add backdrop blur, veil, disabled preview, and timer-preview styles.
- Modify `tests/authSurface.test.ts`: contract-test preview composition, disabled boundary, and CSS hooks.

### Task 1: Add failing backdrop contracts

**Files:**
- Modify: `tests/authSurface.test.ts`

- [ ] **Step 1: Add the preview source to the auth surface file list**

Add this entry to the `files` array immediately before `components/auth/AuthScreen.tsx`:

```ts
  "components/auth/LoginHomeBackdrop.tsx",
```

- [ ] **Step 2: Add a failing Home-preview contract test**

Append this test after the existing README contract in `tests/authSurface.test.ts`:

```ts
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
```

- [ ] **Step 3: Run the new contract and confirm it fails**

Run:

```bash
npm exec --yes tsx -- --test tests/authSurface.test.ts
```

Expected: FAIL because `LoginHomeBackdrop.tsx`, the auth mount, and its CSS hooks do not exist yet.

### Task 2: Implement the inert Home preview and mount it on auth

**Files:**
- Create: `components/auth/LoginHomeBackdrop.tsx`
- Modify: `components/auth/AuthScreen.tsx`

- [ ] **Step 1: Create the Home preview component**

Create `components/auth/LoginHomeBackdrop.tsx` with this implementation:

```tsx
"use client";

import { useLocalStorage } from "@/hooks/useLocalStorage";
import { KEYS } from "@/lib/constants";
import { DEFAULT_THEME, THEME_ORDER } from "@/lib/themeConfig";
import type { CozyAnimeTheme } from "@/types/theme";
import type { ThemeSlot, WorkspaceMode, WorkspacePanel } from "@/types/workspace";
import { AmbientBackground } from "../anime/AmbientBackground";
import { Header } from "../layout/Header";
import { HomeHero } from "../layout/HomeHero";
import { WorkspaceDock } from "../layout/WorkspaceDock";

const defaultThemeSlots: Record<ThemeSlot, string | null> = { home: null, focus: null };
const defaultThemeOverlays: Record<ThemeSlot, number> = { home: 42, focus: 42 };

const noopModeChange = (_mode: WorkspaceMode) => {};
const noopPanelToggle = (_panel: WorkspacePanel) => {};

function normalizeTheme(value: CozyAnimeTheme, fallback: CozyAnimeTheme): CozyAnimeTheme {
  return THEME_ORDER.includes(value) ? value : fallback;
}

export function LoginHomeBackdrop() {
  const [legacyTheme] = useLocalStorage<CozyAnimeTheme>(KEYS.theme, DEFAULT_THEME);
  const [homeTheme] = useLocalStorage<CozyAnimeTheme>(KEYS.themeBySlot("home"), legacyTheme);
  const [themeSlots] = useLocalStorage<Record<ThemeSlot, string | null>>(KEYS.themeSlots, defaultThemeSlots);
  const [themeOverlays] = useLocalStorage<Record<ThemeSlot, number>>(KEYS.themeSlots + ":overlay", defaultThemeOverlays);
  const [use24Hour] = useLocalStorage(KEYS.clock24Hour, false);
  const [showSeconds] = useLocalStorage(KEYS.clockShowSeconds, false);
  const [dashboardName] = useLocalStorage(KEYS.dashboardName, "");
  const [greetingStyle] = useLocalStorage<"dynamic" | "generic" | "hidden">(KEYS.greetingStyle, "dynamic");
  const theme = normalizeTheme(homeTheme, normalizeTheme(legacyTheme, DEFAULT_THEME));
  const customThemeId = themeSlots.home;
  const overlay = Number.isFinite(themeOverlays.home) ? themeOverlays.home : 42;

  return (
    <div className="auth-home-backdrop" aria-hidden="true">
      <div className="auth-home-backdrop__preview" inert>
        <AmbientBackground
          key={customThemeId ?? "built-in"}
          theme={theme}
          customThemeId={customThemeId}
          overlay={overlay}
        />
        <div className="workspace-scene relative z-10 flex min-h-0 flex-1 flex-col px-5 py-5 sm:px-8 sm:py-7">
          <Header />
          <HomeHero
            use24Hour={use24Hour}
            showSeconds={showSeconds}
            name={dashboardName}
            greetingStyle={greetingStyle}
          />
          <section className="auth-home-preview__timer" aria-hidden="true">
            <p>Focus timer</p>
            <strong>25:00</strong>
            <button type="button" disabled>Start focus</button>
          </section>
        </div>
        <WorkspaceDock
          mode="home"
          openPanel={null}
          onModeChange={noopModeChange}
          onPanelToggle={noopPanelToggle}
        />
      </div>
      <div className="auth-home-backdrop__veil" />
    </div>
  );
}
```

- [ ] **Step 2: Mount the preview behind the existing login card**

In `components/auth/AuthScreen.tsx`, import `LoginHomeBackdrop` and render it as the first child of the existing `<main className="auth-screen">`:

```tsx
<main className="auth-screen">
  <LoginHomeBackdrop />
  <section className="auth-card" aria-label="StudyRythms login">
```

Keep the existing Google-only button, loading state, and error rendering unchanged.

- [ ] **Step 3: Run type checking and the auth contract**

Run:

```bash
npm exec --yes tsx -- --test tests/authSurface.test.ts
npm run typecheck
```

Expected: the auth contract and TypeScript check pass; the preview is present but contains no timer/camera hooks.

- [ ] **Step 4: Commit the preview component**

```bash
git add components/auth/LoginHomeBackdrop.tsx components/auth/AuthScreen.tsx tests/authSurface.test.ts
git commit -m "feat: add blurred Home preview to login"
```

### Task 3: Add blur, disabled-state, and responsive styling

**Files:**
- Modify: `app/globals.css`

- [ ] **Step 1: Add the backdrop styles after the base `.auth-screen` rules**

Add these rules near the existing auth styles:

```css
.auth-home-backdrop {
  position: absolute;
  inset: 0;
  z-index: 0;
  overflow: hidden;
  pointer-events: none;
}

.auth-home-backdrop__preview {
  position: absolute;
  inset: -5%;
  display: flex;
  min-height: 110%;
  flex-direction: column;
  filter: blur(9px);
  opacity: 0.82;
  pointer-events: none;
  transform: scale(1.06);
  user-select: none;
  will-change: filter, transform;
}

.auth-home-backdrop__preview .workspace-scene {
  min-height: 0;
}

.auth-home-backdrop__veil {
  position: absolute;
  inset: 0;
  z-index: 1;
  background: rgb(8 12 18 / 52%);
  pointer-events: none;
}

.auth-home-preview__timer {
  position: absolute;
  right: 50%;
  bottom: clamp(5rem, 12vh, 8rem);
  display: grid;
  min-width: min(15rem, 72vw);
  justify-items: center;
  gap: 0.4rem;
  border: 1px solid rgb(255 255 255 / 20%);
  border-radius: 1rem;
  background: rgb(7 17 30 / 34%);
  padding: 1rem 1.25rem;
  color: #fff;
  transform: translateX(50%);
}

.auth-home-preview__timer p {
  margin: 0;
  font-family: var(--font-mono);
  font-size: 0.6rem;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}

.auth-home-preview__timer strong {
  font-family: var(--font-mono);
  font-size: clamp(2.2rem, 6vw, 4.5rem);
  letter-spacing: 0.04em;
}

.auth-home-preview__timer button {
  min-height: 2.4rem;
  border: 1px solid rgb(255 255 255 / 30%);
  border-radius: 999px;
  background: rgb(255 255 255 / 12%);
  color: inherit;
  cursor: not-allowed;
  font: inherit;
  padding: 0.35rem 1rem;
}

.auth-card {
  position: relative;
  z-index: 2;
}

@media (max-width: 34rem) {
  .auth-home-backdrop__preview {
    filter: blur(7px);
  }

  .auth-home-preview__timer {
    bottom: 4.5rem;
  }
}
```

- [ ] **Step 2: Run the full verification suite**

Run:

```bash
if rg -n "useAttentionMonitor|useFocusTimer|useCloudTasks|useSessionHistory|MediaStream|getUserMedia" components/auth/LoginHomeBackdrop.tsx; then exit 1; else echo "Backdrop has no timer, tracker, or camera hooks"; fi
npm exec --yes tsx -- --test "tests/*.test.ts"
npm run typecheck
npx eslint components/auth/LoginHomeBackdrop.tsx components/auth/AuthScreen.tsx tests/authSurface.test.ts
npm run build
```

Expected: the side-effect scan finds no matches, all tests pass, TypeScript/lint exit 0, and the production build lists `/` and `/auth` successfully.

- [ ] **Step 3: Inspect the rendered login page and diff**

Verify `http://127.0.0.1:3001/` shows a blurred Home preview, a disabled-looking timer layer, and a sharp interactive Google login card. Then run:

```bash
git diff --check
git status --short --branch
git log --oneline -6
```

Expected: no whitespace errors, only the intended implementation commits, and `.env.local` remains ignored.
