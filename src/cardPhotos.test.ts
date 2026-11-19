import assert from "node:assert/strict";
import test, { type TestContext } from "node:test";
import { cardImageFor } from "../shared/listingPhotos.ts";
import { demoListings } from "../shared/demoListings.ts";
import { withCardImages } from "./cardPhotos.ts";

const photo = (name: string) => `data:image/jpeg;base64,${btoa(name)}`;

/** A canvas whose JPEG names the photo it was drawn from, sized like a phone picture. */
function fakeCanvas(t: TestContext, encoded = (source: string) => `card:${source}`) {
  const drawn: { source: string; width: number; height: number }[] = [];
  const globals = globalThis as unknown as Record<string, unknown>;
  t.after(() => {
    delete globals.Image;
    delete globals.document;
  });
  globals.Image = class {
    src = "";
    naturalWidth = 4032;
    naturalHeight = 3024;
    async decode() {}
  };
  globals.document = {
    createElement: () => {
      const canvas = { width: 0, height: 0, source: "" };
      return Object.assign(canvas, {
        getContext: () => ({
          fillRect() {},
          drawImage(image: { src: string }) {
            canvas.source = image.src;
          },
        }),
        toDataURL: () => {
          drawn.push({ ...canvas });
          return "data:image/jpeg;base64," + btoa(encoded(canvas.source));
        },
      });
    },
  };
  return drawn;
}

test("new photos get a 640 px card copy; kept photos reuse theirs in the new order", async (t) => {
  const drawn = fakeCanvas(t);
  const listing = { ...demoListings[0], image: photo("a"), images: [photo("a"), photo("b")] };
  const saved = await withCardImages(listing);
  assert.deepEqual(drawn.map(({ width, height }) => [width, height]), [
    [640, 480],
    [640, 480],
  ]);
  assert.equal(saved.cardImages?.length, 2);
  assert.equal(cardImageFor(saved), saved.cardImages?.[0]);

  const reordered = { ...saved, image: photo("b"), images: [photo("b"), photo("a")] };
  delete reordered.cardImages;
  const edited = await withCardImages(reordered, saved);
  assert.equal(drawn.length, 2);
  assert.deepEqual(edited.cardImages, [...saved.cardImages!].reverse());
});

test("drawings and photos saved before card copies keep the full cover", async (t) => {
  const drawn = fakeCanvas(t);
  const drawing = await withCardImages(demoListings[0]);
  assert.equal(drawing.cardImages, undefined);
  assert.equal(cardImageFor(drawing), demoListings[0].image);
  const legacy = {
    ...demoListings[0],
    image: "https://photos.example/old.jpg",
    images: ["https://photos.example/old.jpg", photo("new")],
  };
  assert.equal((await withCardImages(legacy)).cardImages, undefined);
  assert.equal(drawn.length, 0);
});

test("a card copy that cannot be made fails the save with a clear message", async (t) => {
  fakeCanvas(t, () => "x".repeat(200 * 1024));
  const listing = { ...demoListings[0], image: photo("a"), images: [photo("a")] };
  await assert.rejects(withCardImages(listing), /small version of a photo/);
});
