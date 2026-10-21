export const MAX_LISTING_PHOTOS = 6;
export const MAX_UPLOAD_PHOTO_BYTES = 2 * 1024 * 1024;
export const MAX_STORED_PHOTO_BYTES = 256 * 1024;

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
