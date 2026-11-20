import type { DealListing } from "../api/deals";
import { useMarketplaceData } from "../marketplaceData";
import type { DealRole, DealAction, PickupAction } from "../../shared/deal";
import type { DemoInbox } from "../api/inbox";
export function useDemoDeal(
  inbox: DemoInbox,
  listing: DealListing | undefined,
  role: DealRole,
) {
  const api = useMarketplaceData().deals;
  const deal =
    inbox.conversations.find(
      (c) => c.listingId === listing?.id && c.buyerKey === listing?.buyerKey,
    )?.deal ?? null;
  return {
    deal,
    loaded: inbox.loaded,
    error: inbox.error,
    pickupAvailable: inbox.loaded && !inbox.error,
    pickupError: inbox.error,
    async act(action: DealAction, text: string, messageId?: string) {
      if (!listing || !inbox.loaded)
        throw new Error("Wait for the conversation to load.");
      try {
        const result = await api.submit(
          { listing, role },
          {
            action,
            text,
            expectedVersion: deal?.version ?? 0,
            messageId,
          },
        );
        if (result.conversation) inbox.put(result.conversation);
        return result;
      } finally {
        void inbox.refresh();
      }
    },
    async actPickup(action: PickupAction, text: string, messageId?: string) {
      if (!listing || !inbox.loaded || inbox.error)
        throw new Error(inbox.error || "Wait for the conversation to load.");
      try {
        const result = await api.pickup(
          { listing, role },
          {
            action,
            text,
            expectedVersion: deal?.version ?? 0,
            messageId,
          },
        );
        if (result.conversation) inbox.put(result.conversation);
        return result;
      } finally {
        void inbox.refresh();
      }
    },
  };
}
