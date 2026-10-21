import test from "node:test";
import assert from "node:assert/strict";
import { listingPhotos } from "../shared/listingPhotos.ts";
import { isProducts } from "./hooks/savedState.ts";
import { demoListings } from "../shared/demoListings.ts";

test("legacy photos and reordered galleries survive local persistence", () => {
  const legacy = demoListings[0];
  assert.deepEqual(listingPhotos(legacy), [legacy.image]);
  const item = {
    ...legacy,
    image: "/images/desk2.jpg",
    images: ["/images/desk2.jpg", "/images/desk.jpg"],
  };
  const saved = JSON.parse(JSON.stringify([item]));
  assert.equal(isProducts(saved), true);
  assert.deepEqual(listingPhotos(saved[0]), item.images);
  assert.deepEqual(
    listingPhotos({ image: "cover", images: ["other", "cover"] }),
    ["cover", "other"],
  );
  assert.equal(isProducts([{ ...item, images: [null] }]), false);
  assert.equal(
    isProducts([{ ...item, images: Array(7).fill("photo") }]),
    false,
  );
});
