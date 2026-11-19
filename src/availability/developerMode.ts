import { createAvailabilityRepository } from "./storage.ts";

export const DEVELOPER_MODE_KEY = "takeover-developer-mode";
type BrowserStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;

/** This controls local demo tools only; it never changes account permissions. */
export function readDeveloperMode(storage: BrowserStorage): boolean {
  try {
    const preference = storage.getItem(DEVELOPER_MODE_KEY);
    if (preference !== null) return preference === "true";
    // Existing demos must keep their accelerated clock visible after upgrading.
    // A fresh browser has no saved demo state and starts with the tools off.
    return createAvailabilityRepository(storage).load().state.clockOffsetMs > 0;
  } catch {
    return false;
  }
}

export function writeDeveloperMode(storage: BrowserStorage, enabled: boolean) {
  storage.setItem(DEVELOPER_MODE_KEY, String(enabled));
}
