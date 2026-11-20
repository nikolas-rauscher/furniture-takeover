import { isFavoriteIds, restoreSavedValue } from "../hooks/savedState.ts";
import { retainedPrices, type FavoritesApi } from "./favorites.ts";

const idsKey = "takeover-favorites";
const pricesKey = "takeover-favorite-prices";
const isSavePrices = (value: unknown): value is Record<string, number> =>
  typeof value === "object" &&
  value !== null &&
  !Array.isArray(value) &&
  Object.values(value).every(
    (price) => typeof price === "number" && Number.isFinite(price),
  );

function read<T>(
  storage: () => Pick<Storage, "getItem">,
  key: string,
  fallback: T,
  validate: (value: unknown) => value is T,
) {
  let serialized: string | null;
  try {
    serialized = storage().getItem(key);
  } catch {
    return fallback;
  }
  return restoreSavedValue(serialized, fallback, validate).value;
}

export function createDemoFavorites(
  storage: () => Pick<Storage, "getItem" | "setItem">,
  onStorageError: () => void,
): FavoritesApi {
  function write(key: string, value: unknown) {
    try {
      storage().setItem(key, JSON.stringify(value));
    } catch {
      onStorageError();
    }
  }
  return {
    initial: () => ({
      ids: read(storage, idsKey, [], isFavoriteIds),
      prices: read(storage, pricesKey, {}, isSavePrices),
    }),
    async update(previous, ids, item) {
      const prices = retainedPrices(previous, ids);
      if (item && ids.includes(item.id) && !previous.ids.includes(item.id))
        prices[item.id] = item.price;
      write(idsKey, ids);
      write(pricesKey, prices);
      return { ids, prices };
    },
  };
}
