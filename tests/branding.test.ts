import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import test from "node:test";

const readWorkspaceFile = (path: string) => readFileSync(
  fileURLToPath(new URL(path, import.meta.url)),
  "utf8",
);

test("website-facing branding uses StudyRythms", () => {
  const websiteSources = [
    readWorkspaceFile("../app/layout.tsx"),
    readWorkspaceFile("../public/manifest.json"),
    readWorkspaceFile("../components/layout/Header.tsx"),
    readWorkspaceFile("../components/layout/WorkspaceDock.tsx"),
    readWorkspaceFile("../components/auth/AuthScreen.tsx"),
    readWorkspaceFile("../app/auth/reset-password/page.tsx"),
    readWorkspaceFile("../components/settings/SettingsPanel.tsx"),
    readWorkspaceFile("../hooks/useTimer.ts"),
  ];
  const styles = readWorkspaceFile("../app/globals.css");
  assert.match(
    styles,
    /\.scene-brand h1\s*\{[^}]*font-family:\s*var\(--font-mono\)[^}]*letter-spacing:\s*-0\.04em/,
  );

  for (const source of websiteSources) {
    assert.match(source, /StudyRythms/);
    assert.doesNotMatch(source, /YoutubeDoro|YouTubeDoro/);
  }
});
