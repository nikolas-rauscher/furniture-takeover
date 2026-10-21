import { listingPhotos, MAX_LISTING_PHOTOS } from "../shared/listingPhotos.ts";
import { isLegacyCampusPickupPoint } from "../shared/campusPickupPoints.ts";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { demoListings } from "../shared/demoListings.ts";
import type { Product } from "../shared/marketplace.ts";
import { AgentError } from "./errors.ts";
import { validateRequest } from "./validation.ts";

export type ListingsStore = {
  listDemo: () => Product[];
  seedDemo: () => Product[];
  updateDemo: (listings: unknown) => Product[];
  close: () => void;
};

const demoIds = new Set(demoListings.map((listing) => listing.id));
const invalidListing = () =>
  new AgentError(
    400,
    "INVALID_LISTING",
    "Provide valid details for an existing demo listing.",
  );

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function text(value: unknown, max: number, required = false): string {
  if (
    typeof value !== "string" ||
    value.length > max ||
    (required && !value.trim())
  )
    throw invalidListing();
  return value.trim();
}

function number(value: unknown, max: number): number {
  if (
    typeof value !== "number" ||
    !Number.isFinite(value) ||
    value < 0 ||
    value > max
  )
    throw invalidListing();
  return value;
}

function validateDemoListing(value: unknown): Product {
  if (
    !record(value) ||
    typeof value.id !== "string" ||
    !demoIds.has(value.id) ||
    value.demo !== true ||
    value.own !== true ||
    value.source !== "takeover"
  )
    throw invalidListing();
  const pickupBy = text(value.pickupBy, 10);
  if (
    pickupBy &&
    (!/^\d{4}-\d{2}-\d{2}$/.test(pickupBy) ||
      !Number.isFinite(Date.parse(pickupBy)) ||
      new Date(pickupBy).toISOString().slice(0, 10) !== pickupBy)
  )
    throw invalidListing();
  if (
    !["active", "reserved", "sold", "withdrawn"].includes(String(value.status))
  )
    throw invalidListing();
  const image = text(value.image, 2_796_240, true);
  const seed = demoListings.find((listing) => listing.id === value.id);
  if (
    image !== seed?.image &&
    !/^\/images\/[a-zA-Z0-9_-]+\.(?:jpe?g|png|webp)$/.test(image)
  ) {
    // Reuse the same bounded raster-photo validation as the upload endpoint.
    try {
      validateRequest({ intent: "listing", text: "", image });
    } catch {
      throw invalidListing();
    }
  }
  let images: string[] | undefined;
  if (value.images !== undefined) {
    if (
      !Array.isArray(value.images) ||
      value.images.length > MAX_LISTING_PHOTOS
    )
      throw invalidListing();
    images = listingPhotos({
      image,
      images: value.images.map((photo) => {
        const candidate = text(photo, 2_796_240, true);
        if (
          candidate !== seed?.image &&
          !/^\/images\/[a-zA-Z0-9_-]+\.(?:jpe?g|png|webp)$/.test(candidate)
        ) {
          try {
            validateRequest({ intent: "listing", text: "", image: candidate });
          } catch {
            throw invalidListing();
          }
        }
        return candidate;
      }),
    });
    if (
      images.length > MAX_LISTING_PHOTOS ||
      JSON.stringify({ image, images }).length > 2_900_000
    )
      throw invalidListing();
  }
  return {
    id: value.id,
    title: text(value.title, 180, true),
    ...(Array.isArray(value.tags)
      ? { tags: value.tags.slice(0, 3).map((tag) => text(tag, 40, true)) }
      : {}),
    price: number(value.price, 10_000),
    category: text(value.category, 120),
    image,
    ...(images ? { images } : {}),
    ...(image === seed?.image && seed?.photoSourceUrl
      ? { photoSourceUrl: seed.photoSourceUrl }
      : {}),
    location: text(value.location, 120, true),
    ...(value.location === seed?.location && seed?.pickupPoint
      ? { pickupPoint: seed.pickupPoint }
      : {}),
    distance: number(value.distance, 500),
    condition: text(value.condition, 120),
    dimensions: text(value.dimensions, 160),
    source: "takeover",
    seller: text(value.seller, 120, true),
    initials: text(value.initials, 8, true),
    description: text(value.description, 4000, true),
    available: text(value.available, 160),
    pickupBy,
    status: value.status as Product["status"],
    own: true,
    demo: true,
  };
}

