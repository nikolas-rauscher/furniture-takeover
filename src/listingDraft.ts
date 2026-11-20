import type { Category } from "../shared/marketplace";

/** Where the seller is when creating several listings one after another. */
export type BatchProgress = {
  /** Zero-based position of the listing being created. */
  index: number;
  covers: string[];
  /** Outcome of the listings before this one. */
  results: ("saved" | "skipped")[];
  /** Pako's line about the listing just finished, which the tray celebrates for a moment. */
  note?: string;
  onSkip: () => void;
};

export type ListingDraft = {
  image: string;
  images?: string[];
  raw: string;
  title: string;
  tags?: string[];
  description: string;
  price: string;
  condition: string;
  dimensions: string;
  location: string;
  pickup: string;
  category: Category;
};
