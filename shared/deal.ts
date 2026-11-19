import type {
  ThreadListing,
  ThreadTurn,
  ThreadTurnRequest,
} from "./threadTurn.ts";
import { NUDGE_AFTER_HOURS } from "./dealConfig.ts";
import { z } from "zod";
import { zurichClockTime } from "./pickupTime.ts";

export type DealRole = "buyer" | "seller";
export type DealTermField =
  "amount" | "fulfillment" | "pickupTime" | "pickupPoint";

/** An exact UTC instant, as the server and the database store pickups. */
export const isoInstantSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/);

/**
 * Terms both students read: whole francs (0 is free), the handover, the
 * pickup as an exact instant together with the words they used, and a meeting
 * point. Unknown terms are null.
 */
export const dealTermsSchema = z
  .object({
    amount: z.number().int().min(0).max(1_000_000).nullable(),
    fulfillment: z.enum(["pickup", "shipping"]).nullable(),
    pickupAt: isoInstantSchema.nullable(),
    pickupTime: z.string().trim().min(1).max(240).nullable(),
    pickupPoint: z.string().trim().min(1).max(240).nullable(),
  })
  .strict()
  .refine(
    (terms) => terms.pickupAt === null || terms.pickupTime !== null,
    "A pickup instant needs the words both students read.",
  );
export type DealTerms = z.infer<typeof dealTermsSchema>;

/** What a deal on these terms still needs: a price and either shipping or a concrete pickup. */
export function missingTerms(terms: DealTerms): DealTermField[] {
  const missing: DealTermField[] = [];
  if (terms.amount === null) missing.push("amount");
  if (terms.fulfillment === null) missing.push("fulfillment");
  if (terms.fulfillment !== "shipping") {
    if (terms.pickupAt === null) missing.push("pickupTime");
    if (terms.pickupPoint === null) missing.push("pickupPoint");
  }
  return missing;
}

/** Words that state a price of zero in the languages students write in. */
const FREE_WORDS = /\b(?:free|gratuit|gratuite|gratis|kostenlos)\b/i;

/** "CHF 1'200", "CHF 1,200", "chf1200": the amount's digits after CHF, and no digit after them. */
function statesAmount(body: string, amount: number): boolean {
  const digits = String(amount).replace(/(\d)(?=(\d{3})+$)/g, "$1[,' ]?");
  if (new RegExp(`chf ?${digits}(?![0-9])`, "i").test(body)) return true;
  return amount === 0 && FREE_WORDS.test(body);
}

const containsWords = (body: string, words: string) =>
  body.toLowerCase().includes(words.toLowerCase());

/**
 * Whether a message says the terms it records, so both students read exactly
 * what they confirm: the price as "CHF n" (or "free"), the pickup's Zurich
 * clock time as HH:MM (or its words while it has no exact time) and the
 * meeting point as written.
 */
export function messageStatesTerms(
  body: string,
  terms: DealTerms,
): { ok: true } | { ok: false; missing: ("amount" | "time" | "point")[] } {
  const missing: ("amount" | "time" | "point")[] = [];
  if (terms.amount !== null && !statesAmount(body, terms.amount))
    missing.push("amount");
  const time =
    terms.pickupAt !== null
      ? zurichClockTime(terms.pickupAt)
      : terms.pickupTime;
  if (time !== null && !containsWords(body, time)) missing.push("time");
  if (terms.pickupPoint !== null && !containsWords(body, terms.pickupPoint))
    missing.push("point");
  return missing.length ? { ok: false, missing } : { ok: true };
}

const roleSchema = z.enum(["buyer", "seller"]);
export const dealSchema = z
  .object({
    conversationId: z.string(),
    listingId: z.string(),
    version: z.number().int().nonnegative(),
    status: z.enum(["open", "agreed", "completed", "cancelled"]),
    proposal: z
      .object({
        terms: dealTermsSchema,
        by: roleSchema,
        messageId: z.string().nullable(),
      })
      .nullable(),
    agreed: z.object({ terms: dealTermsSchema, at: z.string() }).nullable(),
    outcome: z
      .object({
        kind: z.enum(["picked_up", "cancelled", "no_show", "listing_reopened"]),
        by: roleSchema.nullable(),
        at: z.string(),
      })
      .nullable(),
    updatedAt: z.string(),
  })
  .strict();
export type Deal = z.infer<typeof dealSchema>;
export const dealActionSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("propose"), terms: dealTermsSchema }).strict(),
  z.object({ type: z.literal("accept"), terms: dealTermsSchema }).strict(),
  z.object({ type: z.literal("withdraw") }).strict(),
  z.object({ type: z.literal("decline") }).strict(),
  z
    .object({
      type: z.literal("cancel"),
      reason: z.enum(["changed_mind", "cant_make_it"]),
    })
    .strict(),
]);
export type DealAction = z.infer<typeof dealActionSchema>;
export type DealEventKind =
  | "proposed"
  | "accepted"
  | "withdrawn"
  | "declined"
  | "cancelled"
  | "superseded"
  | "listing_reopened"
  | "completed";
