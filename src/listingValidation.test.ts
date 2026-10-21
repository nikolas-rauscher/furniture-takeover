import assert from "node:assert/strict";
import test from "node:test";
import type { Product } from "../shared/marketplace.ts";
import {
  listingPickupMinimum,
  validListingPickup,
} from "./listingValidation.ts";

const today = "2026-10-12";
const sold = { status: "sold", pickupBy: "2026-10-01" } as Product;

test("editing a sold listing preserves its unchanged historical pickup date", () => {
  assert.equal(validListingPickup("2026-10-01", sold, today), true);
  assert.equal(listingPickupMinimum("2026-10-01", sold, today), "2026-10-01");
});

test("a historical exemption cannot introduce a different past date", () => {
  assert.equal(validListingPickup("2026-10-02", sold, today), false);
  assert.equal(listingPickupMinimum("2026-10-02", sold, today), today);
  assert.equal(validListingPickup("2026-09-30", sold, today), false);
  assert.equal(
    validListingPickup(
      "2026-02-30",
      { ...sold, pickupBy: "2026-02-30" },
      today,
    ),
    false,
  );
});

test("active, reserved and new listings still require today or later, or flexible pickup", () => {
  for (const original of [
    undefined,
    { ...sold, status: "active" as const },
    { ...sold, status: "reserved" as const },
  ]) {
    assert.equal(validListingPickup("2026-10-01", original, today), false);
    assert.equal(listingPickupMinimum("2026-10-01", original, today), today);
    assert.equal(validListingPickup(today, original, today), true);
    assert.equal(validListingPickup("2026-10-13", original, today), true);
    assert.equal(validListingPickup("", original, today), true);
  }
});
