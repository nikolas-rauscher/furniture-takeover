import type { PhotoGroup } from "../shared/agent";
import { requestPhotoGroups } from "./api/agent.ts";
import {
  CARD_PHOTO_SIDE,
  MAX_CARD_PHOTO_BYTES,
  MAX_ORIGINAL_PHOTO_BYTES,
  MAX_PHOTO_PREVIEW_BYTES,
  MAX_STORED_PHOTO_BYTES,
} from "../shared/listingPhotos.ts";

type JpegTarget = {
  longestSide: number;
  quality: number;
  maxBytes: number;
  attempts: number;
  tooLarge: string;
};

const JPEG_PREFIX = "data:image/jpeg;base64,";

/** Decoded size of a base64 data URL. */
const dataUrlBytes = (data: string) => {
  const encoded = data.length - data.indexOf(",") - 1;
  const padding = data.endsWith("==") ? 2 : data.endsWith("=") ? 1 : 0;
  return (encoded * 3) / 4 - padding;
};

async function decodedImage(source: string) {
  const image = new Image();
  image.src = source;
  await image.decode();
  return image;
}

/**
 * Re-encode as JPEG on white, shrinking by a quarter until it fits. Every browser can encode
 * JPEG from a canvas, and drawing a decoded image applies its EXIF orientation.
 */
function encodeJpeg(image: HTMLImageElement, target: JpegTarget): string {
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Could not prepare this photo.");
  const naturalSide = Math.max(image.naturalWidth, image.naturalHeight);
  let longestSide = Math.min(target.longestSide, naturalSide);
  for (let attempt = 0; attempt < target.attempts; attempt++) {
    const scale = longestSide / naturalSide;
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    context.fillStyle = "#fff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    const data = canvas.toDataURL("image/jpeg", target.quality);
    if (
      data.startsWith(JPEG_PREFIX) &&
      data.length > JPEG_PREFIX.length &&
      dataUrlBytes(data) <= target.maxBytes
    )
      return data;
    longestSide = Math.round(longestSide * 0.75);
  }
  throw new Error(target.tooLarge);
}

/** Bound gallery storage and request sizes while retaining a useful listing preview. */
export async function readListingPhoto(
  file: File,
  signal: AbortSignal,
): Promise<string> {
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type))
    throw new Error("Choose JPG, PNG or WebP photos.");
  if (file.size > MAX_ORIGINAL_PHOTO_BYTES)
    throw new Error("Choose a photo of 25 MB or less.");
  signal.throwIfAborted();
  const url = URL.createObjectURL(file);
  try {
    const image = await decodedImage(url);
    signal.throwIfAborted();
    return encodeJpeg(image, {
      longestSide: 1600,
      quality: 0.82,
      maxBytes: MAX_STORED_PHOTO_BYTES,
      attempts: 6,
      tooLarge: "This photo is too large to prepare. Try a smaller version.",
    });
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

const CARD_PHOTO_FAILED =
  "Couldn't prepare the small version of a photo. Try saving again.";

/** The small copy that grids and thumbnails load instead of the full listing photo. */
export async function createCardPhoto(photo: string): Promise<string> {
  const image = await decodedImage(photo).catch(() => {
    throw new Error(CARD_PHOTO_FAILED);
  });
  return encodeJpeg(image, {
    longestSide: CARD_PHOTO_SIDE,
    quality: 0.8,
    maxBytes: MAX_CARD_PHOTO_BYTES,
    attempts: 4,
    tooLarge: CARD_PHOTO_FAILED,
  });
}

/** A smaller copy for sorting many photos at once within one request budget. */
export async function photoPreview(photo: string): Promise<string> {
  if (dataUrlBytes(photo) <= MAX_PHOTO_PREVIEW_BYTES) return photo;
  return encodeJpeg(await decodedImage(photo), {
    longestSide: 640,
    quality: 0.7,
    maxBytes: MAX_PHOTO_PREVIEW_BYTES,
    attempts: 5,
    tooLarge: "Could not prepare these photos. Try fewer photos.",
  });
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
