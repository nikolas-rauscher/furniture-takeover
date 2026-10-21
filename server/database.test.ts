import { legacyCampusPickupPoints } from "../shared/campusPickupPoints.ts";
import assert from "node:assert/strict";
import { once } from "node:events";
import { mkdtempSync, rmSync } from "node:fs";
import type { AddressInfo } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";
import { demoListings, addDemoListings } from "../shared/demoListings.ts";
import type { Product } from "../shared/marketplace.ts";
import { createListingsStore } from "./database.ts";
import { createAgentServer } from "./http.ts";
import { createAgentService } from "./service.ts";

test("expanded catalog adds varied objects to an existing database without replacing edited listings", () => {
  const directory = mkdtempSync(join(tmpdir(), "takeover-catalog-upgrade-"));
  const filename = join(directory, "marketplace.sqlite");
  let store = createListingsStore(filename);
  try {
    store.seedDemo();
    const desk = demoListings.find((listing) => listing.id === "demo-v1-1")!;
    const editedDesk = {
      ...desk,
      title: "My edited desk",
      tags: ["Study desk", "Wood"],
      price: 52,
      status: "reserved" as const,
    };
    store.updateDemo([editedDesk]);
    store.close();
    const legacyDatabase = new DatabaseSync(filename);
    legacyDatabase.exec("DELETE FROM listings WHERE id LIKE 'demo-v2-%'");
    legacyDatabase.close();
    store = createListingsStore(filename);
    assert.equal(store.listDemo().length, 12);
    const upgraded = store.seedDemo();
    assert.equal(upgraded.length, demoListings.length);
    assert.deepEqual(
      upgraded.find((listing) => listing.id === editedDesk.id),
      editedDesk,
    );
    assert.deepEqual(
      upgraded.slice(0, 8).map((listing) => listing.title),
      [
        "City bicycle",
        "Vinyl turntable",
        "Espresso machine",
        "Standing floor lamp",
        "Full-length mirror",
        "Wooden sideboard",
        "Potted houseplant",
        "Over-ear headphones",
      ],
    );
    assert.equal(
      new Set(upgraded.slice(0, 8).map((listing) => listing.image)).size,
      8,
    );
    assert.deepEqual(store.seedDemo(), upgraded);
  } finally {
    store.close();
    rmSync(directory, { recursive: true, force: true });
  }
});

test("campus address migration preserves edits and never replaces a custom location", () => {
  const directory = mkdtempSync(join(tmpdir(), "takeover-campus-migration-"));
  const filename = join(directory, "marketplace.sqlite");
  const database = new DatabaseSync(filename);
  database.exec(
    "CREATE TABLE listings (id TEXT PRIMARY KEY, demo INTEGER, payload TEXT)",
  );
  const legacy = {
    ...demoListings[0],
    title: "Keep title",
    price: 19,
    location: "Lausanne",
  };
  delete legacy.pickupPoint;
  const custom = {
    ...demoListings[1],
    location: "My collection address",
    pickupPoint: legacyCampusPickupPoints[1],
  };
  const oldCampus = {
    ...demoListings[2],
    location: legacyCampusPickupPoints[2].area,
    pickupPoint: legacyCampusPickupPoints[2],
  };
  const insert = database.prepare("INSERT INTO listings VALUES (?, 1, ?)");
  insert.run(legacy.id, JSON.stringify(legacy));
  insert.run(custom.id, JSON.stringify(custom));
  insert.run(oldCampus.id, JSON.stringify(oldCampus));
  database.close();
  const store = createListingsStore(filename);
  try {
    const all = store.seedDemo();
    const updated = all.find((item) => item.id === legacy.id)!;
    assert.equal(updated.title, legacy.title);
    assert.equal(updated.price, 19);
    assert.deepEqual(updated.pickupPoint, demoListings[0].pickupPoint);
    assert.equal(updated.location, demoListings[0].location);
    assert.deepEqual(
      all.find((item) => item.id === custom.id),
      custom,
    );
    assert.deepEqual(store.seedDemo(), all);
    const saved = store.updateDemo([
      {
        ...updated,
        pickupPoint: {
          name: "Forged",
          address: "Fake",
          area: "Fake",
          sourceUrl: "https://untrusted.example",
        },
      },
    ]);
    assert.deepEqual(
      saved.find((item) => item.id === legacy.id)?.pickupPoint,
      demoListings[0].pickupPoint,
    );
  } finally {
    store.close();
    rmSync(directory, { recursive: true, force: true });
  }
});

