import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { demoListings } from "./demoListings.ts";
import { demoSellers } from "./demoSellers.ts";

const visibleText = (listing: (typeof demoListings)[number]) =>
  [
    listing.title,
    listing.description,
    listing.seller,
    listing.location,
    listing.available,
  ].join("\n");

test("the first demo listings keep their ids and core facts", () => {
  const core = [
    ["demo-v2-1", "City bicycle", 145, "FMEL Triaudes · Ecublens"],
    ["demo-v2-2", "Vinyl turntable", 85, "FMEL Vortex · Chavannes"],
    ["demo-v1-1", "White work desk", 65, "FMEL Atrium · Ecublens"],
    ["demo-v1-2", "Compact study desk", 40, "FMEL Triaudes · Ecublens"],
    ["demo-v1-4", "Two-seat sofa", 180, "FMEL Ochettes · Chavannes"],
    ["demo-v1-6", "Desk lamp", 15, "EPFL · Ecublens"],
    ["demo-v1-8", "Free spare chair", 0, "Ecublens · Le Croset"],
    ["demo-v1-10", "Living room sofa", 220, "FMEL Triaudes · Ecublens"],
  ] as const;
  for (const [id, title, price, location] of core) {
    const listing = demoListings.find((item) => item.id === id);
    assert.deepEqual(
      [listing?.title, listing?.price, listing?.location],
      [title, price, location],
    );
    assert.ok(listing?.pickupPoint);
  }
});

test("the demo catalogue is varied and reads like real student listings", () => {
  assert.equal(demoListings.length, 40);
  assert.equal(new Set(demoListings.map((item) => item.id)).size, 40);
  assert.equal(new Set(demoListings.map((item) => item.image)).size, 40);
  assert.ok(demoListings.filter((item) => item.price === 0).length >= 3);
  assert.ok(demoListings.every((item) => item.price <= 400));
  assert.ok(
    demoListings.filter((item) => item.status === "reserved").length >= 3,
  );
  assert.ok(demoListings.filter((item) => item.status === "sold").length >= 1);
  assert.ok(new Set(demoListings.map((item) => item.condition)).size >= 5);
  assert.ok(new Set(demoListings.map((item) => item.location)).size >= 10);
  for (const listing of demoListings) {
    assert.doesNotMatch(
      visibleText(listing),
      /sample|demo|fictional|synthetic|pako/i,
    );
    assert.ok(demoSellers.some(({ name }) => name === listing.seller));
    assert.equal(listing.own && listing.demo, true);
  }
});

test("every listing has its own small illustration in the app palette", async () => {
  for (const listing of demoListings) {
    const svg = await readFile(
      new URL(`../public${listing.image}`, import.meta.url),
      "utf8",
    );
    assert.ok(svg.length < 8_000, `${listing.image} is small`);
    assert.match(svg, /viewBox="0 0 400 300"/);
    assert.doesNotMatch(svg, /<text|<image|href=|<script/);
    assert.equal(
      svg.match(/https?:\/\//g)?.length,
      1,
      "only the SVG namespace",
    );
  }
});
