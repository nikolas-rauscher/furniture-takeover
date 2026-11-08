import {
  MAX_BATCH_PHOTOS,
  MAX_LISTING_PHOTOS,
  MAX_UPLOAD_PHOTO_BYTES,
} from "../shared/listingPhotos.ts";
import type {
  AgentMetadata,
  AssistRequest,
  AssistResponse,
  PhotoGroup,
  PhotoGroupRequest,
} from "../shared/agent.ts";
import { AgentError, invalidOutput } from "./errors.ts";

const record = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);
const datePattern = /^\d{4}-\d{2}-\d{2}$/;
const validDate = (value: string) =>
  datePattern.test(value) &&
  !Number.isNaN(Date.parse(value)) &&
  new Date(value).toISOString().slice(0, 10) === value;

function text(value: unknown, max: number, fail: () => Error): string {
  if (typeof value !== "string" || value.length > max) throw fail();
  return value.trim();
}

function number(value: unknown, max: number, fail: () => Error): number {
  if (
    typeof value !== "number" ||
    !Number.isFinite(value) ||
    value < 0 ||
    value > max
  )
    throw fail();
  return value;
}

const tooLarge = () =>
  new AgentError(
    400,
    "INVALID_IMAGE",
    "The photo collection is too large. Use smaller photos.",
  );
const photoBytes = (images: string[]) =>
  images.reduce(
    (size, image) => size + Buffer.from(image.split(",")[1], "base64").length,
    0,
  );

function validateImage(value: unknown): string {
  const fail = () =>
    new AgentError(
      400,
      "INVALID_IMAGE",
      "Use a JPG, PNG or WebP photo up to 2 MB.",
    );
  if (typeof value !== "string") throw fail();
  const match = value.match(
    /^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/]+={0,2})$/,
  );
  if (!match || match[2].length % 4 !== 0 || match[2].length > 2_796_204)
    throw fail();
  const bytes = Buffer.from(match[2], "base64");
  const signatureMatches =
    match[1] === "jpeg"
      ? bytes.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff]))
      : match[1] === "png"
        ? bytes
            .subarray(0, 8)
            .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
        : bytes.subarray(0, 4).toString() === "RIFF" &&
          bytes.subarray(8, 12).toString() === "WEBP";
  if (!signatureMatches || bytes.length > 2 * 1024 * 1024) throw fail();
  return value;
}

export function validateRequest(value: unknown): AssistRequest {
  const fail = () =>
    new AgentError(
      400,
      "INVALID_REQUEST",
      "Provide an intent, text of up to 4,000 characters, and valid optional details.",
    );
  if (
    !record(value) ||
    (value.intent !== "search" && value.intent !== "listing")
  )
    throw fail();
  const result: AssistRequest = {
    intent: value.intent,
    text: text(value.text, 4000, fail),
  };
  if (value.context !== undefined) {
    if (!record(value.context)) throw fail();
    const source = value.context;
    result.context = {};
    if (source.location !== undefined)
      result.context.location = text(source.location, 120, fail);
    if (source.currentQuery !== undefined)
      result.context.currentQuery = text(source.currentQuery, 500, fail);
    if (source.maxPrice !== undefined)
      result.context.maxPrice = number(source.maxPrice, 1_000_000, fail);
    if (source.radius !== undefined)
      result.context.radius = number(source.radius, 500, fail);
    if (source.pickupBy !== undefined) {
      const date = text(source.pickupBy, 10, fail);
      if (date && !validDate(date)) throw fail();
      result.context.pickupBy = date;
    }
  }
  // A listing may show several views; a visual search uses one inspiration photo.
  const maxPhotos = value.intent === "listing" ? MAX_LISTING_PHOTOS : 1;
  const tooMany = () =>
    new AgentError(
      400,
      "INVALID_IMAGE",
      value.intent === "listing"
        ? `Use up to ${MAX_LISTING_PHOTOS} listing photos.`
        : "Search with one photo at a time.",
    );
  if (value.image !== undefined) result.image = validateImage(value.image);
  if (value.images !== undefined) {
    if (!Array.isArray(value.images) || value.images.length > maxPhotos)
      throw tooMany();
    result.images = [...new Set(value.images.map(validateImage))];
    const allImages = [
      ...new Set([...(result.image ? [result.image] : []), ...result.images]),
    ];
    if (allImages.length > maxPhotos) throw tooMany();
    if (photoBytes(allImages) > MAX_UPLOAD_PHOTO_BYTES) throw tooLarge();
  }
  if (!result.text && !result.image && !result.images?.length)
    throw new AgentError(
      400,
      "EMPTY_REQUEST",
      "Describe what you need or add a listing photo.",
    );
  return result;
}

