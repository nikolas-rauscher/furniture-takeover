import { useEffect, useRef, useState, type SetStateAction } from "react";
import { useSaved } from "../hooks/useSaved";
import { isFavoriteIds } from "../hooks/savedState";
import type { Product, SavedListing } from "../../shared/marketplace.ts";
import type { AccountConnection } from "./connection";
import { fail } from "./client";
type SavePrices = Record<string, number>;
const isSavePrices = (value: unknown): value is SavePrices =>
  typeof value === "object" &&
  value !== null &&
  !Array.isArray(value) &&
  Object.values(value).every(
    (price) => typeof price === "number" && Number.isFinite(price),
  );

export function savedListing(item: Product, prices: SavePrices): SavedListing {
  const priceAtSave = Object.hasOwn(prices, item.id) ? prices[item.id] : null;
  return {
    ...item,
    priceAtSave,
    priceDropped: priceAtSave !== null && item.price < priceAtSave,
  };
}

export function useFavorites(account?: AccountConnection) {
  const [local, setLocal] = useSaved<string[]>(
    "takeover-favorites",
    [],
    isFavoriteIds,
  );
  const [localPrices, setLocalPrices] = useSaved<SavePrices>(
    "takeover-favorite-prices",
    {},
    isSavePrices,
  );
  const [accountPrices, setAccountPrices] = useState<SavePrices>({});
  const [saved, setSaved] = useState<string[]>([]),
    [error, setError] = useState("");
  const current = useRef<string[]>([]),
    working = useRef(false);
  const client = account?.client,
    userId = account?.session?.user.id;
  useEffect(() => {
    let alive = true;
    if (client && userId)
      void client
        .from("saved_listings")
        .select("*")
        .then(({ data, error }) => {
          if (!alive) return;
          if (error) {
            setError(error.message);
            return;
          }
          const ids = data!.map((x) => x.listing_id);
          current.current = ids;
          setSaved(ids);
          setAccountPrices(
            Object.fromEntries(
              data!
                .filter((row) => typeof row.price_at_save === "number")
                .map((row) => [row.listing_id, row.price_at_save]),
            ),
          );
        });
    return () => {
      alive = false;
    };
  }, [client, userId]);
  /** Resolves to whether the change was stored; a failed save shows as `error`. */
  async function update(
    value: SetStateAction<string[]>,
    item?: Pick<Product, "id" | "price">,
  ): Promise<boolean> {
    if (!client) {
      const next = typeof value === "function" ? value(local) : value;
      setLocal(next);
      setLocalPrices((previous) => {
        const prices = Object.fromEntries(
          Object.entries(previous).filter(([id]) => next.includes(id)),
        );
        if (item && next.includes(item.id) && !local.includes(item.id))
          prices[item.id] = item.price;
        return prices;
      });
      return true;
    }
    if (!userId) throw Error("Sign in to save items.");
    if (working.current) return false;
    working.current = true;
    setError("");
    const previous = current.current;
    const next = typeof value === "function" ? value(previous) : value;
    try {
      const addedPrices: SavePrices = {};
      for (const id of next.filter((x) => !previous.includes(x))) {
        const r = await client
          .from("saved_listings")
          .insert({ user_id: userId, listing_id: id })
          .select("*")
          .maybeSingle();
        if (r.error?.code === "23505") {
          const existing = await client
            .from("saved_listings")
            .select("*")
            .eq("listing_id", id)
            .eq("user_id", userId)
            .maybeSingle();
          fail(existing.error);
          if (typeof existing.data?.price_at_save === "number")
            addedPrices[id] = existing.data.price_at_save;
        } else {
          fail(r.error);
          if (typeof r.data?.price_at_save === "number")
            addedPrices[id] = r.data.price_at_save;
        }
      }
      for (const id of previous.filter((x) => !next.includes(x)))
        fail(
          (
            await client
              .from("saved_listings")
              .delete()
              .eq("user_id", userId)
              .eq("listing_id", id)
          ).error,
        );
      current.current = next;
      setSaved(next);
      setAccountPrices((previous) => ({
        ...Object.fromEntries(
          Object.entries(previous).filter(([id]) => next.includes(id)),
        ),
        ...addedPrices,
      }));
      return true;
    } catch (err) {
      console.error(err);
      setError(
        next.length < previous.length
          ? "Couldn't remove this item. Try again."
          : "Couldn't save this item. Try again.",
      );
      return false;
    } finally {
      working.current = false;
    }
  }
  return {
    favorites: account ? saved : local,
    prices: account ? accountPrices : localPrices,
    setFavorites: update,
    error,
  };
}
