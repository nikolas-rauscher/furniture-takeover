import type { SupabaseClient } from "@supabase/supabase-js";
import { useRef } from "react";
import { sendAccountDeal, sendAccountPickup } from "../cloud/deals";
import { getCloudClient } from "../cloud/session";
import {
  getMessageWorkspace,
  listMessages,
  sendDemoDeal,
  sendDemoPickup,
} from "../api/messages";
import { pickupDay } from "../../shared/deal";
import { cancelDealMessage } from "../../shared/dealMessages";
import type { Product } from "../../shared/marketplace";
import {
  listingPickupChoices,
  type ListingPickupChoice,
  type PickupSend,
} from "../pickupOptions";
import { demoPickupNow } from "./useNow";
import type { InboxDeal } from "../inboxDeals";
import { PendingMessage } from "../pendingMessage";

/**
 * A seller's pickup action from My listings, the same one the pickup card
 * sends: it goes to the deal's conversation with its exact message, and a
 * retry of the same text reuses its id.
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

export async function requireDemoListingEdit() {
  const response = await fetch("/api/listings/permission", {
    headers: { "X-Message-Workspace": getMessageWorkspace() },
    signal: AbortSignal.timeout(8000),
  });
  const body = await response.json();
  if (!response.ok || body.allowed !== true)
    throw new Error(
      body.error?.message ??
        "Listing permission could not be checked. Try again.",
    );
}

/** Confirm a status change using the agreement that is current when the seller taps. */
export function useListingStatusConfirmation() {
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

  return {
    async accountDeal(listingId: string) {
      const client = getCloudClient();
      if (!client) throw new Error("Sign in to change an agreed deal.");
      const { data, error } = await client
        .from("deals")
        .select("conversation_id, version")
        .eq("listing_id", listingId)
        .eq("status", "agreed")
        .single();
      if (error)
        throw new Error("The agreement changed. Open the chat to check it.");
      return cancelDeal("the buyer", async (text) => {
        const id = pending.current.idFor(data.conversation_id, "seller", text);
        await sendAccountDeal(
          client,
          data.conversation_id,
          {
            type: "cancel",
            reason: "changed_mind",
          },
          text,
          data.version,
          id,
        );
        pending.current.acknowledge(id);
      });
    },
    async demoDeal(
      item: Product,
      status: Product["status"],
      onStatusChange: (status: Product["status"]) => void,
    ) {
      const thread = (await listMessages()).find(
        (entry) =>
          entry.listingId === item.id && entry.deal?.status === "agreed",
      );
      if (!thread?.deal) return;
      const { id: threadId, buyerKey, deal } = thread;
      const other = buyerKey ? "the other buyer" : "the buyer";
      const demoNow = demoPickupNow();
      const day = pickupDay(deal, "seller", demoNow ?? new Date());
      const listing = { ...item, buyerKey, status: "reserved" as const };
      if (!day)
        return cancelDeal(other, async (text) => {
          const id = pending.current.idFor(threadId, "seller", text);
          const result = await sendDemoDeal(
            listing,
            "seller",
            {
              type: "cancel",
              reason: "changed_mind",
            },
            text,
            deal.version,
            id,
          );
          pending.current.acknowledge(id);
          if (result.statusChange) onStatusChange(result.statusChange);
        });
      const { sold, reopen } = listingPickupChoices({
        day,
        deal,
        other,
        title: item.title,
      });
      const choice = status === "sold" ? sold : reopen;
      return pickupConfirmation(other, choice, async ({ action, message }) => {
        const id = pending.current.idFor(threadId, "seller", message);
        const result = await sendDemoPickup(
          listing,
          "seller",
          action,
          message,
          deal.version,
          id,
          demoNow,
        );
        pending.current.acknowledge(id);
        if (result.statusChange) onStatusChange(result.statusChange);
      });
    },
  };
}