test("stock photo migration preserves listing edits and restores verified photo provenance", () => {
  const directory = mkdtempSync(join(tmpdir(), "takeover-photo-migration-"));
  const filename = join(directory, "marketplace.sqlite");
  const database = new DatabaseSync(filename);
  database.exec(
    "CREATE TABLE listings (id TEXT PRIMARY KEY, demo INTEGER, payload TEXT)",
  );
  const seed = demoListings[0];
  const legacy = {
    ...seed,
    title: "Keep my title",
    price: 23,
    status: "reserved",
    image: "/images/catalog-bike.jpg",
  };
  delete legacy.photoSourceUrl;
  database
    .prepare("INSERT INTO listings VALUES (?, 1, ?)")
    .run(seed.id, JSON.stringify(legacy));
  database.close();
  const store = createListingsStore(filename);
  try {
    const migrated = store.seedDemo().find((item) => item.id === seed.id)!;
    assert.equal(migrated.title, legacy.title);
    assert.equal(migrated.price, 23);
    assert.equal(migrated.status, "reserved");
    assert.equal(migrated.image, seed.image);
    assert.equal(migrated.photoSourceUrl, seed.photoSourceUrl);
    assert.deepEqual(
      store.seedDemo().find((item) => item.id === seed.id),
      migrated,
    );
    const updated = store
      .updateDemo([
        {
          ...migrated,
          price: 24,
          photoSourceUrl: "https://untrusted.example/",
        },
      ])
      .find((item) => item.id === seed.id)!;
    assert.equal(updated.photoSourceUrl, seed.photoSourceUrl);
  } finally {
    store.close();
    rmSync(directory, { recursive: true, force: true });
  }
});

test("SQLite demo seed survives restart and never overwrites edited or withdrawn records", () => {
  const directory = mkdtempSync(join(tmpdir(), "takeover-listings-"));
  const filename = join(directory, "data", "marketplace.sqlite");
  let store = createListingsStore(filename);
  try {
    assert.deepEqual(store.listDemo(), []);
    assert.deepEqual(store.seedDemo(), demoListings);
    const edited = {
      ...demoListings[0],
      title: "Edited demo desk",
      price: 0,
      status: "withdrawn" as const,
    };
    const saved = store.updateDemo([edited]);
    assert.deepEqual(saved[0], edited);
    store.close();
    store = createListingsStore(filename);
    assert.deepEqual(store.listDemo(), saved);
    assert.deepEqual(store.seedDemo(), saved);
    assert.equal(store.listDemo().length, demoListings.length);
    assert.equal(
      store.listDemo().filter((item) => item.status === "sold").length,
      1,
    );
    assert.equal(
      store.listDemo().filter((item) => item.status === "reserved").length,
      1,
    );
    assert.ok(
      store
        .listDemo()
        .every((item) => item.demo && item.own && item.source === "takeover"),
    );
    assert.ok(
      store
        .listDemo()
        .every((item) => item.description.includes("Fictional demo listing")),
    );
    assert.equal(addDemoListings(saved).length, demoListings.length);
  } finally {
    store.close();
    rmSync(directory, { recursive: true, force: true });
  }
});

test("demo updates reject invalid batches atomically and cannot insert personal or external records", () => {
  const store = createListingsStore(":memory:");
  try {
    assert.throws(
      () => store.updateDemo([demoListings[0]]),
      /existing demo listing/,
    );
    const original = store.seedDemo();
    for (const invalid of [
      { id: "personal-1" },
      { id: "demo-v1-999" },
      { demo: false },
      { own: false },
      { source: "Ricardo" },
      { price: -1 },
      { price: 10_001 },
      { price: "65" },
      { price: Number.NaN },
      { title: "" },
      { title: "x".repeat(181) },
      { description: "x".repeat(4001) },
      { distance: -1 },
      { condition: null },
      { pickupBy: "2026-02-31" },
      { status: "deleted" },
      { image: "https://example.com/private.jpg" },
      { image: "data:image/png;base64,dGV4dA==" },
    ]) {
      assert.throws(() =>
        store.updateDemo([
          { ...original[0], title: "Must not be saved" },
          { ...original[1], ...invalid },
        ]),
      );
      assert.deepEqual(store.listDemo(), original);
    }
    assert.throws(() => store.updateDemo([original[0], original[0]]));
    assert.throws(() => store.updateDemo({ listings: [] }));
    assert.throws(() =>
      store.updateDemo(Array(demoListings.length + 1).fill(original[0])),
    );
    const updated = store.updateDemo([
      { ...original[0], price: 100, privateAccount: "never stored" },
    ]);
    assert.equal(updated[0].price, 100);
    assert.equal("privateAccount" in updated[0], false);
    assert.deepEqual(store.updateDemo([]), updated);
  } finally {
    store.close();
  }
});

