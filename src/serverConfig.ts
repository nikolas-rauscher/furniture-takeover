let request: Promise<Record<string, unknown>> | null = null;

/**
 * The server's setup, asked for once. The entry starts the request before the app's
 * code arrives; the app then reads the same answer.
 */
export function requestServerConfig() {
  request ??= fetch("/api/config").then((response) => {
    if (!response.ok) throw Error("Could not connect to the app server.");
    return response.json() as Promise<Record<string, unknown>>;
  });
  return request;
}

/** The local demo's setup is empty; accounts name their project instead. */
export function isLocalDemo(config: Record<string, unknown>) {
  return Object.keys(config).length === 0;
}
