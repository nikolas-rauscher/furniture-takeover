import type { SupabaseClient } from "@supabase/supabase-js";
import { useEffect, useState } from "react";
import type { DealAction, PickupAction } from "../../shared/deal";
import {
  dealUpdateNeeded,
  sendAccountDeal,
  pickupUpdateNeeded,
  sendAccountPickup,
  loadThreadDealHistory,
  type ThreadDealEvent,
  type ThreadPickupEvent,
} from "./deals";
import type { AccountInbox } from "./useAccountInbox";
export function useAccountDeal(
  client: SupabaseClient,
  inbox: AccountInbox,
  conversationId: string | undefined,
) {
  const available = inbox.rows?.deals != null;
  const deal = conversationId
    ? (inbox.rows?.deals?.[conversationId] ?? null)
    : null;
  const [log, setLog] = useState<{
    id: string;
    events: ThreadDealEvent[];
    pickupEvents: ThreadPickupEvent[];
    version: number | undefined;
    error: string;
  }>();
  useEffect(() => {
    if (!available || !conversationId) return;
    const id = conversationId;
    let active = true,
      sequence = 0;
    const refresh = async () => {
      const current = ++sequence;
      try {
        const history = await loadThreadDealHistory(client, id);
        if (active && current === sequence)
          setLog({ id, ...history, version: deal?.version, error: "" });
      } catch (e) {
        if (active && current === sequence)
          setLog({
            id,
            events: [],
            pickupEvents: [],
            version: deal?.version,
            error:
              e instanceof Error
                ? e.message
                : "Couldn't load the deal history. Try again.",
          });
      }
    };
    void refresh();
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
        () => void refresh(),
      )
      .subscribe();
    const timer = setInterval(refresh, 5000);
    return () => {
      active = false;
      clearInterval(timer);
      void client.removeChannel(channel);
    };
  }, [client, conversationId, available, deal?.version]);
  const own = log?.id === conversationId ? log : undefined;
  const error =
    inbox.loadError ||
    (inbox.rows?.deals === null ? dealUpdateNeeded : (own?.error ?? ""));
  // An empty target thread can receive an offer again when a different deal
  // in the same inbox shows the pickup columns.
  const pickupInstalled = Object.values(inbox.rows?.deals ?? {}).some((row) => row.pickup !== undefined);
  const pickupError = error || (deal && !pickupInstalled ? pickupUpdateNeeded : "");
  return {
    deal,
    events: own?.events ?? [],
    loaded: available && (!conversationId || !!own),
    error,
    pickupAvailable: pickupInstalled && available && !!own && !pickupError,
    pickupError,
    pickupEvents: own?.pickupEvents ?? [],
    pickupEventsLoaded: !!own && !own.error && own.version === deal?.version,
    async act(action: DealAction, text: string, messageId?: string) {
      if (!available || !conversationId || error)
        throw new Error(error || "Open the conversation first.");
      try {
        const result = await sendAccountDeal(
          client,
          conversationId,
          action,
          text,
          deal?.version ?? 0,
          messageId,
        );
        inbox.change((rows) => ({
          ...rows,
          deals: rows.deals && { ...rows.deals, [conversationId]: result.deal },
        }));
        window.dispatchEvent(new Event("takeover-message-sent"));
        return result;
      } finally {
        void inbox.refresh();
      }
    },
    async actPickup(action: PickupAction, text: string, messageId?: string) {
      if (!pickupInstalled || !available || !conversationId || pickupError)
        throw new Error(pickupError || "Open the conversation first.");
      try {
        const result = await sendAccountPickup(
          client, conversationId, action, text, deal?.version ?? 0, messageId,
        );
        inbox.change((rows) => {
          if (!rows.deals || (rows.deals[conversationId]?.version ?? 0) > result.deal.version)
            return rows;
          return { ...rows, deals: { ...rows.deals, [conversationId]: result.deal } };
        });
        window.dispatchEvent(new Event("takeover-message-sent"));
        return result;
      } finally {
        void inbox.refresh();
      }
    },
  };
}
