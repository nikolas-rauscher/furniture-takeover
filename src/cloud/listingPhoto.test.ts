import test from "node:test";
import assert from "node:assert/strict";
import { listingPhotoBlob } from "./listingPhoto.ts";

test("listing photos decode without network access under a strict CSP", async (t) => {
  const original = globalThis.fetch;
  t.after(() => {
    globalThis.fetch = original;
  });
  globalThis.fetch = async () => {
    throw new Error("Blocked by connect-src");
  };
  for (const type of ["jpeg", "png", "webp"]) {
    const photo = listingPhotoBlob(`data:image/${type};base64,AAH/gA==`);
    assert.equal(photo.type, `image/${type}`);
    assert.deepEqual(
      [...new Uint8Array(await photo.arrayBuffer())],
      [0, 1, 255, 128],
    );
  }
});

test("unreadable and unsupported photo data fails before upload", () => {
  for (const image of [
    "",
    "https://example.com/photo.jpg",
    "data:text/html;base64,YQ==",
    "data:image/svg+xml;base64,YQ==",
    "data:image/jpeg;base64,",
    "data:image/jpeg;base64,a",
  ]) {
    assert.throws(() => listingPhotoBlob(image), /add it again/);
  }
});
