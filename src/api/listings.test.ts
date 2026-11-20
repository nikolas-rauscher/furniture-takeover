import assert from "node:assert/strict";
import test, { type TestContext } from "node:test";
import type { SupabaseClient } from "@supabase/supabase-js";
import { demoListings as samples } from "../../shared/demoListings.ts";
import { createAccountListings } from "../cloud/accountListings.ts";
import { demoListings } from "./demoListings.ts";
import type { ListingsApi } from "./listings.ts";

function mockDemo(t: TestContext): ListingsApi {
  let listings = [{ ...samples[0], own: true }];
  t.mock.method(
    globalThis,
    "fetch",
    async (path: string, init?: RequestInit) => {
      if (path === "/api/listings/demo/update") {
        assert.equal(init?.method, "POST");
        listings = JSON.parse(String(init?.body)).listings;
      } else assert.equal(path, "/api/listings?demo=true");
      return Response.json({ listings });
    },
  );
  return demoListings;
}

function mockAccount(): ListingsApi {
  const sample = samples[0];
  let row = {
    id: sample.id,
    title: sample.title,
    description: sample.description,
    price: sample.price,
    condition: sample.condition,
    location: sample.location,
    dimensions: sample.dimensions,
    pickup: sample.available,
    pickup_by: null,
    owner_id: "owner",
    status: sample.status,
    images: [],
    card_images: [],
    tags: ["Demo"],
  };
  const client = {
    async rpc(name: string) {
      assert.equal(name, "refresh_pickup_checks");
      return { error: null };
    },
    from(table: string) {
      if (table === "profiles")
        return {
          select: () => ({
            in: async () => ({
              data: [{ id: "owner", display_name: "Owner" }],
              error: null,
            }),
          }),
        };
      assert.equal(table, "listings");
      return {
        select: () => ({
          order: () => ({
            range: async () => ({ data: [row], error: null }),
          }),
        }),
        update: (values: Partial<typeof row>) => ({
          eq(column: string, id: string) {
            assert.equal(column, "id");
            assert.equal(id, row.id);
            return {
              eq(column: string, owner: string) {
                assert.equal(column, "owner_id");
                assert.equal(owner, "owner");
                return {
                  select: () => ({
                    async single() {
                      row = { ...row, ...values };
                      return { error: null };
                    },
                  }),
                };
              },
            };
          },
        }),
      };
    },
  } as unknown as SupabaseClient;
  return createAccountListings(client, "owner");
}

for (const [mode, mock] of Object.entries({
  demo: mockDemo,
  account: mockAccount,
})) {
  test(`${mode} catalog persists an owned listing edit`, async (t) => {
    const api = mock(t);
    const [listing] = await api.read();
    assert.equal(listing.id, samples[0].id);
    assert.equal(listing.own, true);
    await api.save(
      { ...listing, title: "Updated listing", price: 21 },
      listing,
    );
    const [updated] = await api.read(true);
    assert.equal(updated.id, listing.id);
    assert.equal(updated.title, "Updated listing");
    assert.equal(updated.price, 21);
  });
}
