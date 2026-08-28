# Five-Surface Anime UI Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the generic card-heavy presentation of the five screenshot-referenced UI states with one quiet anime study-room system while preserving useful timer, music, task, and priority behavior.

**Architecture:** Keep the existing React components, hooks, storage, and domain models as the source of truth. Add a small shared surface contract in the existing overlay shell and globals.css, then reshape SettingsPanel, LoFiPlayer, SubtaskPanel, and TaskQueue into divider-led rows. The two Focus Timer screenshots remain one component with different values/state.

**Tech Stack:** Next.js 16, React 19, TypeScript, existing CSS in app/globals.css, Node’s built-in test runner, ESLint, and the existing production build.

---

## File map

- Modify components/ui/OverlayPanel.tsx to apply the shared atelier surface class without changing dialog behavior or focus restoration.
- Modify app/globals.css to define the approved ink/mist/lantern/moss/moon tokens, shared surface rules, responsive rows, focus states, and the four surface-specific layouts.
- Modify components/settings/SettingsPanel.tsx only for the Focus Timer settings branch; keep theme, clock, stats, and other settings behavior intact.
- Modify components/audio/LoFiPlayer.tsx only for station/library/provider presentation; keep local storage, playback, provider parsing, and volume behavior intact.
- Modify components/tasks/SubtaskPanel.tsx only for checklist structure and progress presentation; keep add/toggle/delete callbacks unchanged.
- Modify components/tasks/TaskQueue.tsx only for workbench structure and removal of decorative emoji/color/confetti controls; keep priority callbacks and drag/drop behavior unchanged.
- Create tests/uiRedesign.test.ts for source-level structural guards covering the new shared language and the four distinct surfaces.
- Modify tests/subtaskPanel.test.ts to replace assertions for the old card grid with assertions for the approved checklist.
- Do not modify lib/taskModel.ts, hooks/useTasks.ts, hooks/useLocalStorage.ts, lib/audioStreams.ts, or timer/audio/task semantics.

The checkout is already dirty with unrelated work. Before every edit, inspect the focused diff. Do not stage or commit an existing modified component or stylesheet unless its staged diff contains only this redesign's intended hunks.

## Task 1: Add the shared atelier surface contract

**Files:**

- Modify: components/ui/OverlayPanel.tsx
- Modify: app/globals.css
- Create: tests/uiRedesign.test.ts

- [ ] **Step 1: Write the failing shared-contract tests.**

