const DEMO_CATALOG = "/api/listings?demo=true";
const READ_TIMEOUT_MS = 8000;

let early: Promise<Response> | null = null;

function readNow() {
  return fetch(DEMO_CATALOG, { signal: AbortSignal.timeout(READ_TIMEOUT_MS) });
}

/** Reads the body at once, so the read's timeout cannot cut it off while it waits for the app. */
async function buffered(response: Response) {
  return new Response(await response.blob(), response);
}

/** Starts the local demo's catalog read while the app's code is still downloading. */
export function startDemoCatalogRead() {
  early ??= readNow().then(buffered);
}

/**
 * The catalog read started early, handed out once, or a new read. A read after
 * pending writes must be `fresh`, so it cannot predate them.
 */
export function readDemoCatalog(fresh: boolean) {
  const response = early && !fresh ? early : readNow();
  early = null;
  return response;
}
