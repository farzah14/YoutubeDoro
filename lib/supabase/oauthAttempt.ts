// React's disabled state is rendered asynchronously. Lock before awaiting so
// multiple clicks cannot create overlapping login attempts in the same tab.
export function createOAuthAttempt() {
  let pending = false;
  return async (start: () => Promise<void>): Promise<void> => {
    if (pending) return;
    pending = true;
    try {
      await start();
      // A successful start navigates away; keep the lock until the page unloads.
    } catch (error) {
      pending = false;
      throw error;
    }
  };
}
