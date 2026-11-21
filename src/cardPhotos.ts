import { cardImagePairs, listingPhotos } from "../shared/listingPhotos.ts";
import type { Product } from "../shared/marketplace.ts";
import { createCardPhoto } from "./listingPhotos.ts";

const isNewPhoto = (photo: string) => photo.startsWith("data:image/");

/**
 * Give every photo its card copy: kept photos reuse theirs, new photos get one made here.
 * A kept photo without a copy (saved before card copies, or a demo drawing) leaves the
 * listing without card copies, because they pair with all photos or none.
 */
export async function withCardImages(
  listing: Product,
  previous?: Product,
): Promise<Product> {
  const photos = listingPhotos(listing);
  const known = new Map([
    ...cardImagePairs(previous ?? {}),
    ...cardImagePairs(listing),
  ]);
  const complete = photos.every(
    (photo) => known.has(photo) || isNewPhoto(photo),
  );
  const { cardImages: _replaced, ...rest } = listing;
  if (!photos.length || !complete) return { ...rest, images: photos };
  const cardImages = await Promise.all(
    photos.map((photo) => known.get(photo) ?? createCardPhoto(photo)),
  );
  return { ...rest, images: photos, cardImages };
}

/** Prepare card copies for the listings that differ from their saved version. */
export function withChangedCardImages(
  listings: Product[],
  previous: Product[],
): Promise<Product[]> {
  return Promise.all(
    listings.map((listing) => {
      const saved = previous.find(({ id }) => id === listing.id);
      return JSON.stringify(listing) === JSON.stringify(saved)
        ? listing
        : withCardImages(listing, saved);
    }),
  );
}