test("HTTP serves, seeds, and updates SQLite demos without an AI key, preserving origin restrictions", async () => {
  const store = createListingsStore(":memory:");
  const server = createAgentServer(
    createAgentService({
      apiKey: "",
      baseUrl: "https://api.deepseek.com",
      model: "deepseek-flash",
    }),
    { listings: store },
  );
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  try {
    const denied = await fetch(`${base}/api/listings/demo/seed`, {
      method: "POST",
      headers: { Origin: "https://untrusted.example" },
    });
    assert.equal(denied.status, 403);
    assert.equal(store.listDemo().length, 0);
    const seeded = await fetch(`${base}/api/listings/demo/seed`, {
      method: "POST",
      headers: { Origin: "http://localhost:5173" },
    });
    assert.equal(seeded.status, 200);
    assert.equal(
      seeded.headers.get("access-control-allow-origin"),
      "http://localhost:5173",
    );
    const initial = (await seeded.json()).listings as Product[];
    assert.deepEqual(initial, demoListings);
    const changed = { ...initial[1], price: 72, status: "withdrawn" };
    const updated = await fetch(`${base}/api/listings/demo/update`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ listings: [changed] }),
    });
    assert.equal(updated.status, 200);
    const snapshot = (await updated.json()).listings;
    assert.deepEqual(snapshot[1], changed);
    assert.equal(snapshot.length, demoListings.length);
    const reloaded = await fetch(`${base}/api/listings?demo=true`);
    assert.equal(reloaded.status, 200);
    assert.deepEqual(await reloaded.json(), { listings: snapshot });
    const reseeded = await fetch(`${base}/api/listings/demo/seed`, {
      method: "POST",
    });
    assert.deepEqual(await reseeded.json(), { listings: snapshot });
    const invalid = await fetch(`${base}/api/listings/demo/update`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ listings: [{ ...initial[0], demo: false }] }),
    });
    assert.equal(invalid.status, 400);
    assert.equal((await invalid.json()).error.code, "INVALID_LISTING");
    assert.deepEqual(store.listDemo(), snapshot);
    assert.equal((await fetch(`${base}/api/listings/demo/seed`)).status, 405);
    assert.equal((await fetch(`${base}/api/listings?demo=false`)).status, 400);
  } finally {
    server.closeAllConnections();
    await new Promise<void>((resolve) => server.close(() => resolve()));
    store.close();
  }
});

test("listing galleries persist cover order across reloads and reject malformed photos atomically", () => {
  const directory = mkdtempSync(join(tmpdir(), "takeover-gallery-"));
  const filename = join(directory, "gallery.sqlite");
  let store = createListingsStore(filename);
  try {
    const item = store.seedDemo()[0];
    const images = ["/images/desk2.jpg", "/images/desk.jpg"];
    store.updateDemo([{ ...item, image: images[0], images }]);
    store.close();
    store = createListingsStore(filename);
    const saved = store.listDemo().find((row) => row.id === item.id)!;
    assert.deepEqual(saved.images, images);
    assert.equal(saved.image, images[0]);
    for (const badImages of [
      ["not an image"],
      Array(7).fill("/images/desk.jpg"),
      [null],
    ]) {
      assert.throws(() => store.updateDemo([{ ...saved, images: badImages }]));
      assert.deepEqual(
        store.listDemo().find((row) => row.id === item.id),
        saved,
      );
    }
  } finally {
    store.close();
    rmSync(directory, { recursive: true, force: true });
  }
});
