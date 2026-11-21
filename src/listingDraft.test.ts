import test from "node:test";
import assert from "node:assert/strict";
import { demoListings } from "../shared/demoListings.ts";
import { draftFromListing, emptyDraft } from "./listingDraft.ts";

test("a new draft starts empty at the given pickup place", () => {
  const draft = emptyDraft("EPFL, Ecublens");
  assert.equal(draft.location, "EPFL, Ecublens");
  assert.equal(draft.title, "");
  assert.deepEqual(draft.images, []);
});

test("editing a listing fills the draft with what it shows", () => {
  const item = { ...demoListings[0], dimensions: "Not specified" };
  const draft = draftFromListing(item);
  assert.equal(draft.title, item.title);
  assert.equal(draft.price, String(item.price));
  assert.equal(draft.dimensions, "");
  assert.equal(draft.pickup, item.pickupBy);
  assert.equal(draft.raw, "");
});
