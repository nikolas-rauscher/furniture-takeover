import { accountStorageKey } from "../cloud/session.ts";
import { useEffect, useState } from "react";
import { restoreSavedValue, type SavedValueValidator } from "./savedState";

export function useSaved<T>(
  key: string,
  fallback: T,
  validate: SavedValueValidator<T>,
) {
  key = accountStorageKey(key);
  const [initial] = useState(() => {
    try {
      return restoreSavedValue(localStorage.getItem(key), fallback, validate);
    } catch {
      return { value: fallback, source: "unavailable" as const };
    }
  });
  const [state, setState] = useState<T>(initial.value);
  useEffect(() => {
    // Keep unreadable stored data recoverable until the user makes a change.
    if (
      state === initial.value &&
      (initial.source === "invalid" || initial.source === "unavailable")
    )
      return;
    try {
      localStorage.setItem(key, JSON.stringify(state));
    } catch {
      // App listeners mount after this hook's effect on the initial render.
      queueMicrotask(() =>
        window.dispatchEvent(new CustomEvent("storage-failure")),
      );
    }
  }, [key, state, initial]);
  return [state, setState] as const;
}
