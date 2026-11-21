import assert from "node:assert/strict";
import test from "node:test";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createAccountFavorites } from "../cloud/accountFavorites.ts";
import { createDemoFavorites } from "./demoFavorites.ts";

function demoFavorites() {
  const stored = new Map<string, string>();
  return createDemoFavorites(
    () => ({
      getItem: (key) => stored.get(key) ?? null,
      setItem: (key, value) => void stored.set(key, value),
    }),
    () => assert.fail("Storage is available"),
  );
}

function accountFavorites() {
  const rows = new Map<string, { listing_id: string; price_at_save: number }>();
  const client = {
    from(table: string) {
      assert.equal(table, "saved_listings");
      return {
        select: async () => ({ data: [...rows.values()], error: null }),
        insert({
          user_id,
          listing_id,
        }: {
          user_id: string;
          listing_id: string;
        }) {
          assert.equal(user_id, "buyer");
          const row = {
            listing_id,
            price_at_save: listing_id === "chair" ? 40 : 20,
          };
          rows.set(listing_id, row);
          return {
            select: () => ({
              maybeSingle: async () => ({ data: row, error: null }),
            }),
          };
        },
        delete: () => ({
          eq(column: string, user: string) {
            assert.equal(column, "user_id");
            assert.equal(user, "buyer");
            return {
              async eq(column: string, listing: string) {
                assert.equal(column, "listing_id");
                rows.delete(listing);
                return { error: null };
              },
            };
          },
        }),
      };
    },
  } as unknown as SupabaseClient;
  return createAccountFavorites(client, "buyer");
}

for (const [mode, createApi] of Object.entries({
  demo: demoFavorites,
  account: accountFavorites,
})) {
  test(`${mode} favorites retain the first saved price and remove it when unsaved`, async () => {
    const api = createApi();
    const initial = api.initial();
    const chair = await api.update(initial, ["chair"], {
      id: "chair",
      price: 40,
    });
    const two = await api.update(chair, ["chair", "lamp"], {
      id: "lamp",
      price: 20,
    });
    const unchanged = await api.update(two, two.ids, {
      id: "chair",
      price: 30,
    });
    assert.deepEqual(unchanged, {
      ids: ["chair", "lamp"],
      prices: { chair: 40, lamp: 20 },
    });
    const lamp = await api.update(unchanged, ["lamp"]);
    assert.deepEqual(lamp, { ids: ["lamp"], prices: { lamp: 20 } });
    assert.deepEqual(api.refresh ? await api.refresh() : api.initial(), lamp);
  });
}
