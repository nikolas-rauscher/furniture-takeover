import type { SupabaseClient } from "@supabase/supabase-js";
import {
  dealSchema,
  dealTermsSchema,
  type DealAction,
  type DealTerms,
  type DealEvent,
  type DealRole,
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
  return dealSchema.parse({
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
  });
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
  if (error) {
    if (missingFromSchema(error)) throw new Error(dealUpdateNeeded);
    throw Object.assign(new Error(dealErrorMessage(error.message)), {
      key: error.message,
    });
  }
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
export type ThreadDealEvent = DealEvent & {
  id: string;
  messageId: string | null;
  actorRole: DealRole | null;
  at: string;
};
export async function loadDealEvents(
  client: SupabaseClient,
  conversationId: string,
) {
  const events: ThreadDealEvent[] = [];
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
    for (const r of data)
      events.push({
        id: r.id,
        kind: r.kind,
        terms: r.terms && readTerms(r.terms),
        messageId: r.message_id,
        actorRole: r.actor_role,
        at: r.created_at,
      });
    if (data.length < 500) return events;
  }
}
