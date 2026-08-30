import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const dockSource = readFileSync(
  new URL("../components/layout/WorkspaceDock.tsx", import.meta.url),
  "utf8",
);
const iconSource = readFileSync(
  new URL("../components/icons/index.tsx", import.meta.url),
  "utf8",
);
const stylesSource = readFileSync(
  new URL("../app/globals.css", import.meta.url),
  "utf8",
);
const learningCardSource = readFileSync(
  new URL("../components/timer/LearningCard.tsx", import.meta.url),
  "utf8",
);

test("learning methods sit left of settings in the right dock", () => {
  const rightDock =
    dockSource.match(
      /<div className="workspace-dock__right"[\s\S]*?<\/div>/,
    )?.[0] ?? "";

  assert.match(rightDock, /LearningMethodPicker[\s\S]*title="Settings"/);
  assert.match(dockSource, /workspace-dock__method-option-icon/);
  assert.match(
    stylesSource,
    /\.workspace-dock__method-menu\s*\{[\s\S]*right:\s*0;[\s\S]*left:\s*auto;[\s\S]*transform:\s*none/,
  );
  assert.match(
    stylesSource,
    /\.workspace-dock__method-option-icon\s*\{[\s\S]*flex:\s*0\s+0\s+auto/,
  );
});

test("focus rails do not render the two divider lines", () => {
  const priorityAction =
    stylesSource.match(/\.focus-dashboard__priority-action\s*\{[\s\S]*?\n\}/)?.[0] ?? "";
  const deskRail =
    stylesSource.match(/\.focus-dashboard__desk-rail\s*\{[\s\S]*?\n\}/)?.[0] ?? "";
  const phaseButtons =
    stylesSource.match(/\.focus-dashboard__phases button\s*\{[\s\S]*?\n\}/)?.[0] ?? "";
  const activePhase =
    stylesSource.match(/\.focus-dashboard__phases button\.is-active\s*\{[\s\S]*?\n\}/)?.[0] ?? "";

  assert.doesNotMatch(priorityAction, /border-bottom/);
  assert.doesNotMatch(deskRail, /border-bottom/);
  assert.doesNotMatch(phaseButtons, /border-bottom/);
  assert.doesNotMatch(activePhase, /border-color/);
  assert.doesNotMatch(learningCardSource, /focus-dashboard__desk-rail/);
});

test("Pomodoro uses a dedicated timer-face icon", () => {
  assert.match(dockSource, /pomodoro:\s*PomodoroIcon/);
  assert.match(iconSource, /export function PomodoroIcon/);
  assert.doesNotMatch(dockSource, /pomodoro:\s*\(props\) => <TomatoIcon/);
});

test("priority change uses a pencil icon with hidden action text", () => {
  const priorityActionStyles =
    stylesSource.match(/\.focus-dashboard__priority-action\s*\{[\s\S]*?\n\}/)?.[0] ?? "";

  assert.match(learningCardSource, /<PencilIcon/);
  assert.doesNotMatch(learningCardSource, /<span>Change<\/span>/);
  assert.match(learningCardSource, /sr-only">Change priority<\/span>/);
  assert.match(iconSource, /export function PencilIcon/);
  assert.match(
    priorityActionStyles,
    /justify-content:\s*center[\s\S]*gap:\s*0\.5rem[\s\S]*text-align:\s*center/,
  );
  assert.match(
    stylesSource,
    /\.focus-dashboard__task-label\s*\{[\s\S]*max-width:\s*calc\(100% - 1\.5rem\)/,
  );
});

test("reset and picture-in-picture controls have no decorative outline", () => {
  const iconControls =
    stylesSource.match(/\.focus-dashboard__icon,[\s\S]*?\.focus-dashboard__pip\s*\{[\s\S]*?\n\}/)?.[0] ?? "";

  assert.match(iconControls, /border:\s*0/);
  assert.match(iconControls, /background:\s*transparent/);
  assert.match(learningCardSource, /aria-label="Reset timer"/);
  assert.match(learningCardSource, /aria-label="Open picture-in-picture"/);
});

test("focus phases use orange Focus and green Break backgrounds", () => {
  const activePhaseStyles =
    stylesSource.match(/\.focus-dashboard__phase-option\[aria-selected="true"\]\s*\{[\s\S]*?\n\}/)?.[0] ?? "";
  const breakPhaseStyles =
    stylesSource.match(/\.focus-dashboard__phase-option\[data-phase="break"\]\[aria-selected="true"\]\s*\{[\s\S]*?\n\}/)?.[0] ?? "";
  assert.match(
    activePhaseStyles,
    /background:\s*var\(--studio-lamplight\)/,
  );
  assert.match(
    breakPhaseStyles,
    /background:\s*var\(--studio-break\)/,
  );
  assert.match(
    learningCardSource,
    /const showPhases = timer\.preferences\.mode !== "countdown" && timer\.preferences\.mode !== "stopwatch"/,
  );
});

test("focus and break use an icon-only phase chooser beside timer controls", () => {
  const controls =
    learningCardSource.match(/<div className="focus-dashboard__controls">[\s\S]*?<\/div>/)?.[0] ?? "";

  assert.match(controls, /<PhasePicker[\s\S]*?\/>/);
  assert.match(learningCardSource, /onChange=\{\(phase\) => timer\.selectPhase\(phase\)\}/);
  assert.match(learningCardSource, /aria-haspopup="listbox"/);
  assert.match(learningCardSource, /LightbulbIcon/);
  assert.match(learningCardSource, /FlameIcon/);
  assert.match(learningCardSource, /data-phase=\{phase\}/);
  assert.match(learningCardSource, /sr-only">Timer phase:/);
  assert.doesNotMatch(learningCardSource, /focus-dashboard__phase-label/);
  assert.match(
    stylesSource,
    /\.focus-dashboard__phase-menu\s*\{[\s\S]*right:\s*0;[\s\S]*bottom:\s*calc\(100%/,
  );
  assert.match(
    stylesSource,
    /\.focus-dashboard__phase-trigger\s*\{[\s\S]*min-width:\s*44px/,
  );
});

test("selected Focus and Break states color the chooser and primary action", () => {
  assert.match(stylesSource, /--studio-break:\s*#4ade80/);
  assert.match(
    stylesSource,
    /\.focus-dashboard__phase-trigger\s*\{[\s\S]*color:\s*var\(--studio-lamplight\)/,
  );
  assert.match(
    stylesSource,
    /\.focus-dashboard\[data-phase="break"\]\s+\.focus-dashboard__phase-trigger\s*\{[\s\S]*color:\s*var\(--studio-break\)/,
  );
  assert.match(learningCardSource, /data-phase=\{option\}/);
  assert.match(
    stylesSource,
    /\.focus-dashboard__phase-option\[data-phase="break"]:hover,[\s\S]*background:\s*var\(--studio-break\)/,
  );
  assert.match(
    stylesSource,
    /\.focus-dashboard\[data-phase="break"\]\s+\.focus-dashboard__primary\s*\{[\s\S]*background:\s*var\(--studio-break\)/,
  );
  assert.match(learningCardSource, /visiblePhase === "break" \? "Break" : "Start"/);
  assert.doesNotMatch(stylesSource, /\.focus-dashboard\[data-phase="break"\]\s+\.focus-dashboard__icon/);
  assert.doesNotMatch(stylesSource, /\.focus-dashboard\[data-phase="break"\]\s+\.focus-dashboard__pip/);
});

test("phase trigger keeps an icon-style transparent background", () => {
  const focusTriggerStyles =
    stylesSource.match(/\.focus-dashboard__phase-trigger\s*\{[\s\S]*?\n\}/)?.[0] ?? "";
  const breakTriggerStyles =
    stylesSource.match(/\.focus-dashboard\[data-phase="break"\]\s+\.focus-dashboard__phase-trigger\s*\{[\s\S]*?\n\}/)?.[0] ?? "";
  assert.match(focusTriggerStyles, /background:\s*transparent/);
  assert.match(focusTriggerStyles, /border:\s*0/);
  assert.equal(
    !breakTriggerStyles.includes("background:") || breakTriggerStyles.includes("background: transparent"),
    true,
    "Break trigger must not add a filled background",
  );
});

test("focus dashboard omits the daily focused helper line", () => {
  assert.doesNotMatch(learningCardSource, /focus-dashboard__today/);
  assert.doesNotMatch(stylesSource, /\.focus-dashboard__today\s*\{/);
});
