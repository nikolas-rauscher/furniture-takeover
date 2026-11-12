export const AVAILABILITY_FLAG_KEY = "takeover-availability-flag";

export type AvailabilityFlag = {
  enabled: boolean;
  /** `?availability=off` was opened: undo this feature's listing changes once. */
  cleanup: boolean;
};

/**
 * `?availability=reserve` turns the prototype on and remembers it in this
 * browser. `?availability=off`, or another variant's value, forgets it so only
 * one availability prototype runs at a time. Without the parameter the stored
 * value applies.
 */
export function resolveAvailabilityFlag(
  search: string,
  storage: Pick<Storage, "getItem" | "setItem" | "removeItem">,
): AvailabilityFlag {
  const requested = new URLSearchParams(search).get("availability");
  try {
    if (requested === "reserve") {
      storage.setItem(AVAILABILITY_FLAG_KEY, "reserve");
      return { enabled: true, cleanup: false };
    }
    if (requested !== null) {
      storage.removeItem(AVAILABILITY_FLAG_KEY);
      return { enabled: false, cleanup: true };
    }
    return {
      enabled: storage.getItem(AVAILABILITY_FLAG_KEY) === "reserve",
      cleanup: false,
    };
  } catch {
    // Without storage the flag still works for the current page load.
    return {
      enabled: requested === "reserve",
      cleanup: requested !== null && requested !== "reserve",
    };
  }
}
