import { pickupDay, type Deal } from "../../shared/deal";
import type { Product } from "../../shared/marketplace";
import type { ListingPickup } from "../components/AccountPage";
import {
  agreedWords,
  awayPhase,
  dealView,
  pickupCountdown,
  reservedForChip,
} from "../dealWords";
import { effectiveStatus, pickupHomeDeals } from "../inboxActivity";
import {
  buyerDealFor,
  reservedForMe,
  sellerAgreementFor,
  type InboxDeal,
} from "../inboxDeals";
import { listingPickupChoices } from "../pickupOptions";
import { useDealCheers } from "./useDealCheers";
import { useListingPickup } from "./useListingPickup";
import type { useMessagesInbox } from "./useMessagesInbox";
import { usePickupReminders } from "./usePickupReminders";
import type { Toasts } from "./useToast";

export type InboxDeals = ReturnType<typeof useInboxDeals>;

/**
 * The student's deals, each from their side, as Home, listings and
 * reminders show them; Pako cheers an agreement and reminds of a pickup.
 */
export function useInboxDeals({
  messages,
  own,
  listingsReady,
  elsewhere,
  toast,
  reloadListings,
  openDeal,
}: {
  messages: ReturnType<typeof useMessagesInbox>;
  own: Product[];
  listingsReady: boolean;
  /** Messages is not on screen, so news needs a note. */
  elsewhere: boolean;
  toast: Toasts;
  reloadListings: () => void;
  openDeal: (item: InboxDeal, message?: string) => void;
}) {
  const deals = messages.items;
  const byThread = new Map(
    deals.map((item) => [item.deal.conversationId, item]),
  );
  function inboxDealOf(deal: Deal): InboxDeal {
    const item = byThread.get(deal.conversationId);
    if (!item)
      throw new Error(`Deal ${deal.conversationId} is not in the inbox.`);
    return item;
  }
  const loaded = listingsReady && messages.loaded;
  const listingOf = (item: InboxDeal) =>
    own.find((entry) => entry.id === item.listingId);
  /** The other student confirmed while this one was elsewhere in the app: Pako cheers, with a way to the chat. */
  function cheerAgreement(item: InboxDeal) {
    const listing = listingOf(item);
    // A deal whose listing is gone has no reservation left to cheer about.
    if (!listing) return;
    const { cheer, meaning } = agreedWords(
      item.role,
      item.otherName,
      listing.title,
    );
    toast.show({
      message: `${cheer} ${meaning}`,
      mood: "cheer",
      action: {
        label: "Open conversation",
        description: `Open the conversation about ${listing.title}`,
        onClick: () => openDeal(item),
      },
    });
  }
  /** 2 h before a booked pickup: Pako reminds the student once, with a way to the chat. */
  function remindPickup(item: InboxDeal) {
    const listing = listingOf(item);
    const day = pickupDay(item.deal, item.role, messages.now);
    if (!listing || !day) return;
    toast.show({
      message: `${pickupCountdown(day)}: the ${listing.title} with ${item.otherName}.`,
      mood: "wave",
      action: {
        label: "Open conversation",
        description: `Open the conversation about ${listing.title}`,
        onClick: () => openDeal(item),
      },
    });
  }
  // An agreement that arrives while the student is elsewhere in the app gets Pako's cheer.
  useDealCheers({
    inbox: messages.scope,
    deals,
    loaded,
    elsewhere,
    onCheer: cheerAgreement,
  });
  usePickupReminders({
    deals,
    loaded,
    elsewhere,
    now: messages.now,
    onRemind: remindPickup,
  });
  const sendListingPickup = useListingPickup(() => {
    reloadListings();
    void messages.refresh();
  });
  /** Mark sold and Make active on a listing with a booked pickup send its pickup actions. */
  function listingPickup(item: InboxDeal): ListingPickup | undefined {
    const listing = listingOf(item);
    const day = pickupDay(item.deal, "seller", messages.now);
    if (!listing || !day) return undefined;
    const other = item.otherName;
    return {
      other,
      ...listingPickupChoices({
        day,
        deal: item.deal,
        other,
        title: listing.title,
      }),
      onSend: (send) => sendListingPickup(item, send),
    };
  }
  /** A listing as students see it: an agreed deal reserves it while its own status catches up. */
  const shownListing = (item: Product): Product => ({
    ...item,
    status: effectiveStatus(item, messages.deals),
  });
  /** Home's live deals: a pickup within 2 h first, then what waits for the student. */
  const homeDeals = pickupHomeDeals(
    deals.map((item) => item.deal),
    (deal) => inboxDealOf(deal).role,
    messages.now,
  ).flatMap((deal) => {
    const item = inboxDealOf(deal);
    const listing = listingOf(item);
    if (!listing) return [];
    const away = {
      deal,
      role: item.role,
      listing: shownListing(listing),
      latest: item.latest,
      now: messages.now,
    };
    const view = dealView({ ...away, other: item.otherName });
    return view
      ? [{ item, listing, view, waited: awayPhase(away) === "no_answer" }]
      : [];
  });

  return {
    shownListing,
    reservedForMe: reservedForMe(deals),
    homeDeals,
    /** The student's own deal on a listing they buy. */
    buyerDeal(listing: Product | undefined) {
      const item = listing && buyerDealFor(deals, listing.id);
      if (!listing || !item) return undefined;
      const view = dealView({
        deal: item.deal,
        role: "buyer",
        other: item.otherName,
        listing: shownListing(listing),
        now: new Date(),
      });
      return { item, view: view ?? undefined };
    },
    /** A seller's agreed buyer on one of their listings, with its pickup actions. */
    agreementFor(listingId: string) {
      const agreement = sellerAgreementFor(deals, listingId);
      const agreed = agreement?.deal.agreed;
      return agreement && agreed
        ? {
            chip: reservedForChip(agreement.otherName, agreed.terms),
            onOpenChat: () => openDeal(agreement),
            pickup: listingPickup(agreement),
          }
        : undefined;
    },
  };
}
