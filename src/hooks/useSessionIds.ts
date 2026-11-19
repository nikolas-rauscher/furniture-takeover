import { useEffect, useState } from "react";
import { accountStorageKey } from "../cloud/session.ts";
import { isFavoriteIds as isListingIds, restoreSavedValue } from "./savedState";

type SessionIds = { ids: string[]; storable: boolean };

/** Where the browser blocks storage, the ids last for the page load: the page works without it. */
function restore(key: string): SessionIds {
  try {
    const stored = sessionStorage.getItem(key);
    return {
      ids: restoreSavedValue(stored, [], isListingIds).value,
      storable: true,
    };
  } catch {
    return { ids: [], storable: false };
  }
}

/**
 * Listing ids that last as long as the browser tab, such as the listings picked for a
 * comparison: a reload keeps them, a new visit starts without them.
 */
export function useSessionIds(name: string) {
  const key = accountStorageKey(name);
  const [restored] = useState(() => restore(key));
  const [ids, setIds] = useState(restored.ids);
  useEffect(() => {
    if (!restored.storable) return;
    try {
      sessionStorage.setItem(key, JSON.stringify(ids));
    } catch {
      // As with saved state: the app's listener mounts after this effect on the first render.
      queueMicrotask(() =>
        window.dispatchEvent(new CustomEvent("storage-failure")),
      );
    }
  }, [key, ids, restored]);
  return [ids, setIds] as const;
}
