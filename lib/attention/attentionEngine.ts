export type AttentionObservation = "focused" | "away" | "inactive";

export type AttentionState = {
  awaySinceMs: number | null;
  alerted: boolean;
};

export type AttentionTransition = {
  state: AttentionState;
  shouldAlert: boolean;
};

export function createAttentionState(): AttentionState {
  return { awaySinceMs: null, alerted: false };
}

export function advanceAttention(
  state: AttentionState,
  observation: AttentionObservation,
  nowMs: number,
  awayDurationMs: number,
): AttentionTransition {
  if (observation !== "away") {
    return { state: createAttentionState(), shouldAlert: false };
  }

  const awaySinceMs = state.awaySinceMs ?? nowMs;
  const elapsedMs = nowMs - awaySinceMs;
  const shouldAlert = !state.alerted && elapsedMs >= awayDurationMs;

  return {
    state: { awaySinceMs, alerted: state.alerted || shouldAlert },
    shouldAlert,
  };
}
