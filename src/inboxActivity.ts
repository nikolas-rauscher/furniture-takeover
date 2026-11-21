import { pickupDay, type Deal, type DealRole } from "../shared/deal.ts";
import type { Product } from "../shared/marketplace.ts";
import type { SellerConversation } from "../shared/messages.ts";

/** A conversation in the inbox, reduced to who wrote last and when. */
export type InboxThread = {
  /** The key the student's read marker is stored under. */
  readKey: string;
  latest?: { from: "me" | "them"; at: string };
};

/** Whether the other student wrote after the student last read the thread. */
export function isUnread(
  thread: InboxThread,
  reads: Readonly<Record<string, string>>,
): boolean {
  if (thread.latest?.from !== "them") return false;
  const readUpTo = reads[thread.readKey];
  return (
    readUpTo === undefined ||
    Date.parse(thread.latest.at) > Date.parse(readUpTo)
  );
}

/** How many conversations have news for the student, for the Messages badge. */
export const unreadCount = (
  threads: readonly InboxThread[],
  reads: Readonly<Record<string, string>>,
) => threads.filter((thread) => isUnread(thread, reads)).length;

/**
 * The read marker to store once the student has seen a thread up to a
 * message: markers only move forward, so an older view saves nothing.
 */
export function nextReadMarker(
  stored: string | undefined,
  seenUpTo: string,
): string | undefined {
  return stored === undefined || Date.parse(seenUpTo) > Date.parse(stored)
    ? seenUpTo
    : undefined;
}

/** A local conversation from the student's side: in the local demo the student is the buyer. */
export function demoInboxThread(conversation: SellerConversation): InboxThread {
  const latest = conversation.messages.at(-1);
  const systemAt = conversation.systemEvents?.at(-1)?.at;
  if (
    systemAt &&
    (!latest || Date.parse(systemAt) >= Date.parse(latest.createdAt))
  ) {
    return {
      readKey: conversation.id + ":buyer",
      latest: { from: "them", at: systemAt },
    };
  }
  return {
    readKey: `${conversation.id}:buyer`,
    latest: latest && {
      from: latest.sender === "buyer" ? "me" : "them",
      at: latest.createdAt,
    },
  };
}

/** An account conversation from the signed-in student's side, by its newest message. */
export function accountInboxThread(
  conversationId: string,
  latest: { sender_id: string; created_at: string } | undefined,
  userId: string,
  event?: { sender_id: string | null; created_at: string },
): InboxThread {
  if (
    event &&
    (!latest || Date.parse(event.created_at) >= Date.parse(latest.created_at))
  ) {
    return {
      readKey: conversationId,
      latest: {
        from: event.sender_id === userId ? "me" : "them",
        at: event.created_at,
      },
    };
  }
  return {
    readKey: conversationId,
    latest: latest && {
      from: latest.sender_id === userId ? "me" : "them",
      at: latest.created_at,
    },
  };
}

/** An agreed deal reserves the listing even while its local status write is pending. */
export function effectiveStatus(
  listing: Pick<Product, "id" | "status">,
  deals: readonly Deal[],
): Product["status"] {
  return listing.status === "active" &&
    deals.some((d) => d.listingId === listing.id && d.status === "agreed")
    ? "reserved"
    : listing.status;
}
function dealActivity(deal: Deal | undefined | null, role: DealRole) {
  if (deal?.status === "agreed")
    return deal.agreed?.terms.fulfillment === "shipping"
      ? "Agreed"
      : "Pickup booked";
  if (deal?.status === "completed") return "Completed";
  if (deal?.status === "cancelled") return "Cancelled";
  if (deal?.proposal)
    return deal.proposal.by === role ? "Waiting" : "Your turn";
}

export function pickupActivity(
  deal: Deal | undefined | null,
  role: DealRole,
  now: Date,
) {
  const day = pickupDay(deal, role, now);
  const pickupSoon = day?.phase === "pickup_soon";
  const due = !!day && day.phase !== "booked";
  const needsYou =
    !day?.pickupCheck?.expired &&
    (due ||
      day?.change === "received" ||
      (role === "seller" && !!day?.buyerReportedPickup));
  return {
    pickupSoon,
    due,
    needsYou,
    label: needsYou ? ("Your turn" as const) : dealActivity(deal, role),
  };
}

/** Count an actionable pickup once, even if its thread also has an unread message. */
export function inboxBadge(
  threads: readonly InboxThread[],
  reads: Readonly<Record<string, string>>,
  pickupReadKeys: ReadonlySet<string>,
): number {
  return threads.filter(
    (thread) => isUnread(thread, reads) || pickupReadKeys.has(thread.readKey),
  ).length;
}

/** The three live deals for Home: Pako's open pickup question first, then a pickup within 2 h, a response, an upcoming handover. */
export function pickupHomeDeals(
  deals: readonly Deal[],
  roleFor: (deal: Deal) => DealRole,
  now: Date,
) {
  const scheduled = (deal: Deal) => pickupDay(deal, roleFor(deal), now);
  const isCurrent = (deal: Deal) => {
    const day = scheduled(deal);
    return day && (day.phase === "pickup_soon" || day.phase === "pickup_now");
  };
  const asksAboutPickup = (deal: Deal) => {
    const check = scheduled(deal)?.pickupCheck;
    return check && !check.expired;
  };
  const priority = (deal: Deal) =>
    asksAboutPickup(deal)
      ? -1
      : isCurrent(deal)
        ? 0
        : pickupActivity(deal, roleFor(deal), now).needsYou ||
            (deal.proposal && deal.proposal.by !== roleFor(deal))
          ? 1
          : deal.status === "agreed"
            ? 2
            : 3;
  return deals
    .filter(
      (deal) =>
        deal.status === "agreed" || (deal.status === "open" && deal.proposal),
    )
    .sort((a, b) => {
      const order = priority(a) - priority(b);
      if (order) return order;
      const aTime = a.agreed?.terms.pickupAt,
        bTime = b.agreed?.terms.pickupAt;
      if (aTime && bTime) return Date.parse(aTime) - Date.parse(bTime);
      return Date.parse(b.updatedAt) - Date.parse(a.updatedAt);
    })
    .slice(0, 3);
}
