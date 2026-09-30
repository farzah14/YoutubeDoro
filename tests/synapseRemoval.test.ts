import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

test("runtime has no Synapse integration surface", () => {
  const roots = ["app", "components", "hooks", "lib"];
  const files: string[] = [];

  const visit = (directory: string) => {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const fullPath = join(directory, entry.name);
      if (entry.isDirectory()) visit(fullPath);
      else files.push(fullPath);
    }
  };

  for (const root of roots) visit(join(process.cwd(), root));

  // Check forbidden paths
  const forbiddenPaths = [
    "app/api/integrations",
    "app/integrations",
    "lib/integrations",
    "components/settings/SynapseGrantControls.tsx",
    "tests/synapsePlan.test.ts",
    "tests/synapseIntegration.test.ts",
    "tests/synapseChecklist.test.ts",
  ];

  for (const path of forbiddenPaths) {
    const fullPath = join(process.cwd(), path);
    assert.equal(existsSync(fullPath), false, `Forbidden integration path exists: ${path}`);
  }

  // Check that runtime code does not import or call Synapse integrations
  const forbiddenPatterns = [
    /SynapseGrantControls/i,
    /selectActiveTaskForSynapseCourses/i,
    /set_synapse_subtask_completion/i,
    /apply_synapse_plan/i,
    /from\s+['"]@\/lib\/integrations\/synapse/i,
  ];

  for (const file of files) {
    const content = readFileSync(file, "utf8");
    for (const pattern of forbiddenPatterns) {
      assert.doesNotMatch(content, pattern, `File ${file} contains forbidden pattern ${pattern}`);
    }
  }
});
