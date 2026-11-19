/** Long enough for the current screen's own work to settle first. */
const IDLE_DELAY_MS = 1500;

/** Runs a task at an idle moment; Safari has no idle callback, so it waits a fixed time there. */
export function whenIdle(task: () => void) {
  const idleCallback = window.requestIdleCallback as
    Window["requestIdleCallback"] | undefined;
  if (idleCallback) {
    const id = idleCallback(task, { timeout: IDLE_DELAY_MS * 2 });
    return () => window.cancelIdleCallback(id);
  }
  const id = window.setTimeout(task, IDLE_DELAY_MS);
  return () => window.clearTimeout(id);
}
