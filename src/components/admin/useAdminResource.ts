import { useCallback, useEffect, useState } from "react";
import { AdminApiError } from "../../api/admin";

export type Resource<T> =
  | { state: "loading" }
  | { state: "ready"; data: T }
  | { state: "failed"; message: string };

/** The message to show beside the control whose admin request failed. */
export function adminFailure(error: unknown): string {
  if (error instanceof AdminApiError) return error.message;
  throw error;
}

/**
 * One admin list, loaded when the screen opens and again on `reload`. The
 * previous rows stay on screen while a reload runs, so lists do not flash.
 */
export function useAdminResource<T>(load: () => Promise<T>) {
  const [resource, setResource] = useState<Resource<T>>({ state: "loading" });
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let current = true;
    load().then(
      (data) => current && setResource({ state: "ready", data }),
      (error: unknown) =>
        current &&
        setResource({ state: "failed", message: adminFailure(error) }),
    );
    return () => {
      current = false;
    };
  }, [load, attempt]);
  const reload = useCallback(() => setAttempt((count) => count + 1), []);
  return { resource, reload };
}