Create tests/uiRedesign.test.ts with this content:

    import assert from "node:assert/strict";
    import { readFileSync } from "node:fs";
    import test from "node:test";
    import { fileURLToPath } from "node:url";

    const readWorkspaceFile = (path: string) => readFileSync(
      fileURLToPath(new URL(path, import.meta.url)),
      "utf8"
    );

    const overlaySource = readWorkspaceFile("../components/ui/OverlayPanel.tsx");
    const stylesSource = readWorkspaceFile("../app/globals.css");

    test("overlay surfaces use the shared atelier contract", () => {
      assert.match(overlaySource, /cx\("overlay-panel__surface",\s*"atelier-surface",\s*className\)/);
      assert.match(stylesSource, /--atelier-ink:\s*#0b1a2a/i);
      assert.match(stylesSource, /--atelier-lantern:\s*#e4a854/i);
      assert.match(stylesSource, /\.atelier-surface\s*\{/);
      assert.match(stylesSource, /\.atelier-surface[\s\S]*background:\s*var\(--atelier-room\)/);
    });

- [ ] **Step 2: Run the focused test and verify it fails.**

Run:

    node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON --experimental-strip-types --test tests/uiRedesign.test.ts

Expected: FAIL because the shared class, tokens, and surface rule do not yet exist.

- [ ] **Step 3: Apply the smallest shared-shell implementation.**

Change the OverlayPanel section class expression to:

    className={cx("overlay-panel__surface", "atelier-surface", className)}

Add the approved tokens near the existing root theme variables and add this shared rule in app/globals.css:

    :root {
      --atelier-ink: #0b1a2a;
      --atelier-room: #12263a;
      --atelier-mist: #dde7e2;
      --atelier-lantern: #e4a854;
      --atelier-moss: #739278;
      --atelier-moon: #8ea2b1;
      --atelier-line: #345064;
    }

    .atelier-surface {
      border: 1px solid var(--atelier-line);
      background: var(--atelier-room);
      color: var(--atelier-mist);
      box-shadow: 0 14px 34px rgba(3, 12, 20, 0.28);
    }

    .atelier-surface .overlay-panel__header {
      border-bottom-color: var(--atelier-line);
    }

    .atelier-surface .overlay-panel__close {
      border-color: var(--atelier-line);
      color: var(--atelier-moon);
    }

    .atelier-surface .overlay-panel__close:hover,
    .atelier-surface .overlay-panel__close:focus-visible {
      border-color: var(--atelier-lantern);
      color: var(--atelier-mist);
    }

Keep the existing backdrop, Escape handling, focus restoration, and scrolling behavior.

- [ ] **Step 4: Run the focused test and inspect the diff.**

Run the same Node test command. Expected: PASS. Then run:

    git diff -- components/ui/OverlayPanel.tsx app/globals.css tests/uiRedesign.test.ts

Confirm only the shared contract was introduced before continuing.

## Task 2: Redesign Focus Timer settings as a recipe editor

**Files:**

- Modify: components/settings/SettingsPanel.tsx in the section === "focus-timer" branch
- Modify: app/globals.css for .settings-timer-recipe and its rows
- Test: tests/uiRedesign.test.ts

- [ ] **Step 1: Add failing Focus Timer structure assertions.**

Append to tests/uiRedesign.test.ts:

    const settingsSource = readWorkspaceFile("../components/settings/SettingsPanel.tsx");

    test("Focus Timer settings use one recipe editor instead of nested cards", () => {
      assert.match(settingsSource, /settings-timer-recipe/);
      assert.match(settingsSource, /settings-duration-list/);
      assert.match(settingsSource, /settings-signal/);
      assert.doesNotMatch(settingsSource, /Keep the rhythm adjustable\./);
      assert.doesNotMatch(settingsSource, /settings-form-grid|settings-alert/);
    });

- [ ] **Step 2: Run the focused test and verify the new test fails.**

Run:

    node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON --experimental-strip-types --test tests/uiRedesign.test.ts

Expected: the shared test passes and the Focus Timer test fails because the old branch still renders the grid/card classes.

- [ ] **Step 3: Replace only the Focus Timer branch markup.**

Define the duration metadata once near the existing sections constant:

    const timerDurations = [
      { key: "focusMinutes", label: "Focus", max: 120 },
      { key: "shortBreakMinutes", label: "Short break", max: 120 },
      { key: "longBreakMinutes", label: "Long break", max: 240 },
    ] as const;

Replace the one-line Focus Timer return with this structure, retaining the current state setters and notification permission callback:

    if (section === "focus-timer") return (
      <div className="settings-content settings-timer-recipe">
        <header className="settings-content__heading">
          <div>
            <p className="eyebrow">Timer recipe</p>
            <h3>Set the pace.</h3>
            <p>Choose the rhythm that keeps one useful thing moving.</p>
          </div>
        </header>

        <section className="settings-duration-list" aria-labelledby="timer-durations-title">
          <h4 id="timer-durations-title">Session lengths</h4>
          {timerDurations.map(({ key, label, max }) => (
            <label className="settings-recipe-row" key={key}>
              <span>{label}</span>
              <span className="settings-number-field">
                <input
                  type="number"
                  min="1"
                  max={max}
                  value={preferences[key]}
                  onChange={(event) => setStoredPreferences({ ...preferences, [key]: Number(event.target.value) })}
                  aria-label={label + " minutes"}
                />
                <small>min</small>
              </span>
            </label>
          ))}
          <label className="settings-recipe-row">
            <span>Countdown</span>
            <span className="settings-number-field">
              <input
                type="number"
                min="1"
                max="480"
                value={preferences.countdownMinutes}
                onChange={(event) => setStoredPreferences({ ...preferences, countdownMinutes: Number(event.target.value) })}
                aria-label="Countdown minutes"
              />
              <small>min</small>
            </span>
          </label>
        </section>

        <section className="settings-behavior-list" aria-label="Timer behavior">
          <label className="settings-toggle settings-recipe-toggle">
            <span><strong>Auto-start breaks</strong><small>Move into the break immediately after focus ends.</small></span>
            <input type="checkbox" checked={preferences.autoStartBreaks} onChange={(event) => setStoredPreferences({ ...preferences, autoStartBreaks: event.target.checked })} />
          </label>
          <label className="settings-toggle settings-recipe-toggle">
            <span><strong>Browser notifications</strong><small>{notificationState === "denied" ? "Blocked in browser settings." : notificationState === "unsupported" ? "Not supported in this browser." : "Notify when an interval completes."}</small></span>
            <input type="checkbox" checked={preferences.notificationEnabled} disabled={notificationState === "unsupported" || notificationState === "denied"} onChange={async (event) => { const next = event.target.checked; const permission = next ? await requestNotificationPermission() : notificationState; setNotificationState(permission); setStoredPreferences({ ...preferences, notificationEnabled: next && permission === "granted" }); }} />
          </label>
        </section>

        <section className="settings-signal" aria-labelledby="timer-signal-title">
          <h4 id="timer-signal-title">Signal</h4>
          <label>Alert sound<select value={preferences.alertSound} onChange={(event) => setStoredPreferences({ ...preferences, alertSound: event.target.value as typeof preferences.alertSound })}><option value="soft">Soft</option><option value="level-up">Level Up</option><option value="none">No alert</option></select></label>
          <label><span>Alert volume <output>{preferences.alertVolume}%</output></span><input type="range" min="0" max="100" value={preferences.alertVolume} onChange={(event) => setStoredPreferences({ ...preferences, alertVolume: Number(event.target.value) })} /></label>
          <button type="button" className="settings-quiet-action" onClick={() => { void playTimerAlert(preferences.alertSound, preferences.alertVolume); }}>Preview</button>
        </section>

        <div className="settings-recipe-note">
          <p><strong>Modes</strong> Pomodoro, Countdown, Stopwatch, Animedoro, and 52/17 are chosen from Focus.</p>
          <p><strong>Presets</strong> {PRESETS.learning.join(" · ")} minutes focus.</p>
        </div>
      </div>
    );

Do not add a Save button; existing settings persist immediately. Keep the existing migrateFocusPreferences normalization and notification error copy.

- [ ] **Step 4: Add the recipe layout and mobile rules.**

Add this focused CSS. Keep generic settings rules for other sections until their callers are checked:

    .settings-timer-recipe {
      max-width: 48rem;
    }

    .settings-timer-recipe h4 {
      margin: 0;
      color: var(--atelier-moon);
      font-size: 0.68rem;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }

    .settings-duration-list,
    .settings-behavior-list,
    .settings-signal {
      margin-top: 1.5rem;
      border-top: 1px solid var(--atelier-line);
    }

    .settings-recipe-row,
    .settings-recipe-toggle {
      display: flex;
      min-height: 3.25rem;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
      border-bottom: 1px solid color-mix(in srgb, var(--atelier-line) 72%, transparent);
      color: var(--atelier-mist);
    }

    .settings-number-field {
      display: inline-flex;
      align-items: baseline;
      gap: 0.4rem;
    }

    .settings-number-field input {
      width: 4.5rem;
      border: 0;
      border-bottom: 1px solid var(--atelier-line);
      border-radius: 0;
      background: transparent;
      color: var(--atelier-mist);
      font-family: var(--font-mono);
      font-size: 1rem;
      text-align: right;
    }

    .settings-number-field input::-webkit-inner-spin-button,
    .settings-number-field input::-webkit-outer-spin-button {
      appearance: none;
      margin: 0;
    }

    .settings-number-field input[type="number"] {
      appearance: textfield;
    }

    .settings-number-field small,
    .settings-recipe-toggle small,
    .settings-signal output,
    .settings-recipe-note {
      color: var(--atelier-moon);
      font-size: 0.7rem;
    }

    .settings-signal {
      display: grid;
      grid-template-columns: minmax(7rem, auto) minmax(0, 1fr) auto;
      align-items: end;
      gap: 0.75rem;
      padding-top: 1rem;
    }

    .settings-signal h4 {
      grid-column: 1 / -1;
    }

    .settings-signal label {
      display: grid;
      gap: 0.35rem;
      color: var(--atelier-moon);
      font-size: 0.7rem;
    }

    .settings-signal select,
    .settings-quiet-action {
      min-height: 2.4rem;
      border: 1px solid var(--atelier-line);
      border-radius: 6px;
      background: transparent;
      color: var(--atelier-mist);
      padding: 0 0.65rem;
    }

    .settings-signal input[type="range"] {
      accent-color: var(--atelier-lantern);
    }

    .settings-quiet-action {
      cursor: pointer;
    }

    .settings-quiet-action:hover,
    .settings-quiet-action:focus-visible {
      border-color: var(--atelier-lantern);
    }

    .settings-recipe-note {
      display: grid;
      gap: 0.35rem;
      margin-top: 1.25rem;
      border-top: 1px solid var(--atelier-line);
      padding-top: 1rem;
      line-height: 1.5;
    }

    .settings-recipe-note strong {
      color: var(--atelier-mist);
      margin-right: 0.4rem;
    }

    @media (max-width: 34rem) {
      .settings-signal {
        grid-template-columns: 1fr auto;
      }

      .settings-signal label:nth-of-type(2) {
        grid-column: 1 / -1;
      }
    }

- [ ] **Step 5: Run focused settings tests and inspect the branch.**

Run:

    node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON --experimental-strip-types --test tests/uiRedesign.test.ts tests/settingsPanel.test.ts

Expected: all tests pass. Confirm SettingsPanel.tsx no longer contains the old Focus Timer settings-form-grid or settings-alert branch.

## Task 3: Redesign Music as a sound shelf

**Files:**

- Modify: components/audio/LoFiPlayer.tsx
- Modify: app/globals.css for .music-shelf
- Test: tests/uiRedesign.test.ts

- [ ] **Step 1: Add failing Music structure assertions.**

Append:

    const musicSource = readWorkspaceFile("../components/audio/LoFiPlayer.tsx");

    test("Music uses aligned sound-shelf rows instead of emoji station cards", () => {
      assert.match(musicSource, /music-shelf/);
      assert.match(musicSource, /music-shelf__track/);
      assert.match(musicSource, /music-shelf__marker/);
      assert.doesNotMatch(musicSource, /audio-panel__station-grid|item\.icon/);
    });

- [ ] **Step 2: Run the focused test and verify it fails.**

Run:

    node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON --experimental-strip-types --test tests/uiRedesign.test.ts

Expected: the shared and Focus Timer tests pass; the Music test fails because the old station grid and icon rendering remain.

- [ ] **Step 3: Replace the station view markup without changing handlers.**

Use this structure inside the existing LoFiPlayer return. Keep enabled, muted, volume, activeEmbed, selectStation, and all provider callbacks exactly as they work today:

    <div className="audio-panel music-panel music-shelf">
      <header className="music-shelf__header">
        <div>
          <p className="eyebrow">Sound shelf</p>
          <h3>{activeEmbed ? activeEmbed.provider : station.name}</h3>
        </div>
        <span className="music-shelf__state">{activeEmbed ? "Provider" : enabled ? "Playing" : "Paused"}</span>
      </header>

      <div className="music-shelf__tabs" role="tablist" aria-label="Music sources">
        {([["stations", "Stations"], ["my-music", "My Music"], ["library", "Playlist Library"]] as const).map(([value, label]) => (
          <button key={value} type="button" role="tab" aria-selected={tab === value} className={tab === value ? "music-shelf__tab is-active" : "music-shelf__tab"} onClick={() => setTab(value)}>{label}</button>
        ))}
      </div>

      {tab === "stations" && (
        <div className="music-shelf__body">
          <div className="music-shelf__controls">
            <button type="button" className="music-shelf__primary" onClick={() => { setActiveEmbed(null); setEnabled(!enabled); }}><MusicIcon />{enabled && !activeEmbed ? "Pause music" : "Play music"}</button>
            <button type="button" className="music-shelf__mute" onClick={() => setMuted(!muted)} aria-label={muted ? "Unmute music" : "Mute music"}>{muted ? <VolumeXIcon /> : <Volume2Icon />}</button>
          </div>
          <label className="music-shelf__volume"><span>Volume <output>{muted ? 0 : volume}%</output></span><input type="range" min="0" max="100" value={muted ? 0 : volume} onChange={(event) => { setVolume(Number(event.target.value)); setMuted(false); }} /></label>
          <div className="music-shelf__list" aria-label="Built-in stations">
            {RADIO_STATIONS.map((item) => (
              <button key={item.id} type="button" className={item.id === stationId && !activeEmbed ? "music-shelf__track is-active" : "music-shelf__track"} onClick={() => selectStation(item.id)}>
                <span className="music-shelf__marker" aria-hidden="true" />
                <span className="music-shelf__track-copy"><strong>{item.name}</strong><small>{item.genre}</small></span>
                <span className="music-shelf__track-state">{item.id === stationId && !activeEmbed ? "Selected" : "Choose"}</span>
              </button>
            ))}
          </div>
        </div>
      )}

Use the same music-shelf__track row for Library, omitting item.icon. Keep the provider form/list behavior, but place it under music-shelf__provider and keep error/hint text readable.

- [ ] **Step 4: Add sound-shelf CSS and remove only abandoned station-grid rules.**

Add:

    .music-shelf {
      color: var(--atelier-mist);
    }

    .music-shelf__header,
    .music-shelf__controls,
    .music-shelf__volume {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.75rem;
    }

    .music-shelf__state,
    .music-shelf__track-state,
    .music-shelf__volume output {
      color: var(--atelier-moon);
      font-family: var(--font-mono);
      font-size: 0.62rem;
    }

    .music-shelf__tabs {
      display: flex;
      gap: 1rem;
      margin-top: 1.25rem;
      border-bottom: 1px solid var(--atelier-line);
    }

    .music-shelf__tab {
      border-bottom: 2px solid transparent;
      padding: 0 0 0.55rem;
      color: var(--atelier-moon);
      font-size: 0.72rem;
    }

    .music-shelf__tab.is-active,
    .music-shelf__tab:hover,
    .music-shelf__tab:focus-visible {
      border-color: var(--atelier-lantern);
      color: var(--atelier-mist);
    }

    .music-shelf__body {
      display: grid;
      gap: 1rem;
      margin-top: 1rem;
    }

    .music-shelf__primary {
      display: inline-flex;
      min-height: 2.5rem;
      align-items: center;
      gap: 0.45rem;
      border: 1px solid var(--atelier-lantern);
      border-radius: 6px;
      background: var(--atelier-lantern);
      color: var(--atelier-ink);
      padding: 0 0.85rem;
      font-size: 0.72rem;
      font-weight: 800;
    }

    .music-shelf__mute {
      display: grid;
      height: 2.5rem;
      width: 2.5rem;
      place-items: center;
      border: 1px solid var(--atelier-line);
      border-radius: 6px;
      color: var(--atelier-moon);
    }

    .music-shelf__mute:hover,
    .music-shelf__mute:focus-visible {
      border-color: var(--atelier-lantern);
      color: var(--atelier-mist);
    }

    .music-shelf__volume {
      color: var(--atelier-moon);
      font-size: 0.7rem;
    }

    .music-shelf__volume span {
      display: flex;
      min-width: 4.5rem;
      justify-content: space-between;
      gap: 0.5rem;
    }

    .music-shelf__volume input {
      flex: 1;
      accent-color: var(--atelier-lantern);
    }

    .music-shelf__list {
      border-top: 1px solid var(--atelier-line);
    }

    .music-shelf__track {
      display: grid;
      width: 100%;
      grid-template-columns: 0.55rem minmax(0, 1fr) auto;
      align-items: center;
      gap: 0.75rem;
      border-bottom: 1px solid color-mix(in srgb, var(--atelier-line) 72%, transparent);
      padding: 0.8rem 0.25rem;
      text-align: left;
    }

    .music-shelf__track:hover,
    .music-shelf__track:focus-visible,
    .music-shelf__track.is-active {
      background: color-mix(in srgb, var(--atelier-lantern) 8%, transparent);
    }

    .music-shelf__marker {
      height: 0.55rem;
      width: 0.55rem;
      border-radius: 50%;
      background: var(--atelier-moon);
    }

    .music-shelf__track.is-active .music-shelf__marker {
      background: var(--atelier-lantern);
    }

    .music-shelf__track-copy {
      display: grid;
      min-width: 0;
      gap: 0.2rem;
    }

    .music-shelf__track-copy strong {
      overflow: hidden;
      color: var(--atelier-mist);
      font-size: 0.75rem;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .music-shelf__track-copy small {
      color: var(--atelier-moon);
      font-size: 0.64rem;
    }

Delete .audio-panel__station-grid and .audio-panel__station blocks only after rg confirms no JSX caller remains. Do not delete provider or library rules still used by other tabs.

- [ ] **Step 5: Run focused Music tests and inspect all tabs.**

Run:

    node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON --experimental-strip-types --test tests/uiRedesign.test.ts

Expected: all current UI redesign tests pass. Verify station, provider, and library branches retain their existing callback names and no item.icon render remains.

## Task 4: Redesign Sub-tasks as a checklist

**Files:**

- Modify: components/tasks/SubtaskPanel.tsx
- Modify: app/globals.css for .subtasks-list and .subtask-row
- Modify: tests/subtaskPanel.test.ts
- Test: tests/uiRedesign.test.ts

- [ ] **Step 1: Replace the old card-grid test expectations before changing the component.**

In tests/subtaskPanel.test.ts, replace the card-grid test with:

    test("subtasks render as a single checklist at every width", () => {
      assert.match(panelSource, /subtasks-list/);
      assert.match(panelSource, /subtask-row/);
      assert.match(panelSource, /completedCount/);
      assert.doesNotMatch(panelSource, /subtasks-grid|subtask-card/);
      assert.match(stylesSource, /\.subtasks-list\s*\{/);
      assert.match(stylesSource, /\.subtask-row\s*\{/);
      assert.doesNotMatch(stylesSource, /\.subtasks-grid\s*\{/);
      assert.doesNotMatch(stylesSource, /\.subtask-card\s*\{/);
    });

Append to tests/uiRedesign.test.ts:

    const subtasksSource = readWorkspaceFile("../components/tasks/SubtaskPanel.tsx");

    test("Sub-tasks use parent context and a progress-led checklist", () => {
      assert.match(subtasksSource, /Focus plan \\/|For /);
      assert.match(subtasksSource, /subtasks-progress/);
      assert.match(subtasksSource, /subtask-row/);
      assert.doesNotMatch(subtasksSource, /subtasks-grid|subtask-card/);
    });

- [ ] **Step 2: Run the Sub-tasks tests and verify they fail.**

Run:

    node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON --experimental-strip-types --test tests/subtaskPanel.test.ts tests/uiRedesign.test.ts

Expected: existing behavior assertions pass, while new checklist assertions fail against the old grid/card markup.

- [ ] **Step 3: Add progress values and replace the inner markup.**

After handleAdd, add these derived values:

    const completedCount = activeTask?.subtasks.filter((subtask) => subtask.completed).length ?? 0;
    const totalCount = activeTask?.subtasks.length ?? 0;
    const progress = totalCount ? Math.round((completedCount / totalCount) * 100) : 0;

For an active task, render the form after the checklist so adding remains the final action:

    <div className="subtasks-context">
      <p className="eyebrow">Focus plan</p>
      <h3 id="subtasks-title">Sub-tasks</h3>
      <p>Focus plan / {activeTask.text}</p>
    </div>

    <div className="subtasks-progress" role="progressbar" aria-label="Sub-task progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress}>
      <span>{completedCount} of {totalCount} complete</span>
      <i style={{ width: progress + "%" }} />
    </div>

    <ol className="subtasks-list" aria-label={"Sub-tasks for " + activeTask.text}>
      {activeTask.subtasks.length === 0 && <li className="subtasks-empty">No sub-tasks yet. Add the next small step.</li>}
      {activeTask.subtasks.map((subtask) => (
        <li className="subtask-row" data-complete={subtask.completed || undefined} key={subtask.id}>
          <label>
            <input type="checkbox" checked={subtask.completed} onChange={() => onToggleSubtask(activeTask.id, subtask.id)} aria-label={(subtask.completed ? "Mark" : "Complete") + " sub-task " + subtask.text} />
            <span>{subtask.text}</span>
          </label>
          <button type="button" className="subtask-row__delete" onClick={() => onDeleteSubtask(activeTask.id, subtask.id)} aria-label={"Delete sub-task " + subtask.text} title={"Delete sub-task " + subtask.text}>
            <TrashIcon aria-hidden="true" />
          </button>
        </li>
      ))}
    </ol>

    <form className="subtasks-add" onSubmit={handleAdd}>
      <input value={newText} onChange={(event) => setNewText(event.target.value)} placeholder="Add a sub-task" aria-label="Sub-task title" />
      <button type="submit" disabled={!newText.trim()}><PlusIcon aria-hidden="true" /> Add</button>
    </form>

Keep the no-active-priority state and onOpenTasks action, but use the same quiet empty-state treatment.

- [ ] **Step 4: Add single-column checklist CSS and remove old sub-task card rules.**

Add:

    .subtasks-list {
      display: grid;
      margin: 1rem 0 0;
      border-top: 1px solid var(--atelier-line);
      padding: 0;
      list-style: none;
    }

    .subtasks-progress {
      display: grid;
      gap: 0.45rem;
      margin-top: 1.25rem;
      color: var(--atelier-moon);
      font-family: var(--font-mono);
      font-size: 0.64rem;
    }

    .subtasks-progress i {
      display: block;
      height: 2px;
      max-width: 100%;
      background: var(--atelier-moss);
      transition: width 180ms ease;
    }

    .subtask-row {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      align-items: center;
      gap: 0.75rem;
      min-height: 3rem;
      border-bottom: 1px solid color-mix(in srgb, var(--atelier-line) 72%, transparent);
    }

    .subtask-row label {
      display: flex;
      min-width: 0;
      align-items: center;
      gap: 0.65rem;
      color: var(--atelier-mist);
      font-size: 0.75rem;
    }

    .subtask-row label span {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .subtask-row label input {
      flex-shrink: 0;
      accent-color: var(--atelier-moss);
    }

    .subtask-row[data-complete="true"] label span {
      color: var(--atelier-moon);
      text-decoration: line-through;
    }

    .subtask-row__delete {
      display: grid;
      height: 2rem;
      width: 2rem;
      place-items: center;
      color: var(--atelier-moon);
    }

    .subtask-row__delete:hover,
    .subtask-row__delete:focus-visible {
      color: var(--atelier-lantern);
    }

Keep .subtasks-add as the final row, restyled with atelier tokens. Remove .subtasks-grid, .subtask-card, and their child selectors after the source test passes.

- [ ] **Step 5: Run focused Sub-task and redesign tests.**

Run:

    node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON --experimental-strip-types --test tests/subtaskPanel.test.ts tests/uiRedesign.test.ts

Expected: all focused tests pass, including existing callback and empty-state checks.

## Task 5: Redesign Focus Priorities as an ordered workbench

**Files:**

- Modify: components/tasks/TaskQueue.tsx
- Modify: app/globals.css for .priority-workbench and .priority-work-row
- Test: tests/uiRedesign.test.ts

- [ ] **Step 1: Add failing workbench assertions.**

Append:

    const prioritiesSource = readWorkspaceFile("../components/tasks/TaskQueue.tsx");

    test("Focus Priorities use ordered work rows without decorative task controls", () => {
      assert.match(prioritiesSource, /priority-workbench/);
      assert.match(prioritiesSource, /priority-work-row/);
      assert.match(prioritiesSource, /priority-work-row__drag/);
      assert.doesNotMatch(prioritiesSource, /task-confetti|priority-task__emoji|priority-task__color|task\.emoji/);
    });

- [ ] **Step 2: Run the focused test and verify it fails.**

Run:

    node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON --experimental-strip-types --test tests/uiRedesign.test.ts

Expected: the new workbench test fails because the component still includes confetti, emoji, color, and priority-task markup.

- [ ] **Step 3: Remove decorative state and replace priority row structure.**

Remove the celebrate state and task-confetti block. The completion handler becomes a direct behavior call:

    onClick={() => { onToggleTask(task.id); }}

Keep CheckIcon, the selected-task callback, ETA editing, drag/drop callbacks, move buttons, delete callback, and progress calculations. Replace the list wrapper and row internals with:

    <div className="priority-workbench">
      {tasks.length === 0 && <p className="priorities-empty">No priorities yet. Add the smallest useful step.</p>}
      {tasks.map((task, index) => {
        const taskProgress = getTaskProgress(task);
        const isActive = task.id === activeTask?.id;
        return (
          <article
            key={task.id}
            className="priority-work-row"
            data-active={isActive || undefined}
            data-complete={task.completed || undefined}
            draggable
            onDragStart={(event) => event.dataTransfer.setData("text/task-id", task.id)}
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => { event.preventDefault(); onReorderTasks(event.dataTransfer.getData("text/task-id"), task.id); }}
          >
            <span className="priority-work-row__drag" aria-hidden="true" />
            <button type="button" className="priority-work-row__check" onClick={() => { onToggleTask(task.id); }} aria-label={task.completed ? "Mark " + task.text + " incomplete" : "Mark " + task.text + " complete"}>
              {task.completed && <CheckIcon aria-hidden="true" />}
            </button>
            <button type="button" className="priority-work-row__title" onClick={() => !task.completed && onSelectTask(task)} aria-current={isActive ? "true" : undefined}>
              <strong>{task.text}</strong>
              <span>{taskProgress}% focused</span>
            </button>
            <label className="priority-work-row__eta">
              <span className="sr-only">Estimated minutes for {task.text}</span>
              <input type="number" min="5" max="480" step="5" defaultValue={task.estimatedMinutes} onBlur={(event) => onUpdateTask(task.id, { estimatedMinutes: Number(event.target.value) })} />
              <small>min</small>
            </label>
            <div className="priority-work-row__moves">
              <button type="button" onClick={() => onMoveTask(task.id, -1)} disabled={index === 0} aria-label={"Move " + task.text + " up"}><ChevronUpIcon /></button>
              <button type="button" onClick={() => onMoveTask(task.id, 1)} disabled={index === tasks.length - 1} aria-label={"Move " + task.text + " down"}><ChevronDownIcon /></button>
            </div>
            <button type="button" className="priority-work-row__delete" onClick={() => onDeleteTask(task.id)} aria-label={"Delete " + task.text}><TrashIcon /></button>
            {showProgress && <div className="priority-work-row__progress"><i style={{ width: taskProgress + "%" }} /></div>}
          </article>
        );
      })}
    </div>

Keep the existing priorities-panel outer class, aria-labelledby, summary values, add form, and footer settings. The existing onUpdateTask type can retain legacy emoji and color fields for storage compatibility; this surface must not render controls for them.

- [ ] **Step 4: Add workbench CSS and delete obsolete decorative rules.**

Add:

    .priority-workbench {
      display: grid;
      margin-top: 1rem;
      border-top: 1px solid var(--atelier-line);
    }

    .priority-work-row {
      position: relative;
      display: grid;
      grid-template-columns: 0.65rem auto minmax(0, 1fr) auto auto auto;
      align-items: center;
      gap: 0.75rem;
      min-height: 4.25rem;
      border-bottom: 1px solid color-mix(in srgb, var(--atelier-line) 72%, transparent);
      padding: 0.65rem 0;
    }

    .priority-work-row[data-active="true"] {
      border-left: 2px solid var(--atelier-lantern);
      padding-left: 0.65rem;
    }

    .priority-work-row[data-complete="true"] .priority-work-row__title strong {
      color: var(--atelier-moon);
      text-decoration: line-through;
    }

    .priority-work-row__drag {
      height: 1rem;
      width: 0.35rem;
      border-radius: 50%;
      background: var(--atelier-moon);
      box-shadow: 0 0.25rem 0 var(--atelier-moon), 0 0.5rem 0 var(--atelier-moon), 0.25rem 0 var(--atelier-moon), 0.25rem 0.25rem 0 var(--atelier-moon), 0.25rem 0.5rem 0 var(--atelier-moon);
      opacity: 0.7;
    }

    .priority-work-row__check {
      display: grid;
      height: 1.35rem;
      width: 1.35rem;
      place-items: center;
      border: 1px solid var(--atelier-line);
      border-radius: 50%;
      color: var(--atelier-ink);
    }

    .priority-work-row[data-complete="true"] .priority-work-row__check {
      border-color: var(--atelier-moss);
      background: var(--atelier-moss);
    }

    .priority-work-row__title {
      display: grid;
      min-width: 0;
      gap: 0.25rem;
      text-align: left;
    }

    .priority-work-row__title strong {
      overflow: hidden;
      color: var(--atelier-mist);
      font-size: 0.78rem;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .priority-work-row__title span,
    .priority-work-row__eta small {
      color: var(--atelier-moon);
      font-family: var(--font-mono);
      font-size: 0.62rem;
    }

    .priority-work-row__eta {
      display: inline-flex;
      align-items: baseline;
      gap: 0.3rem;
    }

    .priority-work-row__eta input {
      width: 3.5rem;
      border: 0;
      border-bottom: 1px solid var(--atelier-line);
      border-radius: 0;
      background: transparent;
      color: var(--atelier-mist);
      font-family: var(--font-mono);
      text-align: right;
    }

    .priority-work-row__moves {
      display: inline-flex;
      gap: 0.15rem;
    }

    .priority-work-row__moves button,
    .priority-work-row__delete {
      display: grid;
      height: 2rem;
      width: 2rem;
      place-items: center;
      color: var(--atelier-moon);
    }

    .priority-work-row__moves button:hover:not(:disabled),
    .priority-work-row__moves button:focus-visible,
    .priority-work-row__delete:hover,
    .priority-work-row__delete:focus-visible {
      color: var(--atelier-lantern);
    }

    .priority-work-row__progress {
      position: absolute;
      right: 0;
      bottom: 0;
      left: 0;
      height: 2px;
      background: color-mix(in srgb, var(--atelier-line) 72%, transparent);
    }

    .priority-work-row__progress i {
      display: block;
      height: 100%;
      background: var(--atelier-lantern);
    }

    @media (max-width: 42rem) {
      .priority-work-row {
        grid-template-columns: 0.65rem auto minmax(0, 1fr) auto;
      }

      .priority-work-row__moves,
      .priority-work-row__delete {
        grid-row: 2;
      }

      .priority-work-row__eta {
        grid-column: 3 / -1;
        justify-self: end;
      }
    }

Remove task-confetti styles, priority-task__emoji, priority-task__color, and abandoned priority-task child rules only after rg confirms the new names are the only callers. Keep task model color/emoji fields for data compatibility.

- [ ] **Step 5: Run workbench tests.**

Run:

    node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON --experimental-strip-types --test tests/uiRedesign.test.ts tests/taskModel.test.ts tests/useTasks.test.ts

Expected: all tests pass, with task-model and persistence behavior unchanged.

## Task 6: Shared cleanup and verification gate

**Files:**

- Modify: app/globals.css only for confirmed unused selectors and responsive conflicts
- Modify: tests/uiRedesign.test.ts only if a regression guard is needed

- [ ] **Step 1: Search for abandoned slop-era callers before deleting CSS.**

Run:

    rg -n "audio-panel__station-grid|audio-panel__station|settings-form-grid|settings-alert|subtasks-grid|subtask-card|task-confetti|priority-task__emoji|priority-task__color" app components tests

Delete a selector only when this search shows no live JSX/test caller, except for a test that intentionally asserts its absence. Do not remove shared classes still used by other settings sections or provider tabs.

- [ ] **Step 2: Run all tests fresh.**

Run:

    $testFiles = Get-ChildItem -Path tests -Filter *.test.ts | Select-Object -ExpandProperty FullName
    node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON --experimental-strip-types --test $testFiles

Expected: all tests pass, including existing timer, music-provider, task-model, settings, sub-task, and visual source checks.

- [ ] **Step 3: Run type, lint, build, and whitespace gates.**

Run each command independently:

    npx tsc --noEmit
    npm run lint
    npm run build
    git diff --check

Expected: exit code 0 for every command. A line-ending warning from Git is acceptable; whitespace errors are not.

- [ ] **Step 4: Inspect the focused final diff and preserve unrelated work.**

Run:

    git status --short
    git diff -- components/ui/OverlayPanel.tsx app/globals.css components/settings/SettingsPanel.tsx components/audio/LoFiPlayer.tsx components/tasks/SubtaskPanel.tsx components/tasks/TaskQueue.tsx tests/subtaskPanel.test.ts tests/uiRedesign.test.ts

Confirm the diff contains only the approved five-surface redesign. Do not run git add ., reset, checkout, or broad cleanup. Because the main component and stylesheet files already contain unrelated local work, leave them uncommitted unless their staged hunks can be proven isolated.

- [ ] **Step 5: Perform visual review when the named browser is available.**

Inspect the five surfaces at a desktop and narrow viewport. Check for clipping, overlap, readable contrast, keyboard focus, working controls, empty/completed/disabled states, and no visible scrollbar chrome. If the connected Chrome session is unavailable, report browser verification as unresolved instead of substituting another browser or claiming live QA.