export function createListingsStore(filename: string): ListingsStore {
  if (filename !== ":memory:")
    mkdirSync(dirname(filename), { recursive: true });
  const database = new DatabaseSync(filename);
  database.exec(`
    PRAGMA busy_timeout = 5000;
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS listings (
      id TEXT PRIMARY KEY,
      demo INTEGER NOT NULL CHECK (demo IN (0, 1)),
      payload TEXT NOT NULL CHECK (json_valid(payload))
    );
  `);
  const read = database.prepare(
    "SELECT payload FROM listings WHERE demo = 1 ORDER BY rowid",
  );
  const insert = database.prepare(
    "INSERT INTO listings (id, demo, payload) VALUES (?, 1, ?) ON CONFLICT(id) DO NOTHING",
  );
  const exists = database.prepare(
    "SELECT id FROM listings WHERE id = ? AND demo = 1",
  );
  const update = database.prepare(
    "UPDATE listings SET payload = ? WHERE id = ? AND demo = 1",
  );
  const seedOrder = new Map(
    demoListings.map((listing, index) => [listing.id, index]),
  );
  const listDemo = (): Product[] =>
    read
      .all()
      .map((row) => JSON.parse(String(row.payload)) as Product)
      .sort(
        (left, right) =>
          (seedOrder.get(left.id) ?? Number.MAX_SAFE_INTEGER) -
          (seedOrder.get(right.id) ?? Number.MAX_SAFE_INTEGER),
      );
  const transaction = (write: () => void) => {
    database.exec("BEGIN IMMEDIATE");
    try {
      write();
      database.exec("COMMIT");
    } catch (error) {
      database.exec("ROLLBACK");
      throw error;
    }
  };
  return {
    listDemo,
    seedDemo() {
      transaction(() => {
        for (const listing of demoListings) {
          insert.run(listing.id, JSON.stringify(listing));
          // Only migrate bundled stock photos; preserve uploads and all user edits.
          const row = database
            .prepare("SELECT payload FROM listings WHERE id = ?")
            .get(listing.id);
          if (row) {
            const existing = JSON.parse(String(row.payload)) as Product;
            if (
              ((!existing.pickupPoint &&
                ["Lausanne", "Renens"].includes(existing.location)) ||
                (isLegacyCampusPickupPoint(existing.pickupPoint) &&
                  existing.location === existing.pickupPoint?.area)) &&
              listing.pickupPoint
            ) {
              existing.location = listing.location;
              existing.pickupPoint = listing.pickupPoint;
              update.run(JSON.stringify(existing), listing.id);
            }
            if (
              /^\/images\/(?:catalog-)?[a-zA-Z0-9_-]+\.jpg$/.test(
                existing.image,
              ) &&
              listing.photoSourceUrl
            ) {
              update.run(
                JSON.stringify({
                  ...existing,
                  image: listing.image,
                  photoSourceUrl: listing.photoSourceUrl,
                }),
                listing.id,
              );
            }
          }
        }
      });
      return listDemo();
    },
    updateDemo(value) {
      if (!Array.isArray(value) || value.length > demoListings.length)
        throw invalidListing();
      const listings = value.map(validateDemoListing);
      if (
        new Set(listings.map((listing) => listing.id)).size !== listings.length
      )
        throw invalidListing();
      transaction(() => {
        // Validate the complete batch before updating any row.
        for (const listing of listings)
          if (!exists.get(listing.id)) throw invalidListing();
        for (const listing of listings)
          update.run(JSON.stringify(listing), listing.id);
      });
      return listDemo();
    },
    close: () => database.close(),
  };
}
