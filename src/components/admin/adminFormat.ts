import type {
  AdminInput,
  AdminListing,
  ModerationAction,
} from "../../../shared/admin.ts";
import { campusPickupPoints } from "../../../shared/campusPickupPoints.ts";
import { plainPrice, priceText } from "../../priceText.ts";

export type ListingStatus = AdminListing["status"];
export type EditableStatus = Exclude<ListingStatus, "withdrawn">;
export type ListingInput = AdminInput<"save_demo_listing">;
/** What the listing filter shows: every listing, one status, or the hidden ones. */
export type StatusFilter = "all" | ListingStatus | "hidden";

export const statusLabels: Record<ListingStatus, string> = {
  active: "Active",
  reserved: "Reserved",
  sold: "Sold",
  withdrawn: "Withdrawn",
};
export const editableStatuses: readonly EditableStatus[] = [
  "active",
  "reserved",
  "sold",
];

const actionLabels: Record<ModerationAction, string> = {
  hide_listing: "Hid a listing",
  restore_listing: "Restored a listing",
  block_student: "Blocked a student",
  unblock_student: "Unblocked a student",
  resolve_report: "Resolved a report",
  reset_demo: "Reset the demo",
};

export const moderationActionLabel = (action: ModerationAction) =>
  actionLabels[action];

/** The actor of a moderation entry: Developer mode in the demo, a short account ID otherwise. */
export function actorName(adminId: string) {
  return adminId === "demo-developer"
    ? "Developer mode"
    : `Admin ${adminId.slice(0, 8)}`;
}

export function matchesFilter(
  listing: AdminListing,
  {
    query,
    sellerId,
    status,
  }: { query: string; sellerId: string; status: StatusFilter },
) {
  const words = query.trim().toLowerCase();
  if (words && !listing.title.toLowerCase().includes(words)) return false;
  if (sellerId && listing.sellerId !== sellerId) return false;
  if (status === "all") return true;
  if (status === "hidden") return listing.hidden;
  return listing.status === status;
}

/** Each campus area once, in the order of the meeting points. */
export const placeOptions: readonly string[] = [
  ...new Set(campusPickupPoints.map(({ area }) => area)),
];

export function placeOfMeetingPoint(name: string) {
  return campusPickupPoints.find((point) => point.name === name)?.area;
}

/** The editor's fields as the student types them: the price stays text until saving. */
export type ListingDraft = Omit<ListingInput, "id" | "price" | "status"> & {
  id?: string;
  price: string;
  status: ListingStatus;
};

export function draftOf(listing: AdminListing): ListingDraft {
  return {
    id: listing.id,
    sellerId: listing.sellerId,
    title: listing.title,
    description: listing.description,
    price: priceText(listing.price),
    condition: listing.condition,
    location: listing.location,
    meetingPoint: listing.meetingPoint,
    pickup: listing.pickup,
    pickupBy: listing.pickupBy,
    status: listing.status,
    image: listing.image,
  };
}

export function newDraft(sellerId: string, image: string): ListingDraft {
  return {
    sellerId,
    title: "",
    description: "",
    price: "",
    condition: "Good",
    location: placeOptions[0],
    meetingPoint: "",
    pickup: "",
    pickupBy: "",
    status: "active",
    image,
  };
}

/** Why the draft cannot be saved yet, or the input to save. */
export function listingInput(
  draft: ListingDraft,
): { problem: string } | { input: ListingInput } {
  if (!draft.title.trim()) return { problem: "Add a title." };
  const price = Number(plainPrice(draft.price));
  if (!draft.price.trim() || !Number.isFinite(price) || price < 0)
    return { problem: "Enter a price in CHF, 0 for free." };
  if (draft.status === "withdrawn")
    return { problem: "Choose active, reserved or sold." };
  return {
    input: {
      ...draft,
      price: Math.round(price * 100) / 100,
      status: draft.status,
    },
  };
}

export function shortDate(at: string) {
  return new Date(at).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}
