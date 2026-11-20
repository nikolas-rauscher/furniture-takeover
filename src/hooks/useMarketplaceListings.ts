import { createContext, useContext, type SetStateAction } from "react";
import type { Product } from "../../shared/marketplace";

type Listings = {
  listings: Product[];
  setListings: (update: SetStateAction<Product[]>) => Promise<boolean>;
  ready: boolean;
  error: string;
  pending: number;
  retry: () => void;
  addDemo: () => Promise<boolean>;
  canShow: (listing: Product) => boolean;
  dealStatusOwner: "browser" | "server";
  refreshOnDealChange: boolean;
  verifyEdit?: () => Promise<void>;
};

export const ListingsContext = createContext<Listings | null>(null);

export function useMarketplaceListings() {
  const listings = useContext(ListingsContext);
  if (!listings) throw new Error("Marketplace listings are not configured.");
  return listings;
}
