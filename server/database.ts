import { listingPhotos, MAX_LISTING_PHOTOS } from "../shared/listingPhotos.ts";
import { isLegacyCampusPickupPoint } from "../shared/campusPickupPoints.ts";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { adminIllustrations } from "../shared/admin.ts";
import { demoListings } from "../shared/demoListings.ts";
import type { Product } from "../shared/marketplace.ts";
import {
  adminFailure,
  checkDemoStudent,
  createDemoAdmin,
  hasAgreedDemoDeal,
  initializeDemoModeration,
} from "./demo-admin.ts";
import { AgentError } from "./errors.ts";
import { validateRequest } from "./validation.ts";

export type ListingsStore = {
  listDemo: () => Product[];
  seedDemo: () => Product[];
  updateDemo: (listings: unknown, workspace?: string) => Product[];
  admin: ReturnType<typeof createDemoAdmin>;
  close: () => void;
};

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

function photoList(value: unknown): string[] {
  if (!Array.isArray(value) || value.length > MAX_LISTING_PHOTOS)
    throw invalidListing();
  return value.map((photo) => text(photo, 2_796_240, true));
}

/** Uploaded photos use the same bounded raster validation as the upload endpoint. */
function validUpload(photo: string): string {
  try {
    validateRequest({ intent: "listing", text: "", image: photo });
  } catch {
    throw invalidListing();
  }
  return photo;
}

function validPhoto(photo: string): string {
  return adminIllustrations.includes(photo) ||
    /^\/images\/[a-zA-Z0-9_-]+\.(?:jpe?g|png|webp)$/.test(photo)
    ? photo
    : validUpload(photo);
}

/** Card copies exist only for uploaded photos; drawings and bundled photos have none. */
function validCardPhoto(photo: string): string {
  if (!photo.startsWith("data:image/")) throw invalidListing();
  return validUpload(photo);
}

function validateDemoListing(value: unknown, existing: Product): Product {
  if (
    !record(value) ||
    typeof value.id !== "string" ||
    value.id !== existing.id ||
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
  const image = validPhoto(text(value.image, 2_796_240, true));
  let images: string[] | undefined;
  if (value.images !== undefined) {
    images = listingPhotos({
      image,
      images: photoList(value.images).map(validPhoto),
    });
    if (images.length > MAX_LISTING_PHOTOS) throw invalidListing();
  }
  const cardImages = photoList(value.cardImages ?? []).map(validCardPhoto);
  if (
    (cardImages.length &&
      cardImages.length !== listingPhotos({ image, images }).length) ||
    JSON.stringify({ image, images, cardImages }).length > 2_900_000
  )
    throw invalidListing();
  return {
    id: value.id,
    title: text(value.title, 180, true),
    ...(Array.isArray(value.tags)
      ? { tags: value.tags.slice(0, 3).map((tag) => text(tag, 40, true)) }
      : {}),
    price: number(value.price, Math.max(10_000, existing.price)),
    category: text(value.category, 120),
    image,
    ...(images ? { images } : {}),
    ...(cardImages.length ? { cardImages } : {}),
    location: text(value.location, 180, true),
    ...(value.location === existing.location && existing.pickupPoint
      ? { pickupPoint: existing.pickupPoint }
      : {}),
    distance: number(value.distance, 500),
    condition: text(value.condition, 180),
    dimensions: text(value.dimensions, 160),
    source: "takeover",
    seller: text(value.seller, 120, true),
    initials: text(value.initials, 8, true),
    description: text(value.description, 4000),
    available: text(value.available, 300),
    pickupBy,
    status: value.status as Product["status"],
    own: true,
    demo: true,
  };
}

const legacyStockPhoto =
  /^(?:\/images\/(?:catalog-)?[a-zA-Z0-9_-]+\.jpg|https:\/\/img\.ricardostatic\.ch\/.+)$/;
const legacyDescriptionStart = "Fictional demo listing for testing.";

/** Rows saved before the illustrations still hold a stock photo and the first test wording; edits stay. */
function refreshLegacyStock(
  existing: Product,
  listing: Product,
): Product | undefined {
  const legacyPhoto = legacyStockPhoto.test(existing.image);
  const legacyText = existing.description.startsWith(legacyDescriptionStart);
  if (!legacyPhoto && !legacyText) return undefined;
  const refreshed: Product & { photoSourceUrl?: string } = {
    ...existing,
    ...(legacyPhoto ? { image: listing.image } : {}),
    ...(legacyText
      ? {
          description: listing.description,
          seller: listing.seller,
          initials: listing.initials,
        }
      : {}),
  };
  delete refreshed.photoSourceUrl;
  return refreshed;
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
  initializeDemoModeration(database);
  const read = database.prepare(
    `SELECT l.payload FROM listings l LEFT JOIN demo_listing_admin a ON a.id=l.id
      WHERE l.demo=1 AND coalesce(a.hidden,0)=0 ORDER BY l.rowid`,
  );
  const insert = database.prepare(
    "INSERT INTO listings (id, demo, payload) VALUES (?, 1, ?) ON CONFLICT(id) DO NOTHING",
  );
  const stored = database.prepare(
    `SELECT l.payload,a.edited FROM listings l LEFT JOIN demo_listing_admin a ON a.id=l.id
      WHERE l.id=? AND l.demo=1`,
  );
  const retiredOrHidden = database.prepare(
    "SELECT 1 FROM demo_listing_admin WHERE id=? AND hidden=1",
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
  const transaction = <T>(write: () => T): T => {
    database.exec("BEGIN IMMEDIATE");
    try {
      const result = write();
      database.exec("COMMIT");
      return result;
    } catch (error) {
      database.exec("ROLLBACK");
      throw error;
    }
  };
  const admin = createDemoAdmin(database, transaction);
  return {
    listDemo,
    admin,
    seedDemo() {
      transaction(() => {
        for (const listing of demoListings) {
          insert.run(listing.id, JSON.stringify(listing));
          // Only migrate bundled stock photos; preserve uploads and all user edits.
          const row = stored.get(listing.id);
          if (row && !row.edited) {
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
            const refreshed = refreshLegacyStock(existing, listing);
            if (refreshed) update.run(JSON.stringify(refreshed), listing.id);
          }
        }
      });
      return listDemo();
    },
    updateDemo(value, workspace) {
      if (!Array.isArray(value) || value.length > demoListings.length)
        throw invalidListing();
      transaction(() => {
        if (workspace) checkDemoStudent(database, workspace);
        const seen = new Set<string>();
        // Validate the complete batch before updating any row.
        const listings = value.map((item) => {
          if (!record(item) || typeof item.id !== "string" || seen.has(item.id))
            throw invalidListing();
          seen.add(item.id);
          const row = stored.get(item.id);
          if (retiredOrHidden.get(item.id))
            throw adminFailure("admin_listing_hidden", 409);
          if (!row) throw invalidListing();
          const existing = JSON.parse(String(row.payload)) as Product;
          const listing = validateDemoListing(item, existing);
          if (
            listing.status !== "reserved" &&
            hasAgreedDemoDeal(database, listing.id)
          )
            throw new AgentError(
              409,
              "listing_deal_agreed",
              "Finish or cancel the agreed deal before changing this listing.",
            );
          return row.edited
            ? {
                ...listing,
                seller: existing.seller,
                initials: existing.initials,
              }
            : listing;
        });
        for (const listing of listings)
          update.run(JSON.stringify(listing), listing.id);
      });
      return listDemo();
    },
    close: () => database.close(),
  };
}
