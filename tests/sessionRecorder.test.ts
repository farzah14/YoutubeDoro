import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

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
