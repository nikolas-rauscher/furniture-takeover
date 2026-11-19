export const MAX_LISTING_PHOTOS = 6;
/** Photos a seller can sort into several listings in one go. */
export const MAX_BATCH_PHOTOS = 12;
/** The reduced previews sorted in one request share this decoded budget. */
export const MAX_PHOTO_SORT_BYTES = 2 * 1024 * 1024;
/** Each preview's equal share of the sorting budget, so the most photos still fit. */
export const MAX_PHOTO_PREVIEW_BYTES = MAX_PHOTO_SORT_BYTES / MAX_BATCH_PHOTOS;
export const MAX_ORIGINAL_PHOTO_BYTES = 25 * 1024 * 1024;
export const MAX_STORED_PHOTO_BYTES = 256 * 1024;
/** The longest side of the copy that grids and thumbnails show. */
export const CARD_PHOTO_SIDE = 640;
export const MAX_CARD_PHOTO_BYTES = 96 * 1024;

/** The demo listings are drawn, not photographed: their illustrations are served by the app itself. */
export const isDemoIllustration = (path: string) => path.startsWith("/samples/");

/** The legacy image remains the cover; old single-photo listings need no migration. */
export function listingPhotos(listing: {
  image?: string;
  images?: string[];
}): string[] {
  return [
    ...new Set(
      [listing.image, ...(listing.images ?? [])].filter(
        (image): image is string => Boolean(image),
      ),
    ),
  ];
}

type CardPhotos = { image?: string; images?: string[]; cardImages?: string[] };

/** Card copies pair by position with `listingPhotos`; a listing has one for every photo or none. */
export function cardImagePairs(listing: CardPhotos): Map<string, string> {
  const photos = listingPhotos(listing);
  const cards = listing.cardImages ?? [];
  return cards.length === photos.length
    ? new Map(photos.map((photo, index) => [photo, cards[index]]))
    : new Map();
}

/** Listings saved before card copies existed have none; their grid shows the full cover photo. */
export function cardImageFor(listing: { image: string; cardImages?: string[] }) {
  return listing.cardImages?.[0] ?? listing.image;
}
