import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type SetStateAction,
} from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { campusPickupPoints } from "../../shared/campusPickupPoints";
import { adminCatalogChanged } from "../api/admin";
import type { Product } from "../../shared/marketplace";
import { listingPhotos } from "../../shared/listingPhotos";
import { useListings } from "../hooks/useListings";
import { fail, photoUrl, type Listing } from "./client";
import { refreshPickupChecks } from "./accountInbox";
import { listingPhotoBlob } from "./listingPhoto";
import { withCardImages } from "../cardPhotos";
import { randomUuid } from "../randomUuid";
import type { AccountConnection } from "./AccountSession";

export function toProduct(
  row: Listing,
  userId?: string,
  name = "Seller",
): Product {
  const pickupPoint = campusPickupPoints.find(({ name }) => name === row.demo_meeting_point);
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
export async function loadProducts(client: SupabaseClient, userId?: string) {
  if (userId) await refreshPickupChecks(client, true);
  const rows: Listing[] = [];
  for (let offset = 0; ; offset += 500) {
    const result = await client
      .from("listings")
      .select("*")
      .order("id")
      .range(offset, offset + 499);
    fail(result.error);
    rows.push(...(result.data as Listing[]).filter((row) => !row.hidden_at || row.owner_id === userId));
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

export function useMarketplaceListings(account?: AccountConnection) {
  const demo = useListings(!account);
  const [listings, setListingsState] = useState<Product[]>([]),
    [ready, setReady] = useState(false),
    [error, setError] = useState(""),
    [pending, setPending] = useState(0);
  const current = useRef(listings),
    mounted = useRef(true),
    generation = useRef(0),
    uploads = useRef(new Map<string, string>()),
    writing = useRef(false);
  const client = account?.client,
    userId = account?.session?.user.id;
  const load = useCallback(async () => {
    if (!client || writing.current) return false;
    const token = ++generation.current;
    try {
      const values = await loadProducts(client, userId);
      if (mounted.current && generation.current === token) {
        if (JSON.stringify(current.current) !== JSON.stringify(values)) {
          current.current = values;
          setListingsState(values);
        }
        setReady(true);
        setError("");
      }
      return true;
    } catch (err) {
      if (mounted.current)
        setError(
          err instanceof Error ? err.message : "Could not load listings.",
        );
      return false;
    }
  }, [client, userId]);
  useEffect(() => {
    mounted.current = true;
    void load();
    const refresh = () => void load();
    window.addEventListener("focus", refresh);
    window.addEventListener(adminCatalogChanged, refresh);
    return () => {
      mounted.current = false;
      generation.current++;
      window.removeEventListener("focus", refresh);
      window.removeEventListener(adminCatalogChanged, refresh);
    };
  }, [load]);
  async function save(update: SetStateAction<Product[]>) {
    if (!client || !userId) {
      setError("Sign in to save a listing.");
      return false;
    }
    if (writing.current) return false;
    writing.current = true;
    generation.current++;
    setPending(1);
    setError("");
    const previous = current.current;
    const proposed = typeof update === "function" ? update(previous) : update;
    try {
      for (const item of proposed) {
        const old = previous.find((p) => p.id === item.id);
        if (JSON.stringify(item) === JSON.stringify(old)) continue;
        if (!item.own || (old && !old.own))
          throw Error("You can only change your own listings.");
        const prepared = await withCardImages(item, old);
        const storage = { client, owner: userId, uploaded: uploads.current };
        const images = await storedPhotoPaths(storage, listingPhotos(prepared));
        const cardImages = await storedPhotoPaths(
          storage,
          prepared.cardImages ?? [],
        );
        const values = {
          title: item.title,
          description: item.description,
          price: item.price,
          location: item.location,
          condition: item.condition,
          dimensions: item.dimensions,
          pickup: item.available,
          pickup_by: item.pickupBy || null,
          tags: item.tags ?? [],
          images,
          card_images: cardImages,
          status: item.status,
        };
        let result = old
          ? await client
              .from("listings")
              .update(values)
              .eq("id", item.id)
              .eq("owner_id", userId)
              .select("id")
              .single()
          : await client
              .from("listings")
              .insert({ ...values, id: item.id, owner_id: userId })
              .select("id")
              .single();
        if (!old && result.error?.code === "23505")
          result = await client
            .from("listings")
            .update(values)
            .eq("id", item.id)
            .eq("owner_id", userId)
            .select("id")
            .single();
        fail(result.error);
      }
      const values = await loadProducts(client, userId);
      if (mounted.current) {
        current.current = values;
        setListingsState(values);
        setReady(true);
      }
      return true;
    } catch (err) {
      if (mounted.current)
        setError(
          err instanceof Error ? err.message : "Could not save listing.",
        );
      return false;
    } finally {
      writing.current = false;
      if (mounted.current) setPending(0);
    }
  }
  return account
    ? {
        listings,
        setListings: save,
        ready,
        error,
        pending,
        retry: load,
        addDemo: async () => false,
      }
    : demo;
}
