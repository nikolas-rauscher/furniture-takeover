import type { Product, SavedListing } from "../../shared/marketplace.ts";

export type FavoriteItem = Pick<Product, "id" | "price">;
export type FavoriteSnapshot = {
  ids: string[];
  prices: Record<string, number>;
};

export type FavoritesApi = {
  initial: () => FavoriteSnapshot;
  refresh?: () => Promise<FavoriteSnapshot>;
  update: (
    previous: FavoriteSnapshot,
    next: string[],
    item?: FavoriteItem,
  ) => Promise<FavoriteSnapshot>;
};

export function emptyFavorites(): FavoriteSnapshot {
  return { ids: [], prices: {} };
}

export function retainedPrices(previous: FavoriteSnapshot, next: string[]) {
  return Object.fromEntries(
    Object.entries(previous.prices).filter(([id]) => next.includes(id)),
  );
}

export function savedListing(
  item: Product,
  prices: FavoriteSnapshot["prices"],
): SavedListing {
  const priceAtSave = Object.hasOwn(prices, item.id) ? prices[item.id] : null;
  return {
    ...item,
    priceAtSave,
    priceDropped: priceAtSave !== null && item.price < priceAtSave,
  };
}
