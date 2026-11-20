import type { SupabaseClient } from "@supabase/supabase-js";
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
        .select("conversation_id, version")
        .eq("listing_id", item.id)
        .eq("status", "agreed")
        .single();
      if (error)
        throw new Error("The agreement changed. Open the chat to check it.");
      const { conversation_id: threadId, version } = data;
      return {
        threadId,
        other: "the buyer",
        async cancel(text, id) {
          await sendAccountDeal(
            client,
            threadId,
            { type: "cancel", reason: "changed_mind" },
            text,
            version,
            id,
          );
          return undefined;
        },
      };
    },
  };
}
