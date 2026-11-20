import type { Product } from "../shared/marketplace.ts";

type ListingStatus = Product["status"];

/** What changing a listing's status tells the seller. */
export const STATUS_NOTICES: Record<ListingStatus, string> = {
  active: "Listing is available again.",
  reserved: "Marked as reserved.",
  sold: "Marked as sold.",
  withdrawn: "Listing archived. You can restore it from Archive.",
};

/** What a failed status change tells the seller, naming the change that did not save. */
const STATUS_FAILURES: Record<ListingStatus, string> = {
  active: "Couldn't make the listing available.",
  reserved: "Couldn't mark the listing as reserved.",
  sold: "Couldn't mark the listing as sold.",
  withdrawn: "Couldn't archive the listing.",
};

export const statusFailure = (status: ListingStatus) =>
  `${STATUS_FAILURES[status]} Check your browser storage and try again.`;
