import type { SupabaseClient } from "@supabase/supabase-js";
import { campusPickupPoints } from "../../shared/campusPickupPoints.ts";
import type { Product } from "../../shared/marketplace.ts";
import { listingPhotos } from "../../shared/listingPhotos.ts";
import { fail, photoUrl, type Listing } from "./client.ts";
import { refreshPickupChecks } from "./accountInbox.ts";
import { listingPhotoBlob } from "./listingPhoto.ts";
import { withCardImages } from "../cardPhotos.ts";
import { randomUuid } from "../randomUuid.ts";
import type { ListingsApi } from "../api/listings.ts";

function toProduct(row: Listing, userId?: string, name = "Seller"): Product {
  const pickupPoint = campusPickupPoints.find(
    ({ name }) => name === row.demo_meeting_point,
  );
  const clientImages = row.images; // converted to public URLs by the loader
  const cardImages = row.card_images;
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    price: Number(row.price),
    location: row.location,
    ...(pickupPoint ? { pickupPoint } : {}),
    condition: row.condition,
    dimensions: row.dimensions,
    category: "All",
    tags: row.tags,
    source: "takeover",
    image: clientImages[0] ?? "",
    images: clientImages,
    ...(cardImages.length ? { cardImages } : {}),
    seller: row.owner_id === userId ? "You" : name,
    initials: row.owner_id === userId ? "Y" : name.slice(0, 2).toUpperCase(),
    own: row.owner_id === userId,
    demo: row.tags?.includes("Demo") ?? false,
    distance: 0,
    pickupBy: row.pickup_by ?? "",
    available: row.pickup || "Flexible pickup",
    status: row.hidden_at ? "withdrawn" : row.status,
  };
}
async function loadProducts(client: SupabaseClient, userId?: string) {
  if (userId) await refreshPickupChecks(client, true);
  const rows: Listing[] = [];
  for (let offset = 0; ; offset += 500) {
    const result = await client
      .from("listings")
      .select("*")
      .order("id")
      .range(offset, offset + 499);
    fail(result.error);
    rows.push(
      ...(result.data as Listing[]).filter(
        (row) => !row.hidden_at || row.owner_id === userId,
      ),
    );
    if (result.data!.length < 500) break;
  }
  const ids = [...new Set(rows.map((r) => r.owner_id))];
  const names: Record<string, string> = {};
  for (let i = 0; i < ids.length; i += 100) {
    const result = await client
      .from("profiles")
      .select("id,display_name")
      .in("id", ids.slice(i, i + 100));
    fail(result.error);
    for (const row of result.data ?? []) names[row.id] = row.display_name;
  }
  return rows.map((row) =>
    toProduct(
      {
        ...row,
        images: row.images.map((path) => photoUrl(client, path)),
        card_images: row.card_images.map((path) => photoUrl(client, path)),
      },
      userId,
      names[row.owner_id] || "Seller",
    ),
  );
}
/** Where a seller's photos go; each new photo is uploaded once per browser session. */
type PhotoStorage = {
  client: SupabaseClient;
  owner: string;
  uploaded: Map<string, string>;
};

async function storedPhotoPath(storage: PhotoStorage, photo: string) {
  const { client, owner, uploaded } = storage;
  const ownPrefix = photoUrl(client, `${owner}/`);
  if (photo.startsWith(ownPrefix))
    return `${owner}/${decodeURIComponent(photo.slice(ownPrefix.length))}`;
  if (!photo.startsWith("data:image/"))
    throw Error("Use photos uploaded with your account.");
  const known = uploaded.get(photo);
  if (known) return known;
  const blob = listingPhotoBlob(photo);
  const extension = blob.type === "image/jpeg" ? "jpg" : blob.type.slice(6);
  const path = `${owner}/${randomUuid()}.${extension}`;
  fail(
    (
      await client.storage
        .from("listing-photos")
        .upload(path, blob, { contentType: blob.type })
    ).error,
  );
  uploaded.set(photo, path);
  return path;
}

async function storedPhotoPaths(storage: PhotoStorage, photos: string[]) {
  const paths: string[] = [];
  for (const photo of photos) paths.push(await storedPhotoPath(storage, photo));
  return paths;
}

async function listingColumns(storage: PhotoStorage, item: Product) {
  return {
    title: item.title,
    description: item.description,
    price: item.price,
    location: item.location,
    condition: item.condition,
    dimensions: item.dimensions,
    pickup: item.available,
    pickup_by: item.pickupBy || null,
    tags: item.tags ?? [],
    images: await storedPhotoPaths(storage, listingPhotos(item)),
    card_images: await storedPhotoPaths(storage, item.cardImages ?? []),
    status: item.status,
  };
}

/** Only the columns this edit changed, so a stale copy cannot restore other fields. */
function changedColumns<T extends object>(values: T, before: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(values).filter(
      ([key, value]) =>
        JSON.stringify(value) !== JSON.stringify(before[key as keyof T]),
    ),
  ) as Partial<T>;
}

export function createAccountListings(
  client: SupabaseClient,
  userId?: string,
): ListingsApi {
  const uploaded = new Map<string, string>();
  return {
    read: () => loadProducts(client, userId),
    async save(item, old) {
      if (!userId) throw new Error("Sign in to save a listing.");
      if (!item.own || (old && !old.own))
        throw Error("You can only change your own listings.");
      const storage = { client, owner: userId, uploaded };
      const values = await listingColumns(
        storage,
        await withCardImages(item, old),
      );
      const replaceOwnListing = () =>
        client
          .from("listings")
          .update(values)
          .eq("id", item.id)
          .eq("owner_id", userId);
      if (!old) {
        let result = await client
          .from("listings")
          .insert({ ...values, id: item.id, owner_id: userId })
          .select("id")
          .single();
        if (result.error?.code === "23505")
          result = await replaceOwnListing().select("id").single();
        fail(result.error);
        return;
      }
      const patch = changedColumns(values, await listingColumns(storage, old));
      if (!Object.keys(patch).length) return;
      let update = client
        .from("listings")
        .update(patch)
        .eq("id", item.id)
        .eq("owner_id", userId);
      // A status change applies only to the status this tab last saw.
      if (patch.status) update = update.eq("status", old.status);
      const result = await update.select("id");
      fail(result.error);
      if (!result.data?.length)
        throw new Error(
          "This listing changed on another device. Reload and try again.",
        );
    },
  };
}
