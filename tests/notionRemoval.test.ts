import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

test("runtime has no external workspace integration surface", () => {
  const roots = ["app", "components", "hooks", "lib", "types"];
  const files: string[] = [];
  const visit = (directory: string) => {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const fullPath = join(directory, entry.name);
      if (entry.isDirectory()) visit(fullPath);
      else files.push(fullPath);
    }
  };
  for (const root of roots) visit(join(process.cwd(), root));
  files.push(join(process.cwd(), "package.json"), join(process.cwd(), "README.md"));
  const forbidden = /notion|NOTION_|@notionhq\/client|useNotionSync|NotionSettingsModal|NotionSyncButton/i;
  for (const file of files) {
    assert.doesNotMatch(readFileSync(file, "utf8"), forbidden, file);
  }
  for (const path of ["app/api/notion", "components/notion"]) {
    const directory = join(process.cwd(), path);
    const hasFiles = (current: string): boolean => readdirSync(current, { withFileTypes: true }).some((entry) => entry.isFile() || (entry.isDirectory() && hasFiles(join(current, entry.name))));
    assert.equal(existsSync(directory) ? hasFiles(directory) : false, false, path);
  }
  for (const path of ["hooks/useNotionSync.ts", "lib/notion.ts", "components/notes/NotesPanel.tsx", "hooks/useDailyNotes.ts"]) {
    assert.equal(existsSync(join(process.cwd(), path)), false, path);
  }
});
