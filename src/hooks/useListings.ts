import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type SetStateAction,
} from "react";
import type { Product } from "../../shared/marketplace";
import { isProducts } from "./savedState";
import { useSaved } from "./useSaved";
import { ListingOutbox } from "./listingOutbox";

async function requestListings(
  path: string,
  init?: RequestInit,
): Promise<Product[]> {
  const response = await fetch(path, init);
  if (!response.ok)
    throw new Error("The listing database is unavailable. Please try again.");
  const body: unknown = await response.json();
  const listings =
    body && typeof body === "object"
      ? (body as { listings?: unknown }).listings
      : null;
  if (!isProducts(listings) || listings.some((item) => item.demo !== true))
    throw new Error("The listing database returned an invalid response.");
  return listings;
}

/** Demo catalog is server-owned; personal browser records are never uploaded. */
export function useListings(enabled = true) {
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
          "Pending listing changes could not be read. Browser storage must be available before editing demo listings.",
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
            await requestListings("/api/listings/demo/update", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ listings: [listing] }),
              signal: AbortSignal.timeout(8000),
            });
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
                : "Could not save demo changes.",
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
        if (journal.outbox) persist(journal.outbox.pending());
        await queue.current;
        if (!mounted.current || generation !== loadGeneration.current)
          return false;
        const startedAt = revision.current;
        const listings = await requestListings(
          seed ? "/api/listings/demo/seed" : "/api/listings?demo=true",
          seed ? { method: "POST" } : { signal: AbortSignal.timeout(8000) },
        );
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
              : "Could not load demo listings.",
          );
        return false;
      } finally {
        if (generation === loadGeneration.current) reading.current = false;
      }
    },
    [setSaved, journal, persist],
  );

  useEffect(() => {
    if (!enabled) return;
    mounted.current = true;
    let cancelled = false;
    let retries = 0;
    const delays = [1000, 2000, 4000];
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
    return () => {
      cancelled = true;
      mounted.current = false;
      ++loadGeneration.current;
      reading.current = false;
      if (retryTimer.current) clearTimeout(retryTimer.current);
      retryTimer.current = null;
      window.removeEventListener("online", recoverWhenAvailable);
      window.removeEventListener("focus", recoverWhenAvailable);
    };
  }, [load, journal, enabled]);

  const setListings = useCallback(
    (update: SetStateAction<Product[]>) => {
      const previous = current.current;
      const proposed = typeof update === "function" ? update(previous) : update;
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
            "Demo changes could not be saved in browser storage. Free some space and try again.",
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
  };
}
