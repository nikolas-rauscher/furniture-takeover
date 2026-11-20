import type { ReactNode } from "react";
import type { DealTerms } from "../../shared/deal";
import type { SellerConversation } from "../../shared/messages";
import type { Product } from "../../shared/marketplace";
import type { InboxView } from "../api/inbox";
import type { DealStatusChange } from "./ThreadDeal";
import type { PakoReading } from "./ThreadPako";

/** What both inboxes take from the app. */
export type MessagesProps = {
  /** Enables local role previews only; account inboxes always use real identity. */
  developerMode?: boolean;
  onDeleted?: (id: string) => void;
  /** Feature-flagged availability prototype shown above the open thread. */
  threadBanner?: (thread: {
    listingId: string;
    role: "buyer" | "seller";
    onConversation: (conversation: SellerConversation) => void;
  }) => ReactNode;
  listingId?: string;
  listing?: Product;
  listings: Product[];
  onOpenListing: (id: string) => void;
  /** Leads from an empty inbox to the listings, where conversations start. */
  onBrowse: () => void;
  /** A message the app prepared for the listing's thread: the opening offer, or a follow-up. */
  initialMessage?: string;
  /** The terms the opening offer states; they travel with it while its text states them. */
  initialTerms?: DealTerms;
  /** Changes each time the student asks for the offer card from a listing. */
  offerRequest?: number;
  /** The campus meeting point near where the student searches from. */
  homePoint?: string;
  /** Applies a listing status a deal change brought, through the app's one status path. */
  onListingStatus: (
    listingId: string,
    status: DealStatusChange,
  ) => Promise<void>;
  onBeforeSend?: (listingId: string, role: "buyer" | "seller") => void;
  onSent?: (
    listingId: string,
    role: "buyer" | "seller",
    message: string,
  ) => void;
  pako: PakoReading;
};
/**
 * A conversation the app asks Messages to open, with a message it prepared
 * there, such as a follow-up; each tap is a new request.
 */
export type ThreadRequest = { id: string; draft?: string };
/**
 * A released item offered to the next buyer: their thread opens with Pako's
 * message, and Send records it as offered again.
 */
export type OfferAgain = {
  threadKey: string;
  releasedConversationId: string;
  draft: string;
};
/** The inbox the app runs: local, signed in, or waiting for a sign-in. */
export type MessagesPageProps = MessagesProps &
  InboxView & {
    /** A conversation to open by itself, such as a seller's deal from Home. */
    threadRequest?: ThreadRequest;
  };
