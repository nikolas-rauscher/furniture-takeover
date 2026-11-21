import { useEffect, useRef, useState } from "react";
import type { View } from "../navigation";

/**
 * Keeps a server-owned catalog current in an open tab: Browse and Saved read it
 * again when a student opens them, and a listing page whose id is not loaded yet
 * reads it once before saying the listing is unavailable.
 * Returns whether the open listing page may show its result.
 */
export function useCatalogRefresh({
  refresh,
  view,
  savedOpen,
  missingListingId,
}: {
  /** Absent when the browser owns the catalog, as in the demo. */
  refresh?: () => Promise<boolean>;
  view: View;
  savedOpen: boolean;
  /** The listing page's id when that listing is not in the catalog. */
  missingListingId: string | null;
}): boolean {
  const page = view === "discover" ? "browse" : savedOpen ? "saved" : null;
  const previousPage = useRef(page);
  useEffect(() => {
    if (refresh && page && page !== previousPage.current) void refresh();
    previousPage.current = page;
  }, [page, refresh]);

  const [checkedId, setCheckedId] = useState<string | null>(null);
  useEffect(() => {
    if (!refresh || !missingListingId) return;
    let active = true;
    void refresh().then(() => {
      if (active) setCheckedId(missingListingId);
    });
    return () => {
      active = false;
    };
  }, [missingListingId, refresh]);

  return !refresh || !missingListingId || checkedId === missingListingId;
}
