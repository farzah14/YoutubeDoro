import assert from "node:assert/strict";
import test from "node:test";

import {
  advanceAttention,
  createAttentionState,
} from "../lib/attention/attentionEngine";

test("less than five seconds away never alerts", () => {
  let state = createAttentionState();

  ({ state } = advanceAttention(state, "away", 0, 5_000));
  const transition = advanceAttention(state, "away", 4_999, 5_000);

  assert.equal(transition.shouldAlert, false);
  assert.deepEqual(transition.state, { awaySinceMs: 0, alerted: false });
});

test("five seconds away alerts once and continued away does not repeat", () => {
  let state = createAttentionState();

  ({ state } = advanceAttention(state, "away", 100, 5_000));
  const firstAlert = advanceAttention(state, "away", 5_100, 5_000);
  const continuedAway = advanceAttention(firstAlert.state, "away", 8_000, 5_000);

  assert.equal(firstAlert.shouldAlert, true);
  assert.deepEqual(firstAlert.state, { awaySinceMs: 100, alerted: true });
  assert.equal(continuedAway.shouldAlert, false);
  assert.deepEqual(continuedAway.state, { awaySinceMs: 100, alerted: true });
});

test("focused and inactive reset the episode and rearm alerts", () => {
  let state = createAttentionState();

  ({ state } = advanceAttention(state, "away", 0, 5_000));
  ({ state } = advanceAttention(state, "focused", 1_000, 5_000));
  assert.deepEqual(state, { awaySinceMs: null, alerted: false });

  ({ state } = advanceAttention(state, "away", 2_000, 5_000));
  ({ state } = advanceAttention(state, "inactive", 3_000, 5_000));
  assert.deepEqual(state, { awaySinceMs: null, alerted: false });

  ({ state } = advanceAttention(state, "away", 4_000, 5_000));
  const rearmed = advanceAttention(state, "away", 9_000, 5_000);
  assert.equal(rearmed.shouldAlert, true);
});
