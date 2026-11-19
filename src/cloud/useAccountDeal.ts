import type { SupabaseClient } from "@supabase/supabase-js";
import { useEffect, useState } from "react";
import type { DealAction } from "../../shared/deal";
import {
  dealUpdateNeeded,
  sendAccountDeal,
  loadDealEvents,
  type ThreadDealEvent,
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
        const events = await loadDealEvents(client, id);
        if (active && current === sequence) setLog({ id, events, error: "" });
      } catch (e) {
        if (active && current === sequence)
          setLog({
            id,
            events: [],
            error:
              e instanceof Error ? e.message : "Could not load deal history.",
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
  return {
    deal,
    events: own?.events ?? [],
    loaded: available && (!conversationId || !!own),
    error,
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
  };
}
