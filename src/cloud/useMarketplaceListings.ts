import { presentSampleListing } from "../../shared/sampleListingPresentation";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type SetStateAction,
} from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Product } from "../../shared/marketplace";
import { listingPhotos } from "../../shared/listingPhotos";
import { useListings } from "../hooks/useListings";
import { fail, photoUrl, type Listing } from "./client";
import type { AccountConnection } from "./AccountSession";

export function toProduct(
  row: Listing,
  userId?: string,
  name = "Seller",
): Product {
  const clientImages = row.images; // converted to public URLs by the loader
  return presentSampleListing({
    id: row.id,
    title: row.title,
    description: row.description,
    price: Number(row.price),
    location: row.location,
    condition: row.condition,
    dimensions: row.dimensions,
    category: "All",
    tags: row.tags,
    source: "takeover",
    image: clientImages[0] ?? "",
    images: clientImages,
    seller: row.owner_id === userId ? "You" : name,
    initials: row.owner_id === userId ? "Y" : name.slice(0, 2).toUpperCase(),
    own: row.owner_id === userId,
    demo: row.tags?.includes("Demo") ?? false,
    distance: 0,
    pickupBy: row.pickup_by ?? "",
    available: row.pickup || "Flexible pickup",
    status: row.status,
  });
}
export async function loadProducts(client: SupabaseClient, userId?: string) {
  const rows: Listing[] = [];
  for (let offset = 0; ; offset += 500) {
    const result = await client
      .from("listings")
      .select("*")
      .order("id")
      .range(offset, offset + 499);
    fail(result.error);
    rows.push(...(result.data as Listing[]));
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
      { ...row, images: row.images.map((path) => photoUrl(client, path)) },
      userId,
      names[row.owner_id] || "Seller",
    ),
  );
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
        current.current = values;
        setListingsState(values);
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
    return () => {
      mounted.current = false;
      generation.current++;
      window.removeEventListener("focus", refresh);
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
        const images: string[] = [];
        for (const image of listingPhotos(item)) {
          const prefix = photoUrl(client, `${userId}/`);
          if (image.startsWith(prefix)) {
            images.push(
              `${userId}/${decodeURIComponent(image.slice(prefix.length))}`,
            );
            continue;
          }
          if (!image.startsWith("data:image/"))
            throw Error("Use photos uploaded with your account.");
          let path = uploads.current.get(image);
          if (!path) {
            path = `${userId}/${crypto.randomUUID()}.jpg`;
            const blob = await (await fetch(image)).blob();
            fail(
              (
                await client.storage
                  .from("listing-photos")
                  .upload(path, blob, { contentType: blob.type })
              ).error,
            );
            uploads.current.set(image, path);
          }
          images.push(path);
        }
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
        retry: () => void load(),
        addDemo: async () => false,
      }
    : demo;
}
