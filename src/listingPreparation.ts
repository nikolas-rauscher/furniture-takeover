import type { AgentMetadata } from "../shared/agent";
import { listingPhotos } from "../shared/listingPhotos.ts";
import { shortDate, type Product } from "../shared/marketplace.ts";
import type { ListingDraft } from "./components/SellFlow";
import { validListingPickup } from "./listingValidation.ts";

/** Keep grounded model facts intact when moving from photo analysis to review. */
export function prepareListingDraft(
  current: ListingDraft,
  metadata: AgentMetadata,
): ListingDraft {
  return {
    ...current,
    title: metadata.title?.trim() || current.title,
    tags: metadata.keywords
      .map((word) => word.trim().slice(0, 40))
      .filter(Boolean)
      .slice(0, 3),
    description:
      metadata.description?.trim() || current.description || current.raw,
    price: metadata.price == null ? current.price : String(metadata.price),
    condition: metadata.condition?.trim() || current.condition,
    dimensions: metadata.dimensions?.trim() || current.dimensions,
    pickup: metadata.pickupBy || current.pickup,
    location: metadata.location?.trim() || current.location,
    category: "All",
  };
}

/** Measurements are useful for fit-dependent items, rather than every listing. */
export function listingMeasurementField(
  draft: Pick<ListingDraft, "title" | "tags" | "dimensions">,
) {
  const identity = [draft.title, ...(draft.tags ?? [])].join(" ");
  if (/\b(bicycle|bike|vélo|fahrrad)\b/i.test(identity))
    return { label: "Frame size", placeholder: "For example: 54 cm or size M" };
  if (
    /\b(shirt|jacket|coat|shoes|dress|trousers|jeans|clothing)\b/i.test(
      identity,
    )
  )
    return { label: "Size", placeholder: "For example: M or EU 42" };
  if (
    /\b(desk|table|sofa|bed|wardrobe|cabinet|shelf|shelves|sideboard|armchair|chair|mirror|rug)\b/i.test(
      identity,
    )
  )
    return {
      label: "Measurements",
      placeholder:
        "Width × depth × height in cm (largest piece if disassembled)",
    };
  return draft.dimensions
    ? { label: "Measurements", placeholder: "Size or measurements" }
    : null;
}

/** Everything a draft needs before it can be saved as a listing. */
export function listingDraftReady(draft: ListingDraft, original?: Product) {
  const price = Number(draft.price);
  return Boolean(
    draft.image &&
    draft.title.trim() &&
    draft.description.trim() &&
    draft.price.trim() &&
    Number.isFinite(price) &&
    price >= 0 &&
    price <= 10000 &&
    draft.location.trim() &&
    validListingPickup(draft.pickup, original),
  );
}

/** Build the stored listing; an edited listing keeps provenance that still applies. */
export function listingFromDraft(
  draft: ListingDraft,
  id: string,
  original?: Product,
): Product {
  return {
    id,
    title: draft.title.trim(),
    description: draft.description.trim(),
    tags: draft.tags,
    price: Number(draft.price),
    image: draft.image,
    images: listingPhotos(draft),
    category: "All",
    location: draft.location.trim(),
    distance: 0,
    condition: draft.condition,
    dimensions: draft.dimensions.trim() || "Not specified",
    source: "takeover",
    seller: "You",
    initials: "Y",
    own: true,
    demo: original?.demo,
    pickupPoint:
      draft.location.trim() === original?.location
        ? original?.pickupPoint
        : undefined,
    photoSourceUrl:
      draft.image === original?.image ? original?.photoSourceUrl : undefined,
    pickupBy: draft.pickup,
    available: draft.pickup
      ? "Pickup by " + shortDate(draft.pickup)
      : "Flexible pickup",
    status: original?.status || "active",
  };
}
