import type { SupabaseClient } from "@supabase/supabase-js";
import {
  dealSchema,
  dealTermsSchema,
  pickupEventKindSchema,
  reopenUnagreedDeal,
  lateMinutesSchema,
  type DealAction,
  type DealTerms,
  type DealEvent,
  type DealRole,
  type PickupAction,
  type PickupEvent,
  type PickupStatusChange,
} from "../../shared/deal.ts";
import { dealErrorMessage } from "../../shared/dealErrors.ts";
import {
  missingFromSchema,
  type DealRow,
  type StoredDealTerms,
} from "./client.ts";
import { randomUuid } from "../randomUuid.ts";
export const dealUpdateNeeded =
  "Offers and confirmations need this server's deal update. You can still send a message.";
export const pickupUpdateNeeded =
  "Pickup day controls need this server's pickup update. You can still send a message.";
const readTerms = (t: StoredDealTerms) =>
  dealTermsSchema.parse({
    amount: t.amount,
    fulfillment: t.fulfillment,
    pickupAt: t.pickup_at,
    pickupPoint: t.pickup_point,
    pickupTime: t.pickup_time,
  });
const writeTerms = (t: DealTerms): StoredDealTerms => ({
  amount: t.amount,
  fulfillment: t.fulfillment,
  pickup_at: t.pickupAt,
  pickup_point: t.pickupPoint,
  pickup_time: t.pickupTime,
});
export function readDeal(r: DealRow) {
  const deal = dealSchema.parse({
    conversationId: r.conversation_id,
    listingId: r.listing_id,
    status: r.status,
    version: r.version,
    updatedAt: r.updated_at,
    proposal: r.proposal && {
      by: r.proposal_by,
      terms: readTerms(r.proposal),
      messageId: r.proposal_message_id,
    },
    agreed: r.agreed && { terms: readTerms(r.agreed), at: r.agreed_at },
    outcome: r.outcome && {
      kind: r.outcome,
      by: r.outcome_by,
      at: r.updated_at,
    },
    ...(r.buyer_on_way_at === undefined ? {} : {
      pickup: {
        onWay: { buyer: r.buyer_on_way_at, seller: r.seller_on_way_at },
        late: r.late_minutes === null ? null : { minutes: r.late_minutes, by: r.late_by, at: r.late_at },
        noShow: r.no_show_at === null ? null : { by: r.no_show_by, at: r.no_show_at },
        buyerPickedUpAt: r.buyer_picked_up_at,
        cancelReason: r.pickup_cancel_reason,
      },
    }),
  });
  return reopenUnagreedDeal(deal);
}
function rpcFailure(error: { code?: string; message: string }, updateNeeded: string) {
  if (missingFromSchema(error)) return new Error(updateNeeded);
  if (!error.code) return new Error("Could not reach the server. Check the conversation and retry.");
  return Object.assign(new Error(dealErrorMessage(error.message)), { key: error.message });
}
export async function sendAccountDeal(
  client: SupabaseClient,
  conversationId: string,
  action: DealAction,
  text: string,
  expectedVersion: number,
  messageId = randomUuid(),
) {
  const { data, error } = await client
    .rpc("deal_action", {
      p_conversation: conversationId,
      p_message: messageId,
      p_body: text,
      p_action: action.type,
      p_terms: "terms" in action ? writeTerms(action.terms) : null,
      p_expected_version: expectedVersion,
      p_reason: action.type === "cancel" ? action.reason : null,
    })
    .single<DealRow>();
  if (error) throw rpcFailure(error, dealUpdateNeeded);
  const deal = readDeal(data!);
  const statusChange =
    deal.version !== expectedVersion + 1
      ? undefined
      : deal.status === "agreed"
        ? "reserved"
        : deal.status === "cancelled" && deal.agreed
          ? "active"
          : undefined;
  return { deal, statusChange } as const;
}
export async function sendAccountPickup(
  client: SupabaseClient,
  conversationId: string,
  action: PickupAction,
  text: string,
  expectedVersion: number,
  messageId = randomUuid(),
): Promise<{ deal: ReturnType<typeof readDeal>; statusChange?: PickupStatusChange }> {
  const { data, error } = await client.rpc("pickup_action", {
    p_conversation: conversationId,
    p_message: messageId,
    p_body: text,
    p_action: action.type,
    p_expected_version: expectedVersion,
    p_terms: "terms" in action ? writeTerms(action.terms) : null,
    p_minutes: action.type === "late" ? action.minutes : null,
    p_reason: action.type === "cancel_pickup" ? action.reason : null,
    p_released_conversation: action.type === "offer_again" ? action.releasedConversationId : null,
  }).single<DealRow>();
  if (error) throw rpcFailure(error, pickupUpdateNeeded);
  const deal = readDeal(data!);
  if (deal.version !== expectedVersion + 1) return { deal };
  if (action.type === "picked_up" && deal.status === "completed") return { deal, statusChange: "sold" };
  if (deal.status === "cancelled" && (action.type === "cancel_pickup" || action.type === "release_no_show"))
    return { deal, statusChange: "active" };
  return { deal };
}

type ThreadEventDetails = {
  id: string;
  messageId: string | null;
  actorRole: DealRole | null;
  at: string;
};
export type ThreadDealEvent = DealEvent & ThreadEventDetails;
export type ThreadPickupEvent = PickupEvent & ThreadEventDetails;
export async function loadDealEvents(
  client: SupabaseClient,
  conversationId: string,
) {
  return (await loadThreadDealHistory(client, conversationId)).events;
}

export async function loadThreadDealHistory(client: SupabaseClient, conversationId: string) {
  const events: ThreadDealEvent[] = [];
  const pickupEvents: ThreadPickupEvent[] = [];
  for (let from = 0; ; from += 500) {
    const { data, error } = await client
      .from("deal_events")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("created_at")
      .order("id")
      .range(from, from + 499);
    if (error)
      throw new Error(
        missingFromSchema(error) ? dealUpdateNeeded : error.message,
      );
    for (const r of data) {
      const details = {
        id: r.id,
        terms: r.terms && readTerms(r.terms),
        messageId: r.message_id,
        actorRole: r.actor_role,
        at: r.created_at,
      };
      const kind = pickupEventKindSchema.safeParse(r.kind);
      if (kind.success) {
        const minutes = r.pickup_minutes == null ? undefined : lateMinutesSchema.parse(r.pickup_minutes);
        pickupEvents.push({ ...details, kind: kind.data, ...(minutes === undefined ? {} : { minutes }) });
      } else {
        events.push({ ...details, kind: r.kind });
      }
    }
    if (data.length < 500) return { events, pickupEvents };
  }
}
