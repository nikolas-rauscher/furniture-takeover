import { useEffect } from "react";
import type { Deal } from "../../shared/deal";
import type { Product } from "../../shared/marketplace";
import type { useMarketplaceListings } from "./useMarketplaceListings";
import type { DealStatusChange } from "../components/ThreadDeal";
import { STATUS_NOTICES, statusFailure } from "../listingStatusWords";
import { isListingStatuses } from "./savedState";
import { useSaved } from "./useSaved";
import type { Toasts } from "./useToast";

type ListingStatus = Product["status"];

export type MyListings = ReturnType<typeof useMyListings>;

/** Listings for the mode the app runs in, sorted by status, and the one path their status changes through. */
export function useMyListings({
  database,
  deals,
  toast,
  onArchived,
}: {
  database: ReturnType<typeof useMarketplaceListings>;
  deals: Deal[];
  toast: Toasts;
  onArchived: (id: string) => void;
}) {
  const own = database.listings;
  const setOwn = database.setListings;
  const reloadListings = database.retry;
  const externalDealStatuses = !database.refreshOnDealChange
    ? null
    : deals
        .map(({ listingId, status }) => `${listingId}:${status}`)
        .sort()
        .join(",");
  useEffect(() => {
    if (externalDealStatuses !== null && !database.pending)
      void reloadListings();
  }, [externalDealStatuses, database.pending, reloadListings]);
  /** What demo deals reserved or made available again, as it was before; clearing the workspace puts it back. */
  const [statusBefore, setStatusBefore] = useSaved<
    Record<string, ListingStatus>
  >("takeover-deal-original-status", {}, isListingStatuses);

  // Preserve old browser records, but never show seeded inventory as real offers.
  const expiredReleases = new Set(
    deals
      .filter((deal) => deal.outcome?.kind === "pickup_expired")
      .filter(
        (deal) =>
          !deals.some(
            (other) =>
              other.listingId === deal.listingId && other.status === "agreed",
          ),
      )
      .map(({ listingId }) => listingId),
  );
  const releasePending =
    database.dealStatusOwner === "browser" &&
    own.some(
      (item) => item.status === "reserved" && expiredReleases.has(item.id),
    );
  const releaseKey = releasePending
    ? [...expiredReleases].sort().join(",")
    : "";
  useEffect(() => {
    if (!releaseKey) return;
    const ids = new Set(releaseKey.split(","));
    void setOwn((items) =>
      items.map((item) =>
        item.status === "reserved" && ids.has(item.id)
          ? { ...item, status: "active" }
          : item,
      ),
    );
  }, [releaseKey, setOwn]);
  const listings = own
    .map((item): Product =>
      releasePending &&
      item.status === "reserved" &&
      expiredReleases.has(item.id)
        ? { ...item, status: "active" }
        : item,
    )
    .filter(database.canShow);

  async function applyStatus(id: string, status: ListingStatus) {
    if (!own.some((item) => item.id === id))
      throw new Error(`Listing ${id} is not among the listings.`);
    return setOwn((current) =>
      current.map((item) => (item.id === id ? { ...item, status } : item)),
    );
  }
  async function setStatus(id: string, status: ListingStatus) {
    const listing = own.find((item) => item.id === id);
    if (!listing) throw new Error(`Listing ${id} is not among your listings.`);
    if (!(await applyStatus(id, status))) {
      toast.say(statusFailure(status));
      return;
    }
    if (status === "withdrawn") onArchived(id);
    toast.show({
      message: STATUS_NOTICES[status],
      action:
        status === "withdrawn"
          ? {
              label: "Undo",
              description: `Undo archiving ${listing.title}`,
              onClick: () => void setStatus(id, listing.status),
            }
          : undefined,
    });
  }

  return {
    own,
    setOwn,
    /** Every listing the student can see. */
    listings,
    active: listings.filter((item) => item.status === "active"),
    visible: listings.filter((item) => item.status !== "withdrawn"),
    archived: listings.filter((item) => item.status === "withdrawn"),
    setStatus,
    /**
     * A deal reserved a listing or made it available again. With accounts the
     * server saved it in the same step, so the listings only reload; the local
     * demo saves it here.
     */
    async followDealStatus(id: string, status: DealStatusChange) {
      if (database.dealStatusOwner === "server") {
        database.retry();
        return;
      }
      const before = own.find((item) => item.id === id)?.status;
      if (before && !Object.hasOwn(statusBefore, id))
        setStatusBefore((current) => ({ ...current, [id]: before }));
      if (!(await applyStatus(id, status))) toast.say(statusFailure(status));
    },
    /** Clears the student's listings, giving the sample listings back the statuses deals changed. */
    clear() {
      const restored = own.flatMap((item) =>
        item.demo && Object.hasOwn(statusBefore, item.id)
          ? [{ ...item, status: statusBefore[item.id] }]
          : [],
      );
      setOwn(restored);
      // A sample listing that has not loaded yet keeps its record for the next clear.
      setStatusBefore((current) =>
        Object.fromEntries(
          Object.entries(current).filter(
            ([id]) => !restored.some((item) => item.id === id),
          ),
        ),
      );
    },
  };
}
