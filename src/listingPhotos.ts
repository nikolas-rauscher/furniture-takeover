import type { PhotoGroup } from "../shared/agent";
import { requestPhotoGroups } from "./api/agent";
import {
  MAX_BATCH_PHOTOS,
  MAX_STORED_PHOTO_BYTES,
  MAX_UPLOAD_PHOTO_BYTES,
} from "../shared/listingPhotos";

/** Bound gallery storage and request sizes while retaining a useful listing preview. */
export async function readListingPhoto(
  file: File,
  signal: AbortSignal,
): Promise<string> {
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type))
    throw new Error("Choose JPG, PNG or WebP photos.");
  if (file.size > MAX_UPLOAD_PHOTO_BYTES)
    throw new Error("Each photo must be smaller than 2 MB.");
  signal.throwIfAborted();
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    signal.throwIfAborted();
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Could not prepare this photo.");
    let longestSide = Math.min(
      1600,
      Math.max(image.naturalWidth, image.naturalHeight),
    );
    for (let attempt = 0; attempt < 6; attempt++) {
      const scale =
        longestSide / Math.max(image.naturalWidth, image.naturalHeight);
      canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
      canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
      context.fillStyle = "#fff";
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      const data = canvas.toDataURL("image/jpeg", 0.82);
      if (
        ((data.length - data.indexOf(",") - 1) * 3) / 4 <=
        MAX_STORED_PHOTO_BYTES
      )
        return data;
      longestSide = Math.round(longestSide * 0.75);
    }
    throw new Error(
      "This photo is too large to prepare. Try a smaller version.",
    );
  } catch (error) {
    if (signal.aborted) throw error;
    throw new Error(
      error instanceof Error && error.message.includes("photo")
        ? error.message
        : "This photo could not be opened. Choose a valid JPG, PNG or WebP.",
    );
  } finally {
    URL.revokeObjectURL(url);
  }
}

const base64Bytes = (data: string) =>
  ((data.length - data.indexOf(",") - 1) * 3) / 4;

/** A smaller copy for sorting many photos at once within one request budget. */
export async function photoPreview(photo: string): Promise<string> {
  const budget = MAX_UPLOAD_PHOTO_BYTES / MAX_BATCH_PHOTOS;
  if (base64Bytes(photo) <= budget) return photo;
  const image = new Image();
  image.src = photo;
  await image.decode();
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Could not prepare this photo.");
  let longestSide = 640;
  for (let attempt = 0; attempt < 5; attempt++) {
    const scale = Math.min(
      1,
      longestSide / Math.max(image.naturalWidth, image.naturalHeight),
    );
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    context.fillStyle = "#fff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    const data = canvas.toDataURL("image/jpeg", 0.7);
    if (base64Bytes(data) <= budget) return data;
    longestSide = Math.round(longestSide * 0.75);
  }
  throw new Error("Could not prepare these photos. Try fewer photos.");
}

/**
 * Ask the agent which photos show the same item; indices refer to `photos`.
 * `itemCount` passes on the seller's own count of items.
 */
export async function sortListingPhotos(
  photos: string[],
  signal: AbortSignal,
  itemCount?: number,
): Promise<PhotoGroup[]> {
  const previews = await Promise.all(photos.map(photoPreview));
  signal.throwIfAborted();
  return (await requestPhotoGroups(previews, { signal }, itemCount)).groups;
}
