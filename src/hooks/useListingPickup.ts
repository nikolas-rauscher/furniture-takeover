import type { SupabaseClient } from "@supabase/supabase-js";
import { useRef } from "react";
import { sendAccountPickup } from "../cloud/deals";
import type { InboxDeal } from "../inboxDeals";
import { PendingMessage } from "../pendingMessage";
import type { PickupSend } from "../pickupOptions";

/**
 * A seller's pickup action from My listings, the same one the pickup card
 * sends: it goes to the deal's conversation with its exact message, and a
 * retry of the same text reuses its id. Only accounts have sellers with
 * booked pickups, so the local demo never offers it.
 */
export function useListingPickup(
  client: SupabaseClient | undefined,
  onSent: () => void,
) {
  const pending = useRef(new PendingMessage());
  return async (item: InboxDeal, { action, message }: PickupSend) => {
    if (!client) throw new Error("Sign in to change a booked pickup.");
    const id = pending.current.idFor(item.threadId, "seller", message);
    try {
      await sendAccountPickup(
        client,
        item.threadId,
        action,
        message,
        item.deal.version,
        id,
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
