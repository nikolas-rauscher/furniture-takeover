import { useEffect, useState } from "react";
import type { DealAction, DealRole, PickupAction } from "../../shared/deal";
import type { ThreadDealEvent, ThreadPickupEvent } from "../api/deals";
import { useMarketplaceData } from "../marketplaceData";
import type { AccountInbox } from "../api/inbox";
export function useAccountDeal(
  inbox: AccountInbox,
  conversationId: string | undefined,
  role: DealRole,
) {
  const api = useMarketplaceData().deals;
  const { history } = api;
  if (!history) throw new Error("Deal history is not configured.");
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
        const events = await history.load(id);
        if (active && current === sequence)
          setLog({ id, ...events, version: deal?.version, error: "" });
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
    const unsubscribe = history.subscribe(id, () => void refresh());
    const timer = setInterval(refresh, 5000);
    return () => {
      active = false;
      clearInterval(timer);
      unsubscribe();
    };
  }, [history, conversationId, available, deal?.version]);
  const own = log?.id === conversationId ? log : undefined;
  const error =
    inbox.loadError ||
    (inbox.rows?.deals === null ? history.unavailable : (own?.error ?? ""));
  // An empty target thread can receive an offer again when a different deal
  // in the same inbox shows the pickup columns.
  const pickupInstalled = Object.values(inbox.rows?.deals ?? {}).some(
    (row) => row.pickup !== undefined,
  );
  const pickupError =
    error || (deal && !pickupInstalled ? history.pickupUnavailable : "");
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
        const result = await api.submit(
          { conversationId, role },
          {
            action,
            text,
            expectedVersion: deal?.version ?? 0,
            messageId,
          },
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
        const result = await api.pickup(
          { conversationId, role },
          {
            action,
            text,
            expectedVersion: deal?.version ?? 0,
            messageId,
          },
        );
        inbox.change((rows) => {
          if (
            !rows.deals ||
            (rows.deals[conversationId]?.version ?? 0) > result.deal.version
          )
            return rows;
          return {
            ...rows,
            deals: { ...rows.deals, [conversationId]: result.deal },
          };
        });
        window.dispatchEvent(new Event("takeover-message-sent"));
        return result;
      } finally {
        void inbox.refresh();
      }
    },
  };
}
