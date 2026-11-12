import { useEffect, useRef, useState, type SetStateAction } from "react";
import { useSaved } from "../hooks/useSaved";
import { isFavoriteIds } from "../hooks/savedState";
import type { AccountConnection } from "./AccountSession";
import { fail } from "./client";
export function useFavorites(account?: AccountConnection) {
  const [local, setLocal] = useSaved<string[]>(
    "takeover-favorites",
    [],
    isFavoriteIds,
  );
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
        .select("listing_id")
        .then(({ data, error }) => {
          if (!alive) return;
          if (error) {
            setError(error.message);
            return;
          }
          const ids = data!.map((x) => x.listing_id);
          current.current = ids;
          setSaved(ids);
        });
    return () => {
      alive = false;
    };
  }, [client, userId]);
  async function update(value: SetStateAction<string[]>) {
    if (!client) {
      setLocal(value);
      return;
    }
    if (!userId) throw Error("Sign in to save items.");
    if (working.current) return;
    working.current = true;
    setError("");
    const previous = current.current;
    const next = typeof value === "function" ? value(previous) : value;
    try {
      for (const id of next.filter((x) => !previous.includes(x))) {
        const r = await client
          .from("saved_listings")
          .insert({ user_id: userId, listing_id: id });
        if (r.error?.code !== "23505") fail(r.error);
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
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save item.");
    } finally {
      working.current = false;
    }
  }
  return { favorites: account ? saved : local, setFavorites: update, error };
}
