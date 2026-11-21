import { MAX_LISTING_PHOTOS } from "../../shared/listingPhotos.ts";
import {
  migrateSaved,
  type Criteria,
  type Product,
  type SearchJob,
} from "../../shared/marketplace.ts";

export type SavedValueValidator<T> = (value: unknown) => value is T;
export type RestoredValue<T> = {
  value: T;
  source: "stored" | "empty" | "invalid";
};

const record = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);
const nonNegativeNumber = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value) && value >= 0;
const stringFields = (value: Record<string, unknown>, names: string[]) =>
  names.every((name) => typeof value[name] === "string");
const oneOf = (value: unknown, options: string[]) =>
  typeof value === "string" && options.includes(value);
const isPhotoList = (value: unknown) =>
  Array.isArray(value) &&
  value.length <= MAX_LISTING_PHOTOS &&
  value.every((image) => typeof image === "string" && image.length > 0);
const LISTING_STATUSES = ["active", "reserved", "sold", "withdrawn"];

export const isFavoriteIds: SavedValueValidator<string[]> = (
  value,
): value is string[] =>
  Array.isArray(value) && value.every((item) => typeof item === "string");

function isCriteria(value: unknown): value is Criteria {
  return (
    record(value) &&
    stringFields(value, ["category", "pickup", "query", "condition"]) &&
    nonNegativeNumber(value.maxPrice) &&
    nonNegativeNumber(value.radius) &&
    typeof value.source === "string" &&
    value.source.trim().length > 0 &&
    value.source.length <= 120
  );
}

export const isSearchJobs: SavedValueValidator<SearchJob[]> = (
  value,
): value is SearchJob[] =>
  Array.isArray(value) &&
  value.every(
    (item) =>
      record(item) &&
      stringFields(item, ["id", "title"]) &&
      isCriteria(item.criteria) &&
      typeof item.paused === "boolean" &&
      typeof item.seen === "boolean",
  );

export const isProducts: SavedValueValidator<Product[]> = (
  value,
): value is Product[] =>
  Array.isArray(value) &&
  value.every(
    (item) =>
      record(item) &&
      stringFields(item, [
        "id",
        "title",
        "category",
        "image",
        "location",
        "condition",
        "dimensions",
        "seller",
        "initials",
        "description",
        "available",
        "pickupBy",
      ]) &&
      (item.images === undefined || isPhotoList(item.images)) &&
      (item.cardImages === undefined || isPhotoList(item.cardImages)) &&
      (item.pickupPoint === undefined ||
        (record(item.pickupPoint) &&
          stringFields(item.pickupPoint, [
            "name",
            "address",
            "area",
            "sourceUrl",
          ]) &&
          typeof item.pickupPoint.sourceUrl === "string" &&
          /^https:\/\//.test(item.pickupPoint.sourceUrl))) &&
      nonNegativeNumber(item.price) &&
      nonNegativeNumber(item.distance) &&
      oneOf(item.source, ["takeover", "Ricardo", "Anibis"]) &&
      oneOf(item.status, LISTING_STATUSES) &&
      (item.own === undefined || typeof item.own === "boolean") &&
      (item.demo === undefined || typeof item.demo === "boolean"),
  );

/** Listing statuses by listing id, such as the ones demo deals changed. */
export const isListingStatuses: SavedValueValidator<
  Record<string, Product["status"]>
> = (value): value is Record<string, Product["status"]> =>
  record(value) &&
  Object.values(value).every((status) => oneOf(status, LISTING_STATUSES));

/** Validate after migration, before any saved value reaches a rendering path. */
export function restoreSavedValue<T>(
  serialized: string | null,
  fallback: T,
  validate: SavedValueValidator<T>,
): RestoredValue<T> {
  if (serialized === null) return { value: fallback, source: "empty" };
  try {
    const value: unknown = migrateSaved(JSON.parse(serialized));
    return validate(value)
      ? { value, source: "stored" }
      : { value: fallback, source: "invalid" };
  } catch {
    return { value: fallback, source: "invalid" };
  }
}
