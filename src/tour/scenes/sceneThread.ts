import {
  applyDealAction,
  applyPickupAction,
  type Deal,
  type DealAction,
  type DealRole,
  type PickupAction,
} from "../../../shared/deal";
import type { Product } from "../../../shared/marketplace";
import type { DealResult } from "../../api/deals";
import type { ThreadEvent } from "../../components/ThreadDeal";

/** A message of the example thread and the student who wrote it. */
export type SceneMessage = {
  id: string;
  sender: DealRole;
  text: string;
  at: string;
  /** Sent from the deal card, which shows its terms already. */
  structured: boolean;
};

/** The example conversation: its messages, the deal on them and the listing's status. */
export type SceneThread = {
  conversationId: string;
  listing: Product;
  messages: SceneMessage[];
  events: ThreadEvent[];
  deal: Deal | null;
};

export function startThread(conversationId: string, listing: Product) {
  return { conversationId, listing, messages: [], events: [], deal: null };
}

type Move<Action> = {
  actor: DealRole;
  action: Action;
  text: string;
  now: Date;
  messageId: string;
};

/** The thread after one side's move, written as the message that carried it. */
function recorded(
  thread: SceneThread,
  move: Move<unknown>,
  outcome: Pick<DealResult, "deal" | "statusChange">,
  event: Omit<ThreadEvent, "id" | "messageId" | "at">,
): { thread: SceneThread; result: DealResult } {
  const at = move.now.toISOString();
  const status = outcome.statusChange ?? thread.listing.status;
  return {
    thread: {
      ...thread,
      listing: { ...thread.listing, status },
      deal: outcome.deal,
      messages: [
        ...thread.messages,
        {
          id: move.messageId,
          sender: move.actor,
          text: move.text,
          at,
          structured: true,
        },
      ],
      events: [
        ...thread.events,
        {
          ...event,
          id: `${move.messageId}:deal`,
          messageId: move.messageId,
          at,
        },
      ],
    },
    result: { deal: outcome.deal, statusChange: outcome.statusChange },
  };
}

/** One side offers, accepts or answers on the deal card, by the app's own deal rules. */
export function moveDeal(thread: SceneThread, move: Move<DealAction>) {
  const outcome = applyDealAction({
    deal: thread.deal,
    action: move.action,
    actor: move.actor,
    body: move.text,
    listingStatus: thread.listing.status,
    now: move.now,
    conversationId: thread.conversationId,
    listingId: thread.listing.id,
    messageId: move.messageId,
  });
  return recorded(thread, move, outcome, outcome.event);
}

/** One side's pickup-day tap, such as Picked up, by the app's own pickup rules. */
export function movePickup(thread: SceneThread, move: Move<PickupAction>) {
  const outcome = applyPickupAction({
    deal: thread.deal,
    action: move.action,
    actor: move.actor,
    body: move.text,
    listingStatus: thread.listing.status,
    now: move.now,
    conversationId: thread.conversationId,
    listingId: thread.listing.id,
    messageId: move.messageId,
  });
  return recorded(thread, move, outcome, {
    ...outcome.event,
    actor: move.actor,
  });
}

/** A message without terms. */
export function writeMessage(
  thread: SceneThread,
  message: Omit<SceneMessage, "structured">,
): SceneThread {
  return {
    ...thread,
    messages: [...thread.messages, { ...message, structured: false }],
  };
}
