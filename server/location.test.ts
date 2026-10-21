import { test } from "node:test";
import assert from "node:assert/strict";
import { reversePickupLocation } from "./location.ts";

test("reverse pickup lookup validates coordinates before contacting the provider", async () => {
  let called = false;
  const fetcher = (async () => {
    called = true;
    return new Response();
  }) as typeof fetch;
  for (const coordinates of [
    [91, 6],
    [46, -181],
    [NaN, 6],
    ["46", 6],
    [null, 6],
  ]) {
    await assert.rejects(
      reversePickupLocation(coordinates[0], coordinates[1], undefined, fetcher),
      { code: "INVALID_LOCATION" },
    );
  }
  assert.equal(called, false);
});

test("reverse lookup returns street and locality without house number or raw full address", async () => {
  const fetcher = (async (input: URL | RequestInfo, options?: RequestInit) => {
    const url = new URL(String(input));
    assert.equal(url.origin, "https://nominatim.openstreetmap.org");
    assert.equal(url.searchParams.get("lat"), "46.519");
    assert.equal(url.searchParams.get("zoom"), "16");
    assert.ok(options?.signal);
    return Response.json({
      address: {
        road: "Avenue Louis-Favre",
        house_number: "4",
        postcode: "1024",
        town: "Ecublens",
      },
      display_name: "Private full address",
    });
  }) as typeof fetch;
  assert.deepEqual(
    await reversePickupLocation(46.51912, 6.5617, undefined, fetcher),
    { location: "Avenue Louis-Favre, 1024 Ecublens" },
  );
});

test("provider failures give a useful manual-entry fallback", async () => {
  for (const fetcher of [
    async () => new Response("", { status: 429 }),
    async () => Response.json({ address: { house_number: "4" } }),
    async () => {
      throw new Error("provider internal details");
    },
  ]) {
    await assert.rejects(
      reversePickupLocation(46, 6, undefined, fetcher as typeof fetch),
      {
        code: "LOCATION_LOOKUP_FAILED",
        message: "Could not find your area. Enter a pickup location instead.",
      },
    );
  }
});
