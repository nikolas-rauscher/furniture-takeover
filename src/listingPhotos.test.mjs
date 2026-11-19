import assert from "node:assert/strict";
import test from "node:test";
import { readListingPhoto } from "./listingPhotos.ts";
import { MAX_ORIGINAL_PHOTO_BYTES, MAX_STORED_PHOTO_BYTES } from "../shared/listingPhotos.ts";
import { validateRequest } from "../server/validation.ts";

function jpeg(size) {
  const bytes = Buffer.alloc(size);
  bytes.set([0xff, 0xd8, 0xff]);
  return "data:image/jpeg;base64," + bytes.toString("base64");
}

test("a 6 MB phone photo is resized until its JPEG fits the server limit", async (t) => {
  const oversized = jpeg(MAX_STORED_PHOTO_BYTES + 1);
  const exact = jpeg(MAX_STORED_PHOTO_BYTES);
  const attempts = [oversized, exact];
  t.after(() => {
    delete globalThis.Image;
    delete globalThis.document;
  });
  globalThis.Image = class {
    naturalWidth = 4000;
    naturalHeight = 3000;
    async decode() {}
  };
  globalThis.document = { createElement: () => ({
    getContext: () => ({ fillRect() {}, drawImage() {} }),
    toDataURL: () => attempts.shift(),
  }) };
  const file = new File([Buffer.alloc(6 * 1024 * 1024)], "phone.jpg", { type: "image/jpeg" });
  const image = await readListingPhoto(file, new AbortController().signal);
  assert.equal(image, exact);
  assert.equal(validateRequest({ intent: "listing", image, text: "" }).image, exact);
  assert.throws(() => validateRequest({ intent: "listing", image: oversized, text: "" }), /256 KB/);
});

test("oversized originals are rejected before decoding", async () => {
  const file = { type: "image/jpeg", size: MAX_ORIGINAL_PHOTO_BYTES + 1 };
  await assert.rejects(readListingPhoto(file, new AbortController().signal), /25 MB/);
});
