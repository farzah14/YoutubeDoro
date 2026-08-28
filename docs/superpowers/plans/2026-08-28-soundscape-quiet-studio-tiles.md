# Soundscape Quiet Studio Tiles Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the existing Sounds panel into compact Quiet Studio tiles without changing the sound catalog, persistence, mixing, or playback behavior.

**Architecture:** Keep `SoundscapePanel` as the presentational consumer of the existing `SoundscapeController`. Add semantic tile classes and a category data attribute in the panel markup, then replace only the Soundscape tile CSS; active-layer volume remains conditionally rendered by the existing `layer` lookup.

**Tech Stack:** Next.js 16, React 19, TypeScript, CSS in `app/globals.css`, Node’s built-in test runner, Playwright browser smoke checks.

---

## File map

- Create: `tests/soundscapePanel.test.ts` — source-level regression checks for the tile anatomy, controller wiring, and responsive style contract.
- Modify: `components/audio/SoundscapePanel.tsx` — add semantic Quiet Studio tile markup while preserving current handlers and state.
- Modify: `app/globals.css` — style the tile anatomy, category accents, active/disabled states, inline volume control, and narrow-screen layout.
- Reference only: `lib/soundscapes.ts`, `hooks/useSoundscape.ts` — confirm catalog and controller APIs remain unchanged.

### Task 1: Add the failing Soundscape tile regression test

**Files:**
- Create: `tests/soundscapePanel.test.ts`

- [ ] **Step 1: Write the failing test**

Create the test file with these assertions:

```ts
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { fileURLToPath } from "node:url";

const readWorkspaceFile = (path: string) => readFileSync(
  fileURLToPath(new URL(path, import.meta.url)),
  "utf8"
);

const panelSource = readWorkspaceFile("../components/audio/SoundscapePanel.tsx");
const stylesSource = readWorkspaceFile("../app/globals.css");

test("soundscape tiles expose quiet studio state and volume anatomy", () => {
  assert.match(panelSource, /data-category=\{sound\.category\.toLowerCase\(\)\}/);
  assert.match(panelSource, /soundscape-sound__toggle/);
  assert.match(panelSource, /soundscape-sound__icon/);
  assert.match(panelSource, /soundscape-sound__copy/);
  assert.match(panelSource, /soundscape-sound__state/);
  assert.match(panelSource, /soundscape-sound__volume/);
  assert.match(panelSource, /soundscape\.toggleLayer\(sound\.id\)/);
  assert.match(panelSource, /soundscape\.setVolume\(sound\.id/);
});

test("soundscape tiles define category accents and a narrow layout", () => {
  assert.match(stylesSource, /\.soundscape-sound\[data-category="nature"\][\s\S]*--sound-accent/);
  assert.match(stylesSource, /\.soundscape-sound\[data-category="cozy"\][\s\S]*--sound-accent/);
  assert.match(stylesSource, /\.soundscape-sound\[data-category="noise"\][\s\S]*--sound-accent/);
  assert.match(stylesSource, /\.soundscape-sound__toggle[\s\S]*grid-template-columns/);
  assert.match(stylesSource, /@media \(max-width:\s*34rem\)[\s\S]*\.soundscape-grid[\s\S]*grid-template-columns:\s*1fr/);
});
```

- [ ] **Step 2: Run the focused test to verify it fails**

Run:

```powershell
node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON --experimental-strip-types --test tests/soundscapePanel.test.ts
```

Expected: FAIL because the new tile classes, category data attribute, category accent selectors, and narrow-screen rule do not exist yet. Existing sound behavior must not be changed to make this test pass.

### Task 2: Implement the Quiet Studio tile markup and styles

**Files:**
- Modify: `components/audio/SoundscapePanel.tsx:52-61`
- Modify: `app/globals.css:1357-1418`

- [ ] **Step 1: Replace only the Soundscape tile markup**

Keep the existing `visibleSounds.map`, `layer` lookup, `atLimit` calculation, `toggleLayer`, `setVolume`, `aria-pressed`, `disabled`, and conditional `layer` rendering. Change the tile body to this structure:

```tsx
<article
  key={sound.id}
  className="soundscape-sound"
  data-active={Boolean(layer) || undefined}
  data-category={sound.category.toLowerCase()}
>
  <button
    type="button"
    className="soundscape-sound__toggle"
    onClick={() => soundscape.toggleLayer(sound.id)}
    disabled={atLimit}
    aria-pressed={Boolean(layer)}
  >
    <span className="soundscape-sound__icon" aria-hidden="true">{sound.emoji}</span>
    <span className="soundscape-sound__copy">
      <strong>{sound.label}</strong>
      <small>{sound.category}</small>
    </span>
    <span className="soundscape-sound__state">
      <span className="soundscape-sound__state-dot" aria-hidden="true" />
      {layer ? "Active" : atLimit ? "Full" : "Add"}
    </span>
  </button>
  {layer && (
    <label className="soundscape-sound__volume">
      <span className="sr-only">{sound.label} volume</span>
      <input
        type="range"
        min="0"
        max="100"
        value={layer.volume}
        onChange={(event) => soundscape.setVolume(sound.id, Number(event.target.value))}
      />
      <output>{layer.volume}%</output>
    </label>
  )}
</article>
```

- [ ] **Step 2: Replace the old tile-only CSS block**

Replace the existing `.soundscape-grid` through `.soundscape-sound output` rules with:

```css
.soundscape-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.6rem;
}

.soundscape-sound {
  --sound-accent: var(--workspace-purple);
  overflow: hidden;
  border: 1px solid color-mix(in srgb, var(--border-subtle) 84%, transparent);
  border-radius: 14px;
  background: color-mix(in srgb, var(--surface-secondary) 88%, transparent);
  transition: border-color 160ms ease, background 160ms ease, transform 160ms ease;
}

.soundscape-sound[data-category="nature"] {
  --sound-accent: #79cbb2;
}

.soundscape-sound[data-category="cozy"] {
  --sound-accent: #e5b56f;
}

.soundscape-sound[data-category="noise"] {
  --sound-accent: #b7a4f5;
}

.soundscape-sound:hover {
  border-color: color-mix(in srgb, var(--sound-accent) 55%, var(--border-subtle));
  background: color-mix(in srgb, var(--sound-accent) 7%, var(--surface-secondary));
  transform: translateY(-1px);
}

.soundscape-sound[data-active="true"] {
  border-color: color-mix(in srgb, var(--sound-accent) 75%, white);
  background: color-mix(in srgb, var(--sound-accent) 11%, var(--surface-secondary));
}

.soundscape-sound__toggle {
  display: grid;
  width: 100%;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 0.7rem;
  padding: 0.78rem;
  text-align: left;
}

.soundscape-sound__toggle:disabled {
  cursor: not-allowed;
  opacity: 0.42;
}

.soundscape-sound__icon {
  display: grid;
  height: 2rem;
  width: 2rem;
  place-items: center;
  border: 1px solid color-mix(in srgb, var(--sound-accent) 50%, transparent);
  border-radius: 10px;
  background: color-mix(in srgb, var(--sound-accent) 12%, transparent);
  font-size: 1rem;
}

.soundscape-sound__copy {
  display: grid;
  min-width: 0;
  gap: 0.2rem;
}

.soundscape-sound__copy strong,
.soundscape-sound__copy small {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.soundscape-sound__copy strong {
  color: var(--fg);
  font-size: 0.7rem;
}

.soundscape-sound__copy small {
  color: var(--text-muted);
  font-size: 0.58rem;
}

.soundscape-sound__state {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  color: var(--text-muted);
  font-family: var(--font-mono);
  font-size: 0.55rem;
  white-space: nowrap;
}

.soundscape-sound[data-active="true"] .soundscape-sound__state {
  color: var(--sound-accent);
}

.soundscape-sound__state-dot {
  height: 0.4rem;
  width: 0.4rem;
  border-radius: 999px;
  background: currentColor;
  opacity: 0.55;
}

.soundscape-sound[data-active="true"] .soundscape-sound__state-dot {
  opacity: 1;
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--sound-accent) 16%, transparent);
}

.soundscape-sound__volume {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  border-top: 1px solid color-mix(in srgb, var(--sound-accent) 26%, var(--border-subtle));
  padding: 0.55rem 0.75rem 0.65rem;
}

.soundscape-sound__volume input {
  min-width: 0;
  flex: 1;
  accent-color: var(--sound-accent);
}

.soundscape-sound__volume output {
  width: 2.5rem;
  color: var(--text-secondary);
  font-family: var(--font-mono);
  font-size: 0.58rem;
  text-align: right;
}

@media (max-width: 34rem) {
  .soundscape-grid {
    grid-template-columns: 1fr;
  }
}
```

- [ ] **Step 3: Run the focused test to verify it passes**

Run:

```powershell
node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON --experimental-strip-types --test tests/soundscapePanel.test.ts
```

Expected: PASS with 2 tests. The existing six sounds, category filters, five-layer limit, preset handlers, and volume callback remain intact.

### Task 3: Run the complete verification gates

**Files:**
- Reference: `components/audio/SoundscapePanel.tsx`
- Reference: `app/globals.css`
- Reference: `tests/soundscapePanel.test.ts`

- [ ] **Step 1: Run all automated checks**

Run:

```powershell
node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON --experimental-strip-types --test tests/*.test.ts
npx tsc --noEmit
npm run lint
npm run build
git diff --check
```

Expected: all tests pass, TypeScript exits 0, ESLint exits 0, the production build completes, and `git diff --check` reports no whitespace errors.

- [ ] **Step 2: Verify the desktop browser state**

At `http://localhost:3000/`, open Sounds and confirm:

1. Six tiles show category accents and `Add` states.
2. Clicking a tile changes it to `Active` and reveals only that tile’s volume slider.
3. Removing the active tile hides its slider.
4. Five active layers disable only inactive tiles and show the existing capacity hint.
5. Nature, Cozy, and Noise filters still show the correct catalog items.
6. Playlist Library presets still apply and return to the Sounds tab.

- [ ] **Step 3: Verify the narrow browser state**

Resize the browser to 540px wide or less and confirm the sound tiles use one column, volume controls remain usable, and no horizontal scrollbar appears.

### Task 4: Commit the focused feature

**Files:**
- Create: `tests/soundscapePanel.test.ts`
- Modify: `components/audio/SoundscapePanel.tsx`
- Modify: `app/globals.css`

- [ ] **Step 1: Review the focused diff**

Run:

```powershell
git diff -- tests/soundscapePanel.test.ts components/audio/SoundscapePanel.tsx app/globals.css
```

Confirm the diff contains only the Quiet Studio tile markup/styles and the regression test; do not stage unrelated existing worktree changes.

- [ ] **Step 2: Commit the focused feature**

Run:

```powershell
git add -- tests/soundscapePanel.test.ts components/audio/SoundscapePanel.tsx app/globals.css
git commit -m "feat: redesign soundscape tiles"
```

Expected: one commit containing only the three files above.
