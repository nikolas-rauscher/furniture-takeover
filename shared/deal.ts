import type {
  ThreadListing,
  ThreadTurn,
  ThreadTurnRequest,
} from "./threadTurn.ts";
import {
  NO_SHOW_AFTER_MINUTES,
  NUDGE_AFTER_HOURS,
  REMINDER_BEFORE_MINUTES,
  SIGNAL_WINDOW,
} from "./dealConfig.ts";
import { z } from "zod";
import { zurichClockTime } from "./pickupTime.ts";
import { dealTermsSchema, type DealTerms } from "./dealTerms.ts";

export {
  dealTermsSchema,
  isoInstantSchema,
  type DealTerms,
} from "./dealTerms.ts";

export type DealRole = "buyer" | "seller";
export type DealTermField =
  "amount" | "fulfillment" | "pickupTime" | "pickupPoint";

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

/** A standalone price or wording that offers the item at no charge. */
const FREE_PRICE = /^(?:free|gratuite?|gratis|kostenlos)[.!]?$/i;
const FREE_OFFER =
  /\b(?:(?:for|it's|it’s) free|free (?:pickup|it is)|c['’]est gratuite?|(?:pour|c['’]est) gratis|ist kostenlos)\b/i;
const NEGATED_FREE_OFFER =
  /\b(?:not|never|cannot|can['’]t|won['’]t)\b[^.!?;]*\bfor free\b/i;

/** "CHF 1'200", "CHF 1,200", "chf1200": the amount's digits after CHF, and no digit after them. */
function statesAmount(body: string, amount: number): boolean {
  const digits = String(amount).replace(/(\d)(?=(\d{3})+$)/g, "$1[,' ]?");
  if (new RegExp(`chf ?${digits}(?![0-9])`, "i").test(body)) return true;
  return (
    amount === 0 &&
    (FREE_PRICE.test(body.trim()) ||
      (FREE_OFFER.test(body) && !NEGATED_FREE_OFFER.test(body)))
  );
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
export const lateMinutesSchema = z.union([
  z.literal(10),
  z.literal(20),
  z.literal(30),
]);
export type LateMinutes = z.infer<typeof lateMinutesSchema>;
const pickupSignalsSchema = z
  .object({
    onWay: z
      .object({ buyer: z.string().nullable(), seller: z.string().nullable() })
      .strict(),
    late: z
      .object({ minutes: lateMinutesSchema, by: roleSchema, at: z.string() })
      .strict()
      .nullable(),
    noShow: z.object({ by: roleSchema, at: z.string() }).strict().nullable(),
    buyerPickedUpAt: z.string().nullable(),
    cancelReason: z.enum(["cant_make_it", "no_show"]).nullable(),
  })
  .strict();
export type PickupSignals = z.infer<typeof pickupSignalsSchema>;

export const emptyPickupSignals = (): PickupSignals => ({
  onWay: { buyer: null, seller: null },
  late: null,
  noShow: null,
  buyerPickedUpAt: null,
  cancelReason: null,
});

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
        kind: z.enum([
          "picked_up",
          "cancelled",
          "no_show",
          "listing_reopened",
          "shipped",
          "pickup_expired",
        ]),
        by: roleSchema.nullable(),
        at: z.string(),
      })
      .nullable(),
    updatedAt: z.string(),
    pickup: pickupSignalsSchema.optional(),
  })
  .strict();
export type Deal = z.infer<typeof dealSchema>;

/** Older versions could cancel a negotiation before either side agreed. */
export function reopenUnagreedDeal(deal: Deal): Deal {
  return deal.status === "cancelled" && !deal.agreed
    ? { ...deal, status: "open", outcome: null }
    : deal;
}
export const dealActionSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("propose"), terms: dealTermsSchema }).strict(),
  z.object({ type: z.literal("accept"), terms: dealTermsSchema }).strict(),
  z.object({ type: z.literal("withdraw") }).strict(),
  z.object({ type: z.literal("decline") }).strict(),
  z.object({ type: z.literal("complete_shipping") }).strict(),
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
  | "pickup_check_due"
  | "pickup_expired"
  | "completed";
export type DealEvent = { kind: DealEventKind; terms: DealTerms | null };

