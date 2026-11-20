/** How long Pako waits before trying a busy request once more. */
const BUSY_RETRY_MS = 1_000;

/** The server turned a request away because every agent slot was taken; nothing started. */
export const isAgentBusy = (error: unknown) =>
  error instanceof Error &&
  (error as Error & { code?: unknown }).code === "TOO_MANY_REQUESTS";

/**
 * Sends a request and, when the server is busy, tries exactly once more after
 * a short wait. A second busy answer, or any other failure, is thrown.
 */
export async function retryOnceWhenBusy<T>(
  request: () => Promise<T>,
  { signal, onRetry }: { signal: AbortSignal; onRetry: () => void },
): Promise<T> {
  try {
    return await request();
  } catch (error) {
    if (!isAgentBusy(error) || signal.aborted) throw error;
    onRetry();
    await new Promise((resolve) => setTimeout(resolve, BUSY_RETRY_MS));
    signal.throwIfAborted();
    return request();
  }
}
