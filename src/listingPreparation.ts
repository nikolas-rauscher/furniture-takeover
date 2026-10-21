import type { AgentMetadata } from "../shared/agent";
import type { ListingDraft } from "./components/SellFlow";

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
      placeholder: "Width × depth × height in cm",
    };
  return draft.dimensions
    ? { label: "Measurements", placeholder: "Size or measurements" }
    : null;
}