export const pickupActionSchema = z.discriminatedUnion("type", [
  z
    .object({ type: z.literal("suggest_time"), terms: dealTermsSchema })
    .strict(),
  z.object({ type: z.literal("accept_time"), terms: dealTermsSchema }).strict(),
  z.object({ type: z.literal("keep_time") }).strict(),
  z.object({ type: z.literal("withdraw_time") }).strict(),
  z.object({ type: z.literal("on_my_way") }).strict(),
  z.object({ type: z.literal("late"), minutes: lateMinutesSchema }).strict(),
  z.object({ type: z.literal("no_show") }).strict(),
  z.object({ type: z.literal("release_no_show") }).strict(),
  z
    .object({
      type: z.literal("cancel_pickup"),
      reason: z.literal("cant_make_it"),
    })
    .strict(),
  z.object({ type: z.literal("picked_up") }).strict(),
  z.object({ type: z.literal("confirm_pickup_happened") }).strict(),
  z.object({ type: z.literal("release_stale_pickup") }).strict(),
  z
    .object({
      type: z.literal("offer_again"),
      releasedConversationId: z.string().uuid(),
    })
    .strict(),
]);
export type PickupAction = z.infer<typeof pickupActionSchema>;
export const pickupEventKindSchema = z.enum([
  "time_suggested",
  "time_accepted",
  "time_kept",
  "time_withdrawn",
  "on_my_way",
  "late",
  "no_show",
  "no_show_released",
  "pickup_cancelled",
  "picked_up",
  "offered_again",
]);
export type PickupEvent = {
  kind: z.infer<typeof pickupEventKindSchema>;
  terms: DealTerms | null;
  minutes?: LateMinutes;
};
export type PickupStatusChange = "active" | "sold";

const DAY_MS = 24 * 60 * 60 * 1000;

/** Follow-up opens 24 hours after pickup and closes 24 hours later. */
export function pickupCheck(deal: Deal | null | undefined, now: Date) {
  const terms = deal?.agreed?.terms;
  if (
    deal?.status !== "agreed" ||
    terms?.fulfillment !== "pickup" ||
    !terms.pickupAt
  )
    return null;
  const opens = Date.parse(terms.pickupAt) + DAY_MS;
  const expires = opens + DAY_MS;
  if (now.getTime() < opens) return null;
  return {
    opensAt: new Date(opens).toISOString(),
    expiresAt: new Date(expires).toISOString(),
    expired: now.getTime() >= expires,
  };
}

export const expirePickup = (deal: Deal, at: string): Deal => ({
  ...deal,
  status: "cancelled",
  proposal: null,
  version: deal.version + 1,
  outcome: { kind: "pickup_expired", by: null, at },
  updatedAt: at,
});

export type PickupPhase = "booked" | "pickup_soon" | "pickup_now" | "overdue";
export function pickupDay(
  deal: Deal | null | undefined,
  role: DealRole,
  now: Date,
) {
  const terms = deal?.agreed?.terms;
  if (
    deal?.status !== "agreed" ||
    terms?.fulfillment !== "pickup" ||
    !terms.pickupAt
  )
    return null;
  const minutesUntil = (Date.parse(terms.pickupAt) - now.getTime()) / 60000;
  const delay = deal.pickup?.late?.minutes ?? 0;
  const overdue = minutesUntil <= -(delay + NO_SHOW_AFTER_MINUTES);
  const buyerReportedPickup = !!deal.pickup?.buyerPickedUpAt;
  const phase: PickupPhase = overdue
    ? "overdue"
    : minutesUntil <= 0
      ? "pickup_now"
      : minutesUntil <= REMINDER_BEFORE_MINUTES
        ? "pickup_soon"
        : "booked";
  return {
    phase,
    terms,
    minutesUntil,
    change:
      deal.proposal &&
      (deal.proposal.by === role ? ("sent" as const) : ("received" as const)),
    canSignal:
      minutesUntil <= SIGNAL_WINDOW.beforeMinutes &&
      minutesUntil >= -SIGNAL_WINDOW.afterMinutes,
    canReportNoShow: overdue,
    canMarkSold: minutesUntil <= 0 || buyerReportedPickup,
    buyerReportedPickup,
    pickupCheck: pickupCheck(deal, now),
  };
}

function isPickupReleased(deal: Deal | null | undefined): boolean {
  return (
    deal?.status === "cancelled" &&
    deal.agreed?.terms.fulfillment === "pickup" &&
    (deal.outcome?.kind === "no_show" ||
      deal.outcome?.kind === "cancelled" ||
      deal.outcome?.kind === "pickup_expired")
  );
}

export function nextPickupBuyer<
  T extends { id: string; listingId: string; deal?: Deal | null },
>(released: Deal, candidates: readonly T[]): T | undefined {
  if (!isPickupReleased(released)) return undefined;
  return candidates.find(
    (candidate) =>
      candidate.listingId === released.listingId &&
      candidate.id !== released.conversationId &&
      (!candidate.deal || candidate.deal.status === "open"),
  );
}

