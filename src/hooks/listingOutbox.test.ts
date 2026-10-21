import test from "node:test";
import assert from "node:assert/strict";
import { ListingOutbox } from "./listingOutbox.ts";
import { demoListings } from "../../shared/demoListings.ts";

function storage() {
  const data = new Map<string, string>();
  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => {
      data.set(key, value);
    },
  };
}

test("failed database writes survive reload and override stale database rows", () => {
  const disk = storage();
  const original = demoListings[0];
  const edited = { ...original, price: 123, title: "My edited desk" };
  const personal = { ...original, id: "personal", demo: false };
  const firstVisit = new ListingOutbox(disk, "pending");
  firstVisit.stage([edited, personal]);
  const nextVisit = new ListingOutbox(disk, "pending");
  assert.deepEqual(nextVisit.pending(), [edited]);
  assert.deepEqual(nextVisit.merge([original], [personal]), [personal, edited]);
  nextVisit.acknowledge(edited);
  assert.deepEqual(new ListingOutbox(disk, "pending").pending(), []);
});

test("an older write response cannot remove a newer queued edit", () => {
  const disk = storage();
  const original = demoListings[0];
  const first = { ...original, price: 101 };
  const second = { ...original, price: 102 };
  const outbox = new ListingOutbox(disk, "pending");
  outbox.stage([first]);
  outbox.stage([second]);
  outbox.acknowledge(first);
  assert.deepEqual(new ListingOutbox(disk, "pending").pending(), [second]);
  outbox.acknowledge(second);
  assert.deepEqual(outbox.pending(), []);
});

test("storage failure leaves the existing durable journal recoverable", () => {
  const disk = storage();
  const original = demoListings[0];
  const outbox = new ListingOutbox(disk, "pending");
  outbox.stage([original]);
  const failing = new ListingOutbox(
    {
      ...disk,
      setItem: () => {
        throw new Error("Quota exceeded");
      },
    },
    "pending",
  );
  assert.throws(() => failing.stage([{ ...original, price: 999 }]));
  assert.deepEqual(failing.pending(), [original]);
  assert.deepEqual(new ListingOutbox(disk, "pending").pending(), [original]);
});

test("a missing server row does not silently delete pending changes", () => {
  const outbox = new ListingOutbox(storage(), "pending");
  outbox.stage([demoListings[0]]);
  assert.deepEqual(outbox.merge([], []), [demoListings[0]]);
});
