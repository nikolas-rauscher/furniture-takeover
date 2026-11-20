import { listingPhotos } from "../shared/listingPhotos.ts";
import type { Category, Product } from "../shared/marketplace.ts";

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

/** A blank listing, picked up where the student lives or searches. */
export function emptyDraft(location: string): ListingDraft {
  return {
    image: "",
    images: [],
    raw: "",
    title: "",
    description: "",
    price: "",
    condition: "",
    dimensions: "",
    location,
    pickup: "",
    category: "All",
  };
}

/** A published listing opened again for editing. */
export function draftFromListing(item: Product): ListingDraft {
  return {
    image: item.image,
    images: listingPhotos(item),
    raw: "",
    title: item.title,
    tags: item.tags,
    description: item.description,
    price: String(item.price),
    condition: item.condition,
    dimensions: item.dimensions === "Not specified" ? "" : item.dimensions,
    location: item.location,
    pickup: item.pickupBy,
    category: "All",
  };
}
