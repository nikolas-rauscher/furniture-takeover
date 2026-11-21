import type { Product } from "../../shared/marketplace.ts";

export type ListingsApi = {
  read: (fresh?: boolean) => Promise<Product[]>;
  save: (listing: Product, previous?: Product) => Promise<void>;
  seed?: () => Promise<Product[]>;
  verifyCanPost?: () => Promise<void>;
};
