import { sendDemoDeal, sendDemoPickup, type DealListing } from "../api/messages";
import type { DealRole, DealAction, PickupAction } from "../../shared/deal";
import type { DemoInbox } from "./useDemoInbox";
import { demoPickupNow } from "./useNow";
export function useDemoDeal(
  inbox: DemoInbox,
  listing: DealListing | undefined,
  role: DealRole,
) {
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
        const { conversation, statusChange } = await sendDemoDeal(
          listing,
          role,
          action,
          text,
          deal?.version ?? 0,
          messageId,
        );
        inbox.put(conversation);
        return { deal: conversation.deal!, statusChange };
      } finally {
        void inbox.refresh();
      }
    },
    async actPickup(action: PickupAction, text: string, messageId?: string) {
      if (!listing || !inbox.loaded || inbox.error)
        throw new Error(inbox.error || "Wait for the conversation to load.");
      try {
        const { conversation, statusChange } = await sendDemoPickup(
          listing, role, action, text, deal?.version ?? 0, messageId, demoPickupNow(),
        );
        inbox.put(conversation);
        return { deal: conversation.deal!, statusChange };
      } finally {
        void inbox.refresh();
      }
    },
  };
}
