import { useEffect, useRef, useState, type SetStateAction } from "react";
import type { FavoriteItem } from "../api/favorites";
import { useMarketplaceData } from "../marketplaceData";

export function useFavorites() {
  const api = useMarketplaceData().favorites;
  const [snapshot, setSnapshot] = useState(api.initial);
  const [error, setError] = useState("");
  const current = useRef(snapshot);
  const working = useRef(false);
  useEffect(() => {
    let alive = true;
    void api.refresh?.().then(
      (next) => {
        if (!alive) return;
        current.current = next;
        setSnapshot(next);
      },
      (error: unknown) => {
        if (alive)
          setError(
            error instanceof Error
              ? error.message
              : "Couldn't load saved items.",
          );
      },
    );
    return () => {
      alive = false;
    };
  }, [api]);

  async function setFavorites(
    value: SetStateAction<string[]>,
    item?: FavoriteItem,
  ) {
    if (working.current) return false;
    const previous = current.current;
    const next = typeof value === "function" ? value(previous.ids) : value;
    working.current = true;
    setError("");
    try {
      const stored = await api.update(previous, next, item);
      current.current = stored;
      setSnapshot(stored);
      return true;
    } catch (error) {
      console.error(error);
      setError(
        next.length < previous.ids.length
          ? "Couldn't remove this item. Try again."
          : "Couldn't save this item. Try again.",
      );
      return false;
    } finally {
      working.current = false;
    }
  }

  return {
    favorites: snapshot.ids,
    prices: snapshot.prices,
    setFavorites,
    error,
  };
}
