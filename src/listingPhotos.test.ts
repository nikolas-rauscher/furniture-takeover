import test from "node:test";
import assert from "node:assert/strict";
import {
  listingPhotos,
  MAX_ORIGINAL_PHOTO_BYTES,
  MAX_STORED_PHOTO_BYTES,
} from "../shared/listingPhotos.ts";
import { isProducts } from "./hooks/savedState.ts";
import { demoListings } from "../shared/demoListings.ts";
import { readListingPhoto } from "./listingPhotos.ts";
import { validateRequest } from "../server/validation.ts";

function jpeg(size: number) {
  const bytes = Buffer.alloc(size);
  bytes.set([0xff, 0xd8, 0xff]);
  return "data:image/jpeg;base64," + bytes.toString("base64");
}

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

test("a 6 MB phone photo is resized until its JPEG fits the server limit", async (t) => {
  const oversized = jpeg(MAX_STORED_PHOTO_BYTES + 1);
  const exact = jpeg(MAX_STORED_PHOTO_BYTES);
  const attempts = [oversized, exact];
  t.after(() => {
    Reflect.deleteProperty(globalThis, "Image");
    Reflect.deleteProperty(globalThis, "document");
  });
  Object.assign(globalThis, {
    Image: class {
      naturalWidth = 4000;
      naturalHeight = 3000;
      async decode() {}
    },
    document: {
      createElement: () => ({
        getContext: () => ({ fillRect() {}, drawImage() {} }),
        toDataURL: () => attempts.shift(),
      }),
    },
  });
  const file = new File([Buffer.alloc(6 * 1024 * 1024)], "phone.jpg", {
    type: "image/jpeg",
  });
  const image = await readListingPhoto(file, new AbortController().signal);
  assert.equal(image, exact);
  assert.equal(
    validateRequest({ intent: "listing", image, text: "" }).image,
    exact,
  );
  assert.throws(
    () => validateRequest({ intent: "listing", image: oversized, text: "" }),
    /256 KB/,
  );
});

test("oversized originals are rejected before decoding", async () => {
  const file = new File([], "huge.jpg", { type: "image/jpeg" });
  Object.defineProperty(file, "size", { value: MAX_ORIGINAL_PHOTO_BYTES + 1 });
  await assert.rejects(
    readListingPhoto(file, new AbortController().signal),
    /25 MB/,
  );
});
