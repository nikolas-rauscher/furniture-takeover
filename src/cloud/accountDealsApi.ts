import type { SupabaseClient } from "@supabase/supabase-js";
import type { DealAction } from "../../shared/deal.ts";
import type { DealsApi } from "../api/deals.ts";
import {
  dealUpdateNeeded,
  loadThreadDealHistory,
  pickupUpdateNeeded,
  sendAccountDeal,
  sendAccountPickup,
} from "./deals.ts";

export function createAccountDeals(client: SupabaseClient): DealsApi {
  return {
    async submit(
      { conversationId },
      { action, text, expectedVersion, messageId },
    ) {
      if (!conversationId) throw new Error("Open the conversation first.");
      return sendAccountDeal(
        client,
        conversationId,
        action,
        text,
        expectedVersion,
        messageId,
      );
    },
    async pickup(
      { conversationId },
      { action, text, expectedVersion, messageId },
    ) {
      if (!conversationId) throw new Error("Open the conversation first.");
      return sendAccountPickup(
        client,
        conversationId,
        action,
        text,
        expectedVersion,
        messageId,
      );
    },
    history: {
      unavailable: dealUpdateNeeded,
      pickupUnavailable: pickupUpdateNeeded,
      load: (id) => loadThreadDealHistory(client, id),
      subscribe(id, refresh) {
        const channel = client
          .channel("deal-log-" + id)
          .on(
            "postgres_changes",
            {
              schema: "public",
              table: "deal_events",
              event: "INSERT",
              filter: "conversation_id=eq." + id,
            },
            refresh,
          )
          .subscribe();
        return () => void client.removeChannel(channel);
      },
    },
    async listingAgreement(item, knownAgreement) {
      if (!knownAgreement) return;
      const { data, error } = await client
        .from("deals")
        .select("conversation_id, version, agreed")
        .eq("listing_id", item.id)
        .eq("status", "agreed")
        .single();
      if (error)
        throw new Error("The agreement changed. Open the chat to check it.");
      const { conversation_id: threadId, version, agreed } = data;
      const send = async (action: DealAction, text: string, id: string) => {
        await sendAccountDeal(client, threadId, action, text, version, id);
        return undefined;
      };
      return {
        threadId,
        other: "the buyer",
        cancel: (text, id) =>
          send({ type: "cancel", reason: "changed_mind" }, text, id),
        ...(agreed?.fulfillment === "shipping"
          ? {
              completeShipping: (text: string, id: string) =>
                send({ type: "complete_shipping" }, text, id),
            }
          : {}),
      };
    },
  };
}
