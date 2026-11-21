import { useRef } from "react";
import { useMarketplaceData } from "../marketplaceData";
import { cancelDealMessage, shippedMessage } from "../../shared/dealMessages";
import type { Product } from "../../shared/marketplace";
import {
  listingPickupChoices,
  type ListingPickupChoice,
  type PickupSend,
} from "../pickupOptions";
import type { InboxDeal } from "../inboxDeals";
import { PendingMessage } from "../pendingMessage";

/**
 * A seller's pickup action from My listings, the same one the pickup card
 * sends: it goes to the deal's conversation with its exact message, and a
 * retry of the same text reuses its id.
 */
export function useListingPickup(onSent: () => void) {
  const api = useMarketplaceData().deals;
  const pending = useRef(new PendingMessage());
  return async (item: InboxDeal, { action, message }: PickupSend) => {
    const id = pending.current.idFor(item.threadId, "seller", message);
    try {
      await api.pickup(
        { conversationId: item.threadId, role: "seller" },
        {
          action,
          text: message,
          expectedVersion: item.deal.version,
          messageId: id,
        },
      );
    } catch (failure) {
      throw failure instanceof TypeError
        ? new Error("No connection, so nothing was sent. Try again.")
        : failure;
    }
    pending.current.acknowledge(id);
    onSent();
  };
}

export function pickupConfirmation(
  other: string,
  choice: ListingPickupChoice,
  send: (message: PickupSend) => Promise<void>,
) {
  return {
    other,
    question: choice.confirm,
    message: choice.send.message,
    label: choice.label,
    primary: choice.id === "picked_up",
    send: () => send(choice.send),
  };
}

/** Confirm a status change using the agreement that is current when the seller taps. */
export function useListingStatusConfirmation() {
  const api = useMarketplaceData().deals;
  const pending = useRef(new PendingMessage());

  function cancelDeal(other: string, send: (message: string) => Promise<void>) {
    const message = cancelDealMessage();
    return {
      other,
      message,
      label: "Cancel deal",
      question: `Cancel the deal with ${other}?`,
      send: () => send(message),
    };
  }

  function markShipped(
    other: string,
    title: string,
    send: (message: string) => Promise<void>,
  ) {
    const message = shippedMessage();
    return {
      other,
      message,
      label: "Mark shipped",
      question: `Mark the ${title} as shipped to ${other}?`,
      primary: true,
      send: () => send(message),
    };
  }

  return async function confirmStatus(
    item: Product,
    status: Product["status"],
    knownAgreement: boolean,
    onStatusChange: (status: Product["status"]) => void,
  ) {
    const agreement = await api.listingAgreement(item, knownAgreement);
    if (!agreement) return;
    const { threadId, other, pickup, completeShipping } = agreement;
    const sendOnce =
      (
        act: (
          text: string,
          id: string,
        ) => Promise<Product["status"] | undefined>,
      ) =>
      async (text: string) => {
        const id = pending.current.idFor(threadId, "seller", text);
        const result = await act(text, id);
        pending.current.acknowledge(id);
        if (result) onStatusChange(result);
      };
    if (status === "sold" && completeShipping)
      return markShipped(other, item.title, sendOnce(completeShipping));
    if (!pickup) return cancelDeal(other, sendOnce(agreement.cancel));
    const { sold, reopen } = listingPickupChoices({
      day: pickup.day,
      deal: pickup.deal,
      other,
      title: item.title,
    });
    const choice = status === "sold" ? sold : reopen;
    return pickupConfirmation(other, choice, async ({ action, message }) => {
      const id = pending.current.idFor(threadId, "seller", message);
      const result = await pickup.send(action, message, id);
      pending.current.acknowledge(id);
      if (result) onStatusChange(result);
    });
  };
}
