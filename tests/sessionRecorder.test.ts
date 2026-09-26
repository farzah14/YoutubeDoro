import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import React from "react";
import { renderToString } from "react-dom/server";
import { useSessionRecorder } from "../hooks/useSessionRecorder.ts";

test("session recorder exposes server-backed lifecycle checkpoints", () => {
  const file = join(process.cwd(), "hooks/useSessionRecorder.ts");
  assert.equal(existsSync(file), true);
  const source = readFileSync(file, "utf8");
  for (const token of ["start", "checkpoint", "breakStart", "breakCheckpoint", "breakEnd", "finalize", "updateMetadata", "recover", "setInterval", "learningSeconds"]) {
    assert.equal(source.includes(token), true, `missing ${token}`);
  }
  assert.equal(source.includes("writeJSON"), false);
  assert.equal(source.includes("localStorage"), false);
});

test("session recorder blocks checkpoints only while finalization is in flight", async (context) => {
  const originalFetch = globalThis.fetch;
  context.after(() => { globalThis.fetch = originalFetch; });

  let releaseFinalization: (() => void) | undefined;
  const finalizationPending = new Promise<void>((resolve) => { releaseFinalization = resolve; });
  const updates: Array<Record<string, unknown>> = [];
  const session = {
    id: "11111111-1111-4111-8111-111111111111",
    taskId: null,
    taskTitleSnapshot: "Basic Networking",
    title: "Basic Networking",
    note: "",
    timerMode: "pomodoro" as const,
    plannedSeconds: 60,
    learningSeconds: 0,
    breakCount: 0,
    breakSeconds: 0,
    status: "active" as const,
    startedAt: "2026-09-22T00:00:00.000Z",
    endedAt: null,
    createdAt: "2026-09-22T00:00:00.000Z",
    updatedAt: "2026-09-22T00:00:00.000Z",
  };

  globalThis.fetch = async (_input, init) => {
    if (init?.method === "POST") return Response.json({ session });
    const update = JSON.parse(String(init?.body)) as Record<string, unknown>;
    updates.push(update);
    if (update.status !== undefined) {
      await finalizationPending;
      return Response.json({ error: "temporary failure" }, { status: 500 });
    }
    return Response.json({ session: { ...session, ...update } });
  };

  let recorder: ReturnType<typeof useSessionRecorder> | undefined;
  function Harness() {
    // One-shot SSR harness: expose the hook API without adding a browser test dependency.
    // eslint-disable-next-line react-hooks/globals
    recorder = useSessionRecorder();
    return null;
  }
  renderToString(React.createElement(Harness));
  assert.ok(recorder);
  await recorder.start({
    taskTitleSnapshot: session.taskTitleSnapshot,
    title: session.title,
    timerMode: session.timerMode,
    plannedSeconds: session.plannedSeconds,
  });

  const measurements = { learningSeconds: 60, breakCount: 1, breakSeconds: 15 };
  const finalizing = recorder.finalize("completed", measurements);
  await Promise.resolve();
  recorder.checkpoint(measurements, true);
  await Promise.resolve();
  assert.deepEqual(updates.map((update) => update.status ?? "checkpoint"), ["completed"]);

  releaseFinalization?.();
  assert.equal(await finalizing, false);
  recorder.checkpoint(measurements, true);
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.deepEqual(updates.map((update) => update.status ?? "checkpoint"), ["completed", "checkpoint"]);
});
