import { cardImageFor, listingPhotos } from "../../../shared/listingPhotos";
import type { Product } from "../../../shared/marketplace";
import type { TourScene } from "../device/sceneMessages";
import { DESK, NEARBY, SEARCH_RESULTS } from "./findScript";
import { PHOTO } from "./sellScript";

/** The drawing of Léa's earlier conversation in the Deal scene's inbox. */
export const EARLIER_LAMP = "/samples/desk-lamp.svg";

const drawingsOf = (listings: readonly Product[]) =>
  listings.flatMap((listing) => [
    cardImageFor(listing),
    ...listingPhotos(listing),
  ]);

/** Every drawing a scene shows, loaded before it starts so none appears late. */
export const SCENE_IMAGES: Record<TourScene, string[]> = {
  find: drawingsOf([...NEARBY, ...SEARCH_RESULTS]),
  sell: [PHOTO, ...drawingsOf([DESK])],
  deal: [EARLIER_LAMP, ...drawingsOf([DESK])],
};

async function loadImage(url: string) {
  const image = new Image();
  image.src = url;
  try {
    await image.decode();
  } catch (cause) {
    throw new Error(`The scene's image ${url} did not load.`, { cause });
  }
}

/** Loads and decodes the images, each once. */
export async function preloadImages(urls: readonly string[]) {
  await Promise.all([...new Set(urls)].map(loadImage));
}
