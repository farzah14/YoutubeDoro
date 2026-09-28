import assert from "node:assert/strict";
import { test } from "node:test";

import { sourceSubtaskId, synapseChecklistPrefix } from "../lib/integrations/synapse/checklist.ts";

test("checklist changes stay under the matching Synapse source account", () => {
  const first = synapseChecklistPrefix("synapse-account-a");
  const second = synapseChecklistPrefix("synapse-account-b");
  const id = "a83b21d0-9597-41f2-98bf-489aa2ba02a1";
  assert.notEqual(first, second);
  assert.equal(sourceSubtaskId(`${first}${id}`, first), id);
  assert.equal(sourceSubtaskId(`${first}${id}`, second), null);
  assert.equal(sourceSubtaskId(`${first}not-an-id`, first), null);
});