export type DealEvent = { kind: DealEventKind; terms: DealTerms | null };
export class DealError extends Error {
  readonly key: string;
  constructor(key: string) {
    super(key);
    this.key = key;
  }
}
export const termsComplete = (terms: DealTerms) =>
  missingTerms(terms).length === 0;
export const sameTerms = (a: DealTerms, b: DealTerms) =>
  (Object.keys(a) as (keyof DealTerms)[]).every((k) => a[k] === b[k]);
export function applyDealAction(input: {
  deal: Deal | null;
  action: DealAction;
  actor: DealRole;
  body: string;
  listingStatus: ThreadListing["status"];
  now: Date;
  conversationId: string;
  listingId: string;
  messageId?: string;
}): { deal: Deal; event: DealEvent; statusChange?: "active" | "reserved" } {
  const { action, actor, body, conversationId, listingId } = input;
  if (!body.trim() || body.trim().length > 4000)
    throw new DealError("message_invalid");
  const at = input.now.toISOString();
  const deal: Deal = {
    conversationId,
    listingId,
    status: "open",
    proposal: null,
    agreed: null,
    outcome: null,
    ...input.deal,
    version: (input.deal?.version ?? 0) + 1,
    updatedAt: at,
  };
  if (deal.status === "completed" || deal.status === "cancelled")
    throw new DealError("deal_closed");
  const proposal = deal.proposal;
  if (action.type === "cancel") {
    const statusChange = deal.status === "agreed" ? "active" : undefined;
    return {
      deal: {
        ...deal,
        status: "cancelled",
        outcome: { kind: "cancelled", by: actor, at },
        proposal: null,
      },
      event: { kind: "cancelled", terms: null },
      statusChange,
    };
  }
  if (deal.status !== "open") throw new DealError("deal_closed");
  if (action.type === "decline" || action.type === "withdraw") {
    if (!proposal || (action.type === "withdraw") !== (proposal.by === actor))
      throw new DealError("deal_changed");
    return {
      deal: { ...deal, proposal: null },
      event: {
        kind: action.type === "decline" ? "declined" : "withdrawn",
        terms: null,
      },
    };
  }
  const terms = action.terms;
  if (input.listingStatus !== "active")
    throw new DealError("listing_unavailable");
  if (!messageStatesTerms(body, terms).ok)
    throw new DealError("terms_not_stated");
  const matches =
    proposal && proposal.by !== actor && sameTerms(proposal.terms, terms);
  if (action.type === "accept" || matches) {
    if (!matches) throw new DealError("deal_changed");
    if (!termsComplete(terms)) throw new DealError("terms_incomplete");
    if (
      terms.fulfillment === "pickup" &&
      Date.parse(terms.pickupAt!) <= input.now.getTime()
    )
      throw new DealError("pickup_time_past");
    return {
      deal: {
        ...deal,
        status: "agreed",
        agreed: { terms, at },
        proposal: null,
      },
      event: { kind: "accepted", terms },
      statusChange: "reserved",
    };
  }
  return {
    deal: {
      ...deal,
      proposal: { by: actor, terms, messageId: input.messageId ?? null },
    },
    event: { kind: "proposed", terms },
  };
}

export function dealPhase({
  deal,
  listing,
  role,
  messages,
  turn,
  now,
}: {
  deal: Deal | null;
  listing: Pick<ThreadListing, "status">;
  role: DealRole;
  messages: ThreadTurnRequest["messages"];
  turn: ThreadTurn | null;
  now: Date;
}) {
  if (deal && deal.status !== "open") return deal.status;
  if (listing.status !== "active") return "gone";
  const last = messages.at(-1);
  const noAnswer =
    last?.from === "me" &&
    now.getTime() - Date.parse(last.at) >= NUDGE_AFTER_HOURS * 3600000;
  if (deal?.proposal) {
    if (deal.proposal.by !== role)
      return termsComplete(deal.proposal.terms)
        ? "offer_received"
        : "partial_received";
    if (noAnswer) return "no_answer";
    return termsComplete(deal.proposal.terms) ? "you_confirmed" : "waiting";
  }
  if (!last) return "talking";
  if (last.from === "me") return noAnswer ? "no_answer" : "waiting";
  if (last.structured) return "talking";
  if (turn?.agreement.status === "complete") return "looks_agreed";
  return turn ? "your_turn" : "reading";
}
export type DealPhase = ReturnType<typeof dealPhase>;
