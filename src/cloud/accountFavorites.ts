import type { SupabaseClient } from "@supabase/supabase-js";
import {
  emptyFavorites,
  retainedPrices,
  type FavoritesApi,
} from "../api/favorites.ts";
import { fail } from "./client.ts";

async function readFavorites(client: SupabaseClient) {
  const { data, error } = await client.from("saved_listings").select("*");
  fail(error);
  return {
    ids: data!.map((row) => row.listing_id),
    prices: Object.fromEntries(
      data!
        .filter((row) => typeof row.price_at_save === "number")
        .map((row) => [row.listing_id, row.price_at_save]),
    ),
  };
}

async function saveFavorite(
  client: SupabaseClient,
  userId: string,
  listingId: string,
) {
  const inserted = await client
    .from("saved_listings")
    .insert({ user_id: userId, listing_id: listingId })
    .select("*")
    .maybeSingle();
  const result =
    inserted.error?.code === "23505"
      ? await client
          .from("saved_listings")
          .select("*")
          .eq("listing_id", listingId)
          .eq("user_id", userId)
          .maybeSingle()
      : inserted;
  fail(result.error);
  return result.data?.price_at_save;
}

export function createAccountFavorites(
  client: SupabaseClient,
  userId?: string,
): FavoritesApi {
  return {
    initial: emptyFavorites,
    refresh: userId ? () => readFavorites(client) : undefined,
    async update(previous, ids) {
      if (!userId) throw new Error("Sign in to save items.");
      const prices = retainedPrices(previous, ids);
      for (const id of ids.filter((id) => !previous.ids.includes(id))) {
        const price = await saveFavorite(client, userId, id);
        if (typeof price === "number") prices[id] = price;
      }
      for (const id of previous.ids.filter((id) => !ids.includes(id)))
        fail(
          (
            await client
              .from("saved_listings")
              .delete()
              .eq("user_id", userId)
              .eq("listing_id", id)
          ).error,
        );
      return { ids, prices };
    },
  };
}
