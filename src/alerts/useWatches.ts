import type { Dispatch, SetStateAction } from "react";
import type { Product } from "../../shared/marketplace";
import type { SavedSearch } from "../searchRequest";
import type { AlertItem } from "./matching";
import { useAlerts } from "./useAlerts";
import { activateWatch, findWatch, watchSearch } from "./watch";
import { randomUuid } from "../randomUuid";

/** A new match as the Searches page shows it: the alert with its listing and search. */
export type WatchMatch = {
  alert: AlertItem;
  listing: Product;
  search: SavedSearch;
};

type WatchesOptions = {
  /** Every saved search, the intro's sample search included. */
  jobs: SavedSearch[];
  setJobs: Dispatch<SetStateAction<SavedSearch[]>>;
  /** The saved searches the student keeps; only these watch for listings. */
  watched: SavedSearch[];
  listings: Product[];
  ready: boolean;
  location: string;
};

/**
 * Saved searches that keep watch for new listings in this browser, and the
 * matches they found. Starting a watch reuses an equivalent paused search.
 */
export function useWatches({
  jobs,
  setJobs,
  watched,
  listings,
  ready,
  location,
}: WatchesOptions) {
  const alerts = useAlerts(watched, listings, ready);
  const listingById = new Map(listings.map((item) => [item.id, item]));
  const searchById = new Map(watched.map((job) => [job.id, job]));
  // A match is only useful while its listing can still be opened.
  const matches = alerts.alerts.flatMap((alert): WatchMatch[] => {
    const listing = listingById.get(alert.listingId);
    const search = searchById.get(alert.jobId);
    return listing?.status === "active" && search
      ? [{ alert, listing, search }]
      : [];
  });

  function isWatching(query: string, maxPrice?: number) {
    const search = watchSearch(query, location, maxPrice);
    return search !== undefined && findWatch(jobs, search)?.paused === false;
  }
  /** Starts or resumes the watch; false when it is running already. */
  function watch(query: string, maxPrice?: number): boolean {
    const search = watchSearch(query, location, maxPrice);
    if (!search) throw new Error("A watch needs the item to look out for.");
    if (findWatch(jobs, search)?.paused === false) return false;
    const id = randomUuid();
    setJobs((current) => activateWatch(current, search, id));
    return true;
  }
  function togglePause(job: SavedSearch) {
    setJobs((current) =>
      current.map((item) =>
        item.id === job.id ? { ...item, paused: !item.paused } : item,
      ),
    );
  }

  return {
    matches,
    unread: alerts.unread,
    isWatching,
    watch,
    togglePause,
    markRead: alerts.markRead,
    markAllRead: alerts.markAllRead,
    dismiss: alerts.dismiss,
    clear: alerts.clear,
  };
}
