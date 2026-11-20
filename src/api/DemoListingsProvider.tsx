import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PropsWithChildren,
  type SetStateAction,
} from "react";
import { AdminApiError, adminCatalogChanged } from "../api/admin";
import { demoListings, postingCheckUnavailable } from "./demoListings";
import { ListingsContext } from "../hooks/useMarketplaceListings";
import { adminErrors } from "../../shared/admin";
import type { Product } from "../../shared/marketplace";
import { isProducts } from "../hooks/savedState";
import { useSaved } from "../hooks/useSaved";
import { ListingOutbox } from "../hooks/listingOutbox";
import { withChangedCardImages } from "../cardPhotos";

/** Demo catalog is server-owned; personal browser records are never uploaded. */
function useDemoListings() {
  const [saved, setSaved] = useSaved<Product[]>(
    "takeover-listings",
    [],
    isProducts,
  );
  const current = useRef(saved);
  const [journal] = useState(() => {
    try {
      return {
        outbox: new ListingOutbox(localStorage, "takeover-listing-outbox"),
        error: "",
      };
    } catch {
      return {
        outbox: null,
        error:
          "Couldn't open your unsaved listing changes. Check that takeover can use this browser's storage.",
      };
    }
  });
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(0);
  const queue = useRef(Promise.resolve());
  const mounted = useRef(true);
  const loadGeneration = useRef(0);
  const revisions = useRef(new Map<string, number>());
  const revision = useRef(0);
  const failedRead = useRef(false);
  const reading = useRef(false);
  const retryTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const persist = useCallback(
    (listings: Product[]) => {
      if (!listings.length) return;
      setPending((value) => value + 1);
      queue.current = queue.current.then(async () => {
        try {
          // One listing gallery per request stays within the API's 3 MB payload limit.
          for (const listing of listings) {
            try {
              await demoListings.save(listing);
            } catch (error) {
              // A hidden or retired listing must leave the optimistic catalog.
              if (!(
                error instanceof AdminApiError &&
                error.code === "admin_listing_hidden"
              ))
                throw error;
            }
            journal.outbox?.acknowledge(listing);
          }
          if (
            mounted.current &&
            !failedRead.current &&
            !journal.outbox?.pending().length
          )
            setError(journal.error);
        } catch (failure) {
          if (mounted.current)
            setError(
              failure instanceof Error
                ? failure.message
                : "Couldn't save your listing changes. Try again.",
            );
        } finally {
          if (mounted.current) setPending((value) => value - 1);
        }
      });
    },
    [journal],
  );

  const load = useCallback(
    async (seed = false) => {
      // Recovery events and scheduled retries share one read request.
      if (!seed && reading.current) return false;
      reading.current = true;
      const generation = ++loadGeneration.current;
      try {
        const writes = journal.outbox?.pending() ?? [];
        persist(writes);
        await queue.current;
        if (!mounted.current || generation !== loadGeneration.current)
          return false;
        const startedAt = revision.current;
        const listings = seed
          ? await demoListings.seed()
          : await demoListings.read(writes.length > 0);
        if (!mounted.current || generation !== loadGeneration.current)
          return false;
        // Never replace or transmit personal browser records.
        const next = (
          journal.outbox?.merge(listings, current.current) ?? [
            ...current.current.filter((item) => !item.demo),
            ...listings,
          ]
        ).map((item) =>
          (revisions.current.get(item.id) ?? 0) > startedAt
            ? (current.current.find(
                (currentItem) => currentItem.id === item.id,
              ) ?? item)
            : item,
        );
        current.current = next;
        setSaved(next);
        setReady(true);
        failedRead.current = false;
        if (!journal.outbox?.pending().length) setError(journal.error);
        return true;
      } catch (failure) {
        if (!seed && mounted.current && generation === loadGeneration.current)
          failedRead.current = true;
        if (mounted.current && generation === loadGeneration.current)
          setError(
            failure instanceof Error
              ? failure.message
              : "Couldn't load listings. Try again.",
          );
        return false;
      } finally {
        if (generation === loadGeneration.current) reading.current = false;
      }
    },
    [setSaved, journal, persist],
  );

  useEffect(() => {
    mounted.current = true;
    let cancelled = false;
    let retries = 0;
    const delays = [1000, 2000, 4000];
    const generation = loadGeneration;
    const recover = async () => {
      if (cancelled || reading.current) return;
      if (retryTimer.current) clearTimeout(retryTimer.current);
      retryTimer.current = null;
      const loaded = await load();
      if (!loaded && !cancelled && retries < delays.length) {
        retryTimer.current = setTimeout(
          () => void recover(),
          delays[retries++],
        );
      }
    };
    const recoverWhenAvailable = () => {
      if (failedRead.current || journal.outbox?.pending().length)
        void recover();
    };
    void recover();
    window.addEventListener("online", recoverWhenAvailable);
    window.addEventListener("focus", recoverWhenAvailable);
    window.addEventListener(adminCatalogChanged, recover);
    return () => {
      cancelled = true;
      mounted.current = false;
      ++generation.current;
      reading.current = false;
      if (retryTimer.current) clearTimeout(retryTimer.current);
      retryTimer.current = null;
      window.removeEventListener("online", recoverWhenAvailable);
      window.removeEventListener("focus", recoverWhenAvailable);
      window.removeEventListener(adminCatalogChanged, recover);
    };
  }, [load, journal]);

  const setListings = useCallback(
    async (update: SetStateAction<Product[]>) => {
      const apply = (products: Product[]) =>
        typeof update === "function" ? update(products) : update;
      let previous = current.current;
      let proposed = apply(previous);
      if (
        proposed.some(
          (item) => !item.demo && !previous.some(({ id }) => id === item.id),
        )
      ) {
        try {
          await demoListings.verifyCanPost();
        } catch (error) {
          setError(
            error instanceof AdminApiError
              ? error.message
              : postingCheckUnavailable,
          );
          return false;
        }
        setError((message) =>
          message === adminErrors.admin_student_blocked ||
          message === postingCheckUnavailable
            ? ""
            : message,
        );
        if (current.current !== previous) {
          previous = current.current;
          proposed = apply(previous);
        }
      }
      // Card copies are made before staging, so a failed photo leaves the catalog unchanged.
      try {
        let prepared = await withChangedCardImages(proposed, previous);
        while (current.current !== previous) {
          previous = current.current;
          prepared = await withChangedCardImages(apply(previous), previous);
        }
        proposed = prepared;
      } catch (failure) {
        if (!(failure instanceof Error)) throw failure;
        setError(failure.message);
        return false;
      }
      const ids = new Set(proposed.map((item) => item.id));
      // Clearing browser data leaves the database catalog intact. Removal uses status withdrawn.
      const next = [
        ...proposed,
        ...previous.filter((item) => item.demo && !ids.has(item.id)),
      ];
      const changed = next.filter(
        (item) =>
          item.demo &&
          JSON.stringify(item) !==
            JSON.stringify(previous.find((old) => old.id === item.id)),
      );
      if (changed.length) {
        try {
          if (!journal.outbox) throw new Error(journal.error);
          journal.outbox.stage(changed);
        } catch {
          setError(
            "Couldn't save your changes on this device. Free some browser storage and try again.",
          );
          return false;
        }
      }
      current.current = next;
      setSaved(next);
      const nextRevision = ++revision.current;
      changed.forEach((item) => {
        revisions.current.set(item.id, nextRevision);
      });
      persist(changed);
      return true;
    },
    [persist, setSaved, journal],
  );

  const retry = useCallback(() => {
    if (!ready) void load();
    else persist(journal.outbox?.pending() ?? []);
  }, [load, persist, ready, journal]);

  return {
    listings: ready ? saved : saved.filter((item) => !item.demo),
    setListings,
    error,
    pending,
    ready,
    retry,
    addDemo: () => load(true),
    canShow: (item: Product) =>
      Boolean(item.own && (item.demo || !item.image.startsWith("/images/"))),
    dealStatusOwner: "browser" as const,
    refreshOnDealChange: false,
    verifyEdit: demoListings.verifyEdit,
  };
}

export function DemoListingsProvider({ children }: PropsWithChildren) {
  return (
    <ListingsContext value={useDemoListings()}>{children}</ListingsContext>
  );
}
