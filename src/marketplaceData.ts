import {
  createContext,
  useContext,
  type ComponentType,
  type PropsWithChildren,
} from "react";
import type { FavoritesApi } from "./api/favorites";
import type { DealsApi } from "./api/deals";

type MarketplaceData = {
  favorites: FavoritesApi;
  deals: DealsApi;
  ListingsProvider: ComponentType<PropsWithChildren>;
  InboxProvider: ComponentType<PropsWithChildren>;
};

export const MarketplaceDataContext = createContext<MarketplaceData | null>(
  null,
);

export function useMarketplaceData() {
  const data = useContext(MarketplaceDataContext);
  if (!data) throw new Error("Marketplace data is not configured.");
  return data;
}
