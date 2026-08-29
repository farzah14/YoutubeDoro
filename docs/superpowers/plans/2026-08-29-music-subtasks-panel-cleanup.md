# Music and Sub-tasks Panel Cleanup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the blue modal surfaces from Music and Sub-tasks, remove the Music frequency row, and show station values without the `CH` and `BAND` prefixes.

**Architecture:** Keep the existing Music/Sub-task components and state flow. Apply one CSS override scoped to the shared `audio-overlay` modal, and make one markup-only cleanup in the Music station list.

**Tech Stack:** Next.js, React, TypeScript, existing CSS tokens, and Node's built-in test runner. No new dependencies.

---

## File map

- Modify `components/audio/LoFiPlayer.tsx`: remove the frequency dial markup and visible `CH`/`BAND` prefixes while preserving station values and behavior.
- Modify `app/globals.css`: override only the Music/Sub-tasks modal shell with the existing `--manga-charcoal` surface token.
- Modify `tests/musicPanel.test.ts`: replace the old frequency-row contract with assertions for the requested absence/presence of labels and controls.
- Modify `tests/settingsPanel.test.ts`: update the shared editorial-hook contract for the removed dial CSS and charcoal audio modal shell.

## Task 1: Update the Music source contract first

**Files:**
- Modify: `tests/musicPanel.test.ts`

- [ ] **Step 1: Replace the obsolete station-list assertions with a failing cleanup contract**

Keep the existing `source` constant and test name, but make the test assert that the removed frequency dial and visible prefixes are absent while station values and existing controls remain present:

```ts
test("Music exposes a simplified accessible station list", () => {
  assert.doesNotMatch(source, /music-shelf__dial/);
  assert.doesNotMatch(source, />STREAM</);
  assert.doesNotMatch(source, /STATIONS \//);
  assert.doesNotMatch(source, />CH /);
  assert.doesNotMatch(source, />BAND /);
  assert.match(source, /music-shelf__channel/);
  assert.match(source, /music-shelf__frequency/);
  assert.match(source, /const band =/);
  assert.match(source, /ON AIR/);
  assert.match(source, />Broadcast desk</);
  assert.match(source, /music-shelf__now-playing/);
  assert.match(source, /aria-pressed=\{selected\}/);
  assert.match(source, /music-shelf__volume/);
  assert.match(source, /music-shelf__track-state/);
});
```

- [ ] **Step 2: Run the focused test and confirm it fails for the old markup**

Run:

```powershell
node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON --experimental-strip-types --test tests/musicPanel.test.ts
```

Expected: FAIL because the current source still contains `music-shelf__dial`, `STREAM`, `STATIONS /`, `CH`, and `BAND`.

## Task 2: Make the minimum Music markup change

**Files:**
- Modify: `components/audio/LoFiPlayer.tsx:125-144`

- [ ] **Step 1: Delete the frequency dial block and its now-unused CSS**

Remove this block from the `stations` body:

```tsx
<div className="music-shelf__dial" aria-label="Broadcast frequency dial">
  <span>STREAM</span>
  <span aria-hidden="true">────────────</span>
  <span>STATIONS / 01–{String(RADIO_STATIONS.length).padStart(2, "0")}</span>
</div>
```

Also remove the unused `.music-shelf__dial` and `.music-shelf__dial span:nth-child(2)` rules from `app/globals.css`.

- [ ] **Step 2: Keep station values and remove only their visible prefixes**

Change the two station spans to:

```tsx
<span className="music-shelf__channel">{String(index + 1).padStart(2, "0")}</span>
<span className="music-shelf__frequency">{band}</span>
```

Leave `const band`, station selection, playback, and all other station-row markup unchanged.

- [ ] **Step 3: Re-run the focused Music test**

Run:

```powershell
node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON --experimental-strip-types --test tests/musicPanel.test.ts
```

Expected: PASS.

## Task 3: Remove the blue shell from only Music and Sub-tasks

**Files:**
- Modify: `app/globals.css` by extending the existing `.overlay-panel:has(.audio-overlay) .overlay-panel__surface` rule.
- Modify: `tests/settingsPanel.test.ts` to update the related CSS contract.

- [ ] **Step 1: Extend the existing scoped audio-overlay rule**

Add these declarations to the existing rule:

```css
.overlay-panel:has(.audio-overlay) .overlay-panel__surface {
  border-color: var(--manga-rule);
  background: var(--manga-charcoal);
  color: var(--manga-paper);
}
```

The updated CSS contract also checks that the removed dial selector is absent and that the scoped audio overlay uses the charcoal token.

This selector covers both Music and Sub-tasks because both are rendered through `Modal` with `className="audio-overlay"`. It must not change the main scene or other dialogs.

- [ ] **Step 2: Run the focused source contract and whitespace check**

Run:

```powershell
node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON --experimental-strip-types --test tests/musicPanel.test.ts tests/settingsPanel.test.ts
git diff --check -- components/audio/LoFiPlayer.tsx app/globals.css tests/musicPanel.test.ts tests/settingsPanel.test.ts
```

Expected: the test passes and `git diff --check` emits no errors.

## Task 4: Run completion verification

- [ ] **Step 1: Run the full automated gates**

Run:

```powershell
npm test
npm run typecheck
npm run lint
npm run build
git diff --check
```

Expected: every command exits 0. Any unrelated pre-existing failure must be reported with its exact diagnostic rather than weakened.

- [ ] **Step 2: Confirm only intended paths changed**

Run:

```powershell
git diff --name-only -- components/audio/LoFiPlayer.tsx app/globals.css tests/musicPanel.test.ts
git status --short
```

Expected: the scoped product diff contains only the three listed files; all pre-existing dirty and untracked paths remain preserved.

- [ ] **Step 3: Inspect the rendered panels**

Open the existing local app and verify Music and Sub-tasks at desktop and mobile widths:

- both panel shells use charcoal rather than blue;
- Music no longer shows `STREAM`, the separator, or `STATIONS / 01–06`;
- Music rows show the station number and band letter without `CH` or `BAND`;
- station selection, play/pause, volume, mute, and Sub-tasks behavior still work;
- no clipping or broken responsive grid appears.
