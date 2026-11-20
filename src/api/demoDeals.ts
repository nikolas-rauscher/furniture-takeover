import { pickupDay } from "../../shared/deal.ts";
import type { SellerConversation } from "../../shared/messages.ts";
import { demoPickupNow } from "../hooks/useNow.ts";
import { demoListings } from "./demoListings.ts";
import { listMessages, sendDemoDeal, sendDemoPickup } from "./messages.ts";
import type { DealResult, DealsApi } from "./deals.ts";

function resultWithDeal(result: {
  conversation: SellerConversation;
  statusChange?: DealResult["statusChange"];
}): DealResult {
  const deal = result.conversation.deal;
  if (!deal)
    throw new Error("Couldn't load the updated deal. Reopen the conversation.");
  return { ...result, deal };
}

export const demoDeals: DealsApi = {
  async submit(
    { listing, role },
    { action, text, expectedVersion, messageId },
  ) {
    if (!listing) throw new Error("Wait for the conversation to load.");
    return resultWithDeal(
      await sendDemoDeal(
        listing,
        role,
        action,
        text,
        expectedVersion,
        messageId,
      ),
    );
  },
  async pickup(
    { listing, role },
    { action, text, expectedVersion, messageId },
  ) {
    if (!listing) throw new Error("Wait for the conversation to load.");
    return resultWithDeal(
      await sendDemoPickup(
        listing,
        role,
        action,
        text,
        expectedVersion,
        messageId,
        demoPickupNow(),
      ),
    );
  },
  async listingAgreement(item) {
    await demoListings.verifyEdit();
    const thread = (await listMessages()).find(
      (entry) => entry.listingId === item.id && entry.deal?.status === "agreed",
    );
    if (!thread?.deal) return;
    const { id: threadId, buyerKey, deal } = thread;
    const other = buyerKey ? "the other buyer" : "the buyer";
    const now = demoPickupNow();
    const day = pickupDay(deal, "seller", now ?? new Date());
    const listing = { ...item, buyerKey, status: "reserved" as const };
    return {
      threadId,
      other,
      cancel: async (text, id) =>
        (
          await sendDemoDeal(
            listing,
            "seller",
            { type: "cancel", reason: "changed_mind" },
            text,
            deal.version,
            id,
          )
        ).statusChange,
      pickup: day
        ? {
            day,
            deal,
            send: async (action, message, id) =>
              (
                await sendDemoPickup(
                  listing,
                  "seller",
                  action,
                  message,
                  deal.version,
                  id,
                  now,
                )
              ).statusChange,
          }
        : undefined,
    };
  },
};
