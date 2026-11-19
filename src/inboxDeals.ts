import type { Deal, DealRole } from "../shared/deal.ts";
import type { SellerConversation } from "../shared/messages.ts";
import type { InboxRows } from "./cloud/accountInbox.ts";

/** A deal in the student's inbox: the side they play, its listing, its thread and the other student. */
export type InboxDeal = {
  deal: Deal;
  role: DealRole;
  listingId: string;
  /** The conversation the deal belongs to. */
  threadId: string;
  otherName: string;
};

/** The local workspace's deals; the student plays the buyer in every local thread. */
export function demoInboxDeals(
  conversations: readonly SellerConversation[],
): InboxDeal[] {
  return conversations.flatMap((conversation) =>
    conversation.deal && !conversation.buyerKey
      ? [
          {
            deal: conversation.deal,
            role: "buyer" as const,
            listingId: conversation.listingId,
            threadId: conversation.id,
            otherName: conversation.seller,
          },
        ]
      : [],
  );
}

/**
 * An account's deals from its inbox, each from the signed-in student's side.
 * A student without a profile name is called by their side, as in the inbox.
 */
export function accountInboxDeals(
  rows: Pick<InboxRows, "threads" | "deals" | "names">,
  userId: string,
): InboxDeal[] {
  return rows.threads.flatMap((thread) => {
    const deal = rows.deals?.[thread.id];
    if (!deal) return [];
    const role: DealRole = thread.seller_id === userId ? "seller" : "buyer";
    const other = role === "seller" ? thread.buyer_id : thread.seller_id;
    return [
      {
        deal,
        role,
        listingId: thread.listing_id,
        threadId: thread.id,
        otherName:
          rows.names[other] || (role === "seller" ? "Buyer" : "Seller"),
      },
    ];
  });
}

/** The deal a buyer has on a listing they asked about, if any. */
export const buyerDealFor = (deals: readonly InboxDeal[], listingId: string) =>
  deals.find((item) => item.role === "buyer" && item.listingId === listingId);

/** The agreed deal reserving one of the student's own listings for a buyer, if any. */
export const sellerAgreementFor = (
  deals: readonly InboxDeal[],
  listingId: string,
) =>
  deals.find(
    (item) =>
      item.role === "seller" &&
      item.listingId === listingId &&
      item.deal.status === "agreed",
  );

/** The listings reserved for the student as the buyer. */
export const reservedForMe = (deals: readonly InboxDeal[]) =>
  new Set(
    deals
      .filter((item) => item.role === "buyer" && item.deal.status === "agreed")
      .map((item) => item.listingId),
  );

/** The newest of a few instants, for a read marker that covers messages and news alike. */
export function newestAt(
  times: readonly (string | undefined)[],
): string | undefined {
  return times.reduce<string | undefined>(
    (newest, at) =>
      at && (!newest || Date.parse(at) > Date.parse(newest)) ? at : newest,
    undefined,
  );
}
