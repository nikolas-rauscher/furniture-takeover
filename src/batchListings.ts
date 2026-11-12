import type { PhotoGroup } from "../shared/agent";
import { MAX_LISTING_PHOTOS } from "../shared/listingPhotos.ts";
import type { ListingDraft } from "./components/SellFlow";
import { listingDraftReady } from "./listingPreparation.ts";

export type BatchItem = {
  id: string;
  /** Short name from photo sorting, shown until a draft title exists. */
  label: string;
  /** Seller notes for this item only, so a price never leaks to another listing. */
  notes: string;
  status: "sorted" | "drafting" | "ready" | "failed";
  error?: string;
  draft: ListingDraft;
};

export function batchItem(
  images: string[],
  location: string,
  label = "",
  id: string = crypto.randomUUID(),
): BatchItem {
  return {
    id,
    label,
    notes: "",
    status: "sorted",
    draft: {
      image: images[0] ?? "",
      images,
      raw: "",
      title: "",
      description: "",
      price: "",
      condition: "",
      dimensions: "",
      location,
      pickup: "",
      category: "All",
    },
  };
}

/** Turn sorted photo indices into one editable item per group. */
export function itemsFromGroups(
  photos: string[],
  groups: PhotoGroup[],
  location: string,
): BatchItem[] {
  return groups
    .map((group) =>
      batchItem(
        group.photos.map((index) => photos[index]).filter(Boolean),
        location,
        group.label,
      ),
    )
    .filter((item) => item.draft.images!.length > 0);
}

const withImages = (item: BatchItem, images: string[]): BatchItem => ({
  ...item,
  status: "sorted",
  error: undefined,
  draft: { ...item.draft, image: images[0] ?? "", images },
});

/**
 * Move a photo to another item, or to a new item when `target` is null.
 * Items left without photos disappear; a full item does not accept more.
 */
export function movePhoto(
  items: BatchItem[],
  photo: string,
  target: string | null,
  location: string,
): BatchItem[] {
  const source = items.find((item) => item.draft.images?.includes(photo));
  if (!source || source.id === target) return items;
  const destination = items.find((item) => item.id === target);
  if (
    target &&
    (!destination || destination.draft.images!.length >= MAX_LISTING_PHOTOS)
  )
    return items;
  const moved = items.flatMap((item) => {
    if (item.id === source.id) {
      const images = item.draft.images!.filter((image) => image !== photo);
      return images.length ? [withImages(item, images)] : [];
    }
    if (item.id === target)
      return [withImages(item, [...item.draft.images!, photo])];
    return [item];
  });
  return target ? moved : [...moved, batchItem([photo], location)];
}

export function removePhoto(items: BatchItem[], photo: string): BatchItem[] {
  return items.flatMap((item) => {
    if (!item.draft.images?.includes(photo)) return [item];
    const images = item.draft.images.filter((image) => image !== photo);
    return images.length ? [withImages(item, images)] : [];
  });
}

/**
 * Items with all required details can be saved; a failed draft counts once the
 * seller filled it in by hand. The rest stay for review.
 */
export function readyItems(items: BatchItem[]): BatchItem[] {
  return items.filter(
    (item) =>
      (item.status === "ready" || item.status === "failed") &&
      listingDraftReady(item.draft),
  );
}

export function missingDetails(draft: ListingDraft): string[] {
  const price = Number(draft.price);
  return [
    !draft.title.trim() && "title",
    !draft.description.trim() && "description",
    (!draft.price.trim() ||
      !Number.isFinite(price) ||
      price < 0 ||
      price > 10000) &&
      "price",
    !draft.location.trim() && "pickup location",
  ].filter((value): value is string => Boolean(value));
}