function strings(value: unknown, count: number, length: number): string[] {
  if (!Array.isArray(value) || value.length > count) throw invalidOutput();
  return [
    ...new Set(
      value.map((item) => text(item, length, invalidOutput)).filter(Boolean),
    ),
  ];
}

export function validateAgentOutput(
  value: unknown,
): Pick<AssistResponse, "suggestions" | "missingDetails" | "metadata"> {
  if (!record(value) || !record(value.metadata)) throw invalidOutput();
  const metadata: AgentMetadata = {
    keywords: strings(value.metadata.keywords ?? [], 12, 50),
  };
  const source = value.metadata;
  for (const [key, max] of [
    ["query", 500],
    ["title", 90],
    ["description", 2400],
    ["location", 120],
  ] as const) {
    if (source[key] !== undefined && source[key] !== null)
      metadata[key] = text(source[key], max, invalidOutput);
  }
  for (const [key, max] of [
    ["maxPrice", 1_000_000],
    ["radius", 500],
  ] as const) {
    if (source[key] !== undefined && source[key] !== null)
      metadata[key] = number(source[key], max, invalidOutput);
  }
  if (source.pickupBy !== undefined && source.pickupBy !== null) {
    const date = text(source.pickupBy, 10, invalidOutput);
    if (date && !validDate(date)) throw invalidOutput();
    metadata.pickupBy = date;
  }
  if (source.price !== undefined)
    metadata.price =
      source.price === null
        ? null
        : number(source.price, 1_000_000, invalidOutput);
  for (const key of ["condition", "dimensions"] as const) {
    if (source[key] !== undefined)
      metadata[key] =
        source[key] === null
          ? null
          : text(source[key], 160, invalidOutput) || null;
  }
  return {
    suggestions: strings(value.suggestions ?? [], 4, 160),
    missingDetails: strings(value.missingDetails ?? [], 6, 160),
    metadata,
  };
}

/** Sorting sends reduced previews, so the whole set shares one upload budget. */
export function validatePhotoGroupRequest(value: unknown): PhotoGroupRequest {
  if (
    !record(value) ||
    !Array.isArray(value.images) ||
    value.images.length === 0 ||
    value.images.length > MAX_BATCH_PHOTOS
  )
    throw new AgentError(
      400,
      "INVALID_IMAGE",
      `Add between 1 and ${MAX_BATCH_PHOTOS} photos to sort.`,
    );
  const images = value.images.map(validateImage);
  if (photoBytes(images) > MAX_UPLOAD_PHOTO_BYTES) throw tooLarge();
  if (value.itemCount === undefined) return { images };
  if (
    typeof value.itemCount !== "number" ||
    !Number.isInteger(value.itemCount) ||
    value.itemCount < 1 ||
    value.itemCount > images.length
  )
    throw new AgentError(
      400,
      "INVALID_REQUEST",
      "Choose between 1 listing and one listing per photo.",
    );
  return { images, itemCount: value.itemCount };
}

/** Every photo ends up in exactly one listing, even when the model skips or repeats one. */
export function validatePhotoGroups(
  value: unknown,
  count: number,
): PhotoGroup[] {
  if (!record(value) || !Array.isArray(value.groups)) throw invalidOutput();
  const used = new Set<number>();
  const groups: PhotoGroup[] = [];
  for (const group of value.groups) {
    if (!record(group) || !Array.isArray(group.photos)) throw invalidOutput();
    const label = text(group.label ?? "", 120, invalidOutput).slice(0, 90);
    const photos: number[] = [];
    for (const photo of group.photos) {
      if (
        typeof photo !== "number" ||
        !Number.isInteger(photo) ||
        photo < 0 ||
        photo >= count ||
        used.has(photo)
      )
        continue;
      used.add(photo);
      photos.push(photo);
    }
    for (let start = 0; start < photos.length; start += MAX_LISTING_PHOTOS)
      groups.push({
        photos: photos.slice(start, start + MAX_LISTING_PHOTOS),
        label,
      });
  }
  for (let photo = 0; photo < count; photo++)
    if (!used.has(photo)) groups.push({ photos: [photo], label: "" });
  // Keep the model's cover choice, but list items in upload order.
  return groups.sort((a, b) => Math.min(...a.photos) - Math.min(...b.photos));
}
