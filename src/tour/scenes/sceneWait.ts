/** How often a wait looks again for what it waits on. */
const POLL_MS = 50;

/** Resolves after `ms`; rejects with the signal's reason once the round stops. */
export function pause(ms: number, signal: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    if (signal.aborted) {
      reject(signal.reason);
      return;
    }
    const stop = () => {
      clearTimeout(timer);
      reject(signal.reason);
    };
    const timer = setTimeout(() => {
      signal.removeEventListener("abort", stop);
      resolve();
    }, ms);
    signal.addEventListener("abort", stop, { once: true });
  });
}

/**
 * Looks for something the screen is about to show, such as a sheet that is
 * still opening, until it is there or `timeoutMs` has passed. Running out of
 * time is an error that names what never came.
 */
export async function waitFor<Found>(
  find: () => Found | null,
  {
    what,
    timeoutMs,
    signal,
  }: {
    what: string;
    timeoutMs: number;
    signal: AbortSignal;
  },
): Promise<Found> {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    const found = find();
    if (found !== null) return found;
    if (Date.now() >= deadline)
      throw new Error(`${what} did not appear within ${timeoutMs} ms.`);
    await pause(POLL_MS, signal);
  }
}
