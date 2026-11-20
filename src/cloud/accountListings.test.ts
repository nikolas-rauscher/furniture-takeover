import test from "node:test";
import assert from "node:assert/strict";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Product } from "../../shared/marketplace.ts";
import { products } from "../testing/fixtures.ts";
import { createAccountListings } from "./accountListings.ts";

const owner = "11111111-1111-4111-8111-111111111111";
const photo = `https://cdn.test/${owner}/desk.jpg`;
const saved: Product = {
  ...products[1],
  own: true,
  seller: "You",
  image: photo,
  images: [photo],
  status: "active",
};

/** Records each update and its filters; `rows` is what the filtered update matches. */
function recordingClient(rows: number) {
  const updates: { values: object; filters: [string, unknown][] }[] = [];
  const client = {
    storage: {
      from: () => ({
        getPublicUrl: (path: string) => ({
          data: { publicUrl: `https://cdn.test/${path}` },
        }),
      }),
    },
    from: () => ({
      update(values: object) {
        const update = { values, filters: [] as [string, unknown][] };
        updates.push(update);
        const builder = {
          eq(column: string, value: unknown) {
            update.filters.push([column, value]);
            return builder;
          },
          select: () =>
            Promise.resolve({
              data: Array.from({ length: rows }, () => ({ id: saved.id })),
              error: null,
            }),
        };
        return builder;
      },
    }),
  } as unknown as SupabaseClient;
  return { client, updates };
}

test("a listing edit sends only the fields it changed", async () => {
  const { client, updates } = recordingClient(1);
  await createAccountListings(client, owner).save(
    { ...saved, title: "Desk with drawer" },
    { ...saved, price: 40 },
  );
  assert.deepEqual(updates[0].values, {
    title: "Desk with drawer",
    price: saved.price,
  });
});

test("a status change applies only to the status this tab last saw", async () => {
  const { client, updates } = recordingClient(1);
  await createAccountListings(client, owner).save(
    { ...saved, status: "withdrawn" },
    saved,
  );
  assert.deepEqual(updates[0].values, { status: "withdrawn" });
  assert.deepEqual(updates[0].filters.at(-1), ["status", "active"]);
  const stale = recordingClient(0);
  await assert.rejects(
    createAccountListings(stale.client, owner).save(
      { ...saved, status: "withdrawn" },
      saved,
    ),
    /changed on another device/,
  );
});