/** The target is the next student's existing conversation for offer_again. */
export function applyPickupAction(
  input: Omit<Parameters<typeof applyDealAction>[0], "action"> & {
    action: PickupAction;
    releasedDeal?: Deal | null;
  },
): { deal: Deal; event: PickupEvent; statusChange?: PickupStatusChange } {
  const { actor, action, listingStatus, body, now, conversationId, listingId } =
    input;
  if (!body.trim() || body.trim().length > 4000)
    throw new DealError("message_invalid");
  const current = input.deal && reopenUnagreedDeal(input.deal);
  const at = now.toISOString();
  const deal: Deal = {
    conversationId,
    listingId,
    status: "open",
    proposal: null,
    agreed: null,
    outcome: null,
    ...current,
    pickup: current?.pickup ?? emptyPickupSignals(),
    updatedAt: at,
    version: (current?.version ?? 0) + 1,
  };
  if (action.type === "offer_again") {
    const released = input.releasedDeal;
    if (
      actor !== "seller" ||
      !released ||
      !isPickupReleased(released) ||
      released.conversationId !== action.releasedConversationId ||
      released.conversationId === conversationId ||
      released.listingId !== listingId ||
      deal.status !== "open"
    )
      throw new DealError("next_buyer_unavailable");
    if (listingStatus !== "active") throw new DealError("listing_unavailable");
    return { deal, event: { kind: "offered_again", terms: null } };
  }
  const day = pickupDay(current, actor, now);
  if (!day) throw new DealError("pickup_unavailable");
  if (listingStatus !== "reserved") throw new DealError("listing_unavailable");
  if (day.pickupCheck?.expired) throw new DealError("pickup_unavailable");
  if (
    action.type === "confirm_pickup_happened" ||
    action.type === "release_stale_pickup"
  ) {
    if (!day.pickupCheck) throw new DealError("pickup_check_not_due");
    if (action.type === "confirm_pickup_happened")
      return {
        deal: {
          ...deal,
          proposal: null,
          status: "completed",
          outcome: { kind: "picked_up", by: actor, at },
        },
        event: { kind: "picked_up", terms: null },
        statusChange: "sold",
      };
    return {
      deal: {
        ...deal,
        proposal: null,
        status: "cancelled",
        outcome: { kind: "cancelled", by: actor, at },
      },
      event: { kind: "pickup_cancelled", terms: null },
      statusChange: "active",
    };
  }
  if (action.type === "suggest_time" || action.type === "accept_time") {
    const { terms } = action;
    if (!termsComplete(terms)) throw new DealError("terms_incomplete");
    if (
      terms.fulfillment !== "pickup" ||
      terms.amount !== day.terms.amount ||
      terms.pickupPoint !== day.terms.pickupPoint ||
      Date.parse(terms.pickupAt!) === Date.parse(day.terms.pickupAt!)
    )
      throw new DealError("pickup_terms_changed");
    if (Date.parse(terms.pickupAt!) <= now.getTime())
      throw new DealError("pickup_time_past");
    if (!messageStatesTerms(body, terms).ok)
      throw new DealError("terms_not_stated");
    const matches =
      deal.proposal &&
      deal.proposal.by !== actor &&
      sameTerms(deal.proposal.terms, terms);
    if (matches)
      return {
        deal: {
          ...deal,
          agreed: { terms, at },
          proposal: null,
          pickup: emptyPickupSignals(),
        },
        event: { kind: "time_accepted", terms },
      };
    if (action.type === "accept_time") throw new DealError("deal_changed");
    return {
      deal: {
        ...deal,
        proposal: { terms, by: actor, messageId: input.messageId ?? null },
      },
      event: { kind: "time_suggested", terms },
    };
  }
  if (action.type === "keep_time" || action.type === "withdraw_time") {
    if (
      !deal.proposal ||
      (deal.proposal.by === actor) !== (action.type === "withdraw_time")
    )
      throw new DealError("deal_changed");
    return {
      deal: { ...deal, proposal: null },
      event: {
        kind: action.type === "keep_time" ? "time_kept" : "time_withdrawn",
        terms: null,
      },
    };
  }
  if ((action.type === "on_my_way" || action.type === "late") && !day.canSignal)
    throw new DealError(
      day.minutesUntil > 0 ? "too_early" : "pickup_window_ended",
    );
  if (
    (action.type === "no_show" || action.type === "release_no_show") &&
    !day.canReportNoShow
  )
    throw new DealError("too_early");
  const pickup = deal.pickup!;
  switch (action.type) {
    case "on_my_way":
      return {
        deal: {
          ...deal,
          pickup: { ...pickup, onWay: { ...pickup.onWay, [actor]: at } },
        },
        event: { kind: "on_my_way", terms: null },
      };
    case "late":
      return {
        deal: {
          ...deal,
          pickup: {
            ...pickup,
            late: { minutes: action.minutes, by: actor, at },
          },
        },
        event: { kind: "late", terms: null, minutes: action.minutes },
      };
    case "no_show":
      return {
        deal: { ...deal, pickup: { ...pickup, noShow: { by: actor, at } } },
        event: { kind: "no_show", terms: null },
      };
    case "release_no_show":
    case "cancel_pickup": {
      const noShow = action.type === "release_no_show";
      return {
        deal: {
          ...deal,
          proposal: null,
          status: "cancelled",
          outcome: { kind: noShow ? "no_show" : "cancelled", by: actor, at },
          pickup: {
            ...pickup,
            cancelReason: noShow ? "no_show" : action.reason,
          },
        },
        event: {
          kind: noShow ? "no_show_released" : "pickup_cancelled",
          terms: null,
        },
        statusChange: "active",
      };
    }
    case "picked_up":
      if (actor === "seller" && !day.canMarkSold)
        throw new DealError("too_early");
      return actor === "buyer"
        ? {
            deal: { ...deal, pickup: { ...pickup, buyerPickedUpAt: at } },
            event: { kind: "picked_up", terms: null },
          }
        : {
            deal: {
              ...deal,
              proposal: null,
              status: "completed",
              outcome: { kind: "picked_up", by: actor, at },
            },
            event: { kind: "picked_up", terms: null },
            statusChange: "sold",
          };
  }
}
export class DealError extends Error {
  readonly key: string;
  constructor(key: string) {
    super(key);
    this.key = key;
  }
}
const termsComplete = (terms: DealTerms) => missingTerms(terms).length === 0;
const sameTerms = (a: DealTerms, b: DealTerms) =>
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
}): {
  deal: Deal;
  event: DealEvent;
  statusChange?: "active" | "reserved" | "sold";
} {
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
    ...(input.deal && reopenUnagreedDeal(input.deal)),
    version: (input.deal?.version ?? 0) + 1,
    updatedAt: at,
  };
  if (deal.status === "cancelled" && action.type === "propose") {
    if (input.listingStatus !== "active")
      throw new DealError("listing_unavailable");
    Object.assign(deal, {
      status: "open",
      proposal: null,
      agreed: null,
      outcome: null,
      pickup: emptyPickupSignals(),
    });
  }
  if (deal.status === "completed" || deal.status === "cancelled")
    throw new DealError("deal_closed");
  if (action.type === "complete_shipping") {
    if (
      actor !== "seller" ||
      deal.status !== "agreed" ||
      deal.agreed?.terms.fulfillment !== "shipping"
    )
      throw new DealError("shipping_unavailable");
    if (input.listingStatus !== "reserved")
      throw new DealError("listing_unavailable");
    return {
      deal: {
        ...deal,
        status: "completed",
        proposal: null,
        outcome: { kind: "shipped", by: actor, at },
      },
      event: { kind: "completed", terms: null },
      statusChange: "sold",
    };
  }
  const proposal = deal.proposal;
  if (action.type === "cancel") {
    if (deal.status !== "agreed") throw new DealError("deal_not_agreed");
    return {
      deal: {
        ...deal,
        status: "cancelled",
        outcome: { kind: "cancelled", by: actor, at },
        proposal: null,
      },
      event: { kind: "cancelled", terms: null },
      statusChange: "active",
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
  if (action.type === "accept") {
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
  messages: Readonly<ThreadTurnRequest["messages"]>;
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
  if (turn?.forMessageId !== last.id) return "reading";
  return turn.agreement.status === "complete" ? "looks_agreed" : "your_turn";
}
export type DealPhase = ReturnType<typeof dealPhase>;

/** The terms as they stand now: what the latest messages say, then what both already agreed. */
export function turnTerms(
  turn: Pick<ThreadTurn, "facts" | "pickupAt">,
  agreed: DealTerms | null,
): DealTerms {
  const { facts, pickupAt } = turn;
  const meeting =
    facts.pickupTime !== undefined || facts.pickupPoint !== undefined;
  return {
    amount: facts.amount?.value ?? agreed?.amount ?? null,
    fulfillment:
      facts.fulfillment?.value ??
      (meeting ? "pickup" : (agreed?.fulfillment ?? null)),
    pickupAt: facts.pickupTime ? pickupAt : (agreed?.pickupAt ?? null),
    pickupTime: facts.pickupTime?.value ?? agreed?.pickupTime ?? null,
    pickupPoint: facts.pickupPoint?.value ?? agreed?.pickupPoint ?? null,
  };
}

/** Role-relative terms for Pako's thread prompt, without account or message identifiers. */
export function threadDealSnapshot(
  deal: Deal | null,
  role: DealRole,
): ThreadTurnRequest["deal"] {
  if (!deal) return null;
  return {
    status: deal.status,
    agreed: deal.agreed?.terms ?? null,
    proposal: deal.proposal && {
      terms: deal.proposal.terms,
      by: deal.proposal.by === role ? "me" : "them",
    },
  };
}
