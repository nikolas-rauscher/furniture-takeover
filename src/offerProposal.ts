import type { DealRole, DealTerms } from "../shared/deal.ts";
import { formatPickup } from "../shared/pickupTime.ts";
import {
  priceStep,
  roundTo,
  type CounterRange,
  type OfferMode,
} from "./dealOptions.ts";
import { shortPlace, spokenSlot, termPrice } from "./dealWords.ts";

export type Slot = { pickupAt: string; pickupTime: string };

/** Whose terms the card opens with: nobody's for a first offer. */
type TermsFrom = "nobody" | "them" | "you" | "chat";
const TERMS_FROM: Record<OfferMode, TermsFrom> = {
  offer: "nobody",
  counter: "them",
  complete: "them",
  change: "you",
  confirm: "chat",
};

type PriceReason =
  | { kind: "free" }
  | { kind: "under_asking"; percent: number }
  | { kind: "asking" }
  | { kind: "named_in_search" }
  | { kind: "between"; counter: CounterRange }
  | { kind: "kept" };
type TimeReason = "earliest" | "kept" | "none";
type PlaceReason = "kept" | "listing" | "home" | "none";

/** The terms Pako fills in, each with the fact it comes from. */
export type OfferProposal = {
  amount: number;
  slot: Slot | null;
  place: string | null;
  reasons: { price: PriceReason; time: TimeReason; place: PlaceReason };
};

/** A future pickup the card can start from, such as the time the other student named. */
export const futureSlot = (terms: DealTerms, now: Date): Slot | null =>
  terms.pickupAt && Date.parse(terms.pickupAt) > now.getTime()
    ? { pickupAt: terms.pickupAt, pickupTime: formatPickup(terms.pickupAt) }
    : null;

/**
 * A first offer: the price the student named in the search chat, or a step
 * about 10 % under the asking price while that leaves room.
 */
function firstOfferPrice(
  asking: number,
  namedPrice: number | null,
): { amount: number; reason: PriceReason } {
  if (namedPrice !== null)
    return { amount: namedPrice, reason: { kind: "named_in_search" } };
  const under = roundTo(asking * 0.9, priceStep(asking));
  if (under >= asking) return { amount: asking, reason: { kind: "asking" } };
  const percent = Math.round((1 - under / asking) * 100);
  return { amount: under, reason: { kind: "under_asking", percent } };
}

function proposedPrice({
  mode,
  terms,
  asking,
  counter,
  counterChoices,
  namedPrice,
}: ProposalInput): { amount: number; reason: PriceReason } {
  if (asking === 0) return { amount: 0, reason: { kind: "free" } };
  if (mode === "offer") return firstOfferPrice(asking, namedPrice);
  const middle = counterChoices[Math.floor(counterChoices.length / 2)];
  if (mode === "counter" && counter && middle !== undefined)
    return { amount: middle, reason: { kind: "between", counter } };
  return terms.amount === null
    ? { amount: asking, reason: { kind: "asking" } }
    : { amount: terms.amount, reason: { kind: "kept" } };
}

type ProposalInput = {
  mode: OfferMode;
  /** The terms the card opens with. */
  terms: DealTerms;
  asking: number;
  counter: CounterRange | undefined;
  /** Prices between both sides' latest, when countering. */
  counterChoices: number[];
  /** A price the student named to Pako in the search chat. */
  namedPrice: number | null;
  /** Pickup times that fit the listing, earliest first. */
  slots: Slot[];
  listingPoint: string | undefined;
  homePoint: string | undefined;
  now: Date;
};

/**
 * Pako's complete proposal from facts on this device only: a price from the
 * asking price, the other side's or the search chat, the earliest pickup that
 * fits the listing, and the listing's meeting point or the one near the
 * student. Confirming terms read from the messages waits for the student's
 * own time.
 */
export function proposeOffer(input: ProposalInput): OfferProposal {
  const { mode, terms, slots, listingPoint, homePoint, now } = input;
  const price = proposedPrice(input);
  const kept = futureSlot(terms, now);
  const earliest = mode === "confirm" ? undefined : slots[0];
  const place: [string, PlaceReason] | null = terms.pickupPoint
    ? [terms.pickupPoint, "kept"]
    : listingPoint
      ? [listingPoint, "listing"]
      : homePoint
        ? [homePoint, "home"]
        : null;
  return {
    amount: price.amount,
    slot: kept ?? earliest ?? null,
    place: place?.[0] ?? null,
    reasons: {
      price: price.reason,
      time: kept ? "kept" : earliest ? "earliest" : "none",
      place: place?.[1] ?? "none",
    },
  };
}

/** The terms the student changed after Pako proposed them. */
export type ChangedTerms = { price: boolean; time: boolean; place: boolean };

type LineContext = {
  mode: OfferMode;
  role: DealRole;
  otherName: string;
  /** The seller's own words about when they are free, such as "Weekend pickup". */
  available: string;
  shipping: boolean;
  now: Date;
};

function priceSentence(
  { amount, reasons }: OfferProposal,
  { mode, otherName }: LineContext,
) {
  const price = termPrice(amount);
  const reason = reasons.price;
  switch (reason.kind) {
    case "free":
      return "It's free, so there's only the pickup to plan.";
    case "under_asking":
      return `I'd offer ${price}, about ${reason.percent}% under the asking price, so there's room to meet in the middle.`;
    case "asking":
      return mode === "offer"
        ? `I'd offer the asking price of ${price}, since there's little room under it.`
        : `I put in the asking price of ${price}.`;
    case "named_in_search":
      return `I'd offer ${price}, the price you named when we searched.`;
    case "between":
      return counterSentence(price, reason.counter, otherName);
    case "kept":
      return keptPriceSentence(price, TERMS_FROM[mode], otherName);
  }
}

function counterSentence(
  price: string,
  { theirs, mine, mineFrom }: CounterRange,
  otherName: string,
) {
  const their = `${otherName}'s ${termPrice(theirs)}`;
  if (mineFrom === "below")
    return `I'd counter with ${price}, a little under ${their}, so you can meet in the middle.`;
  const your =
    mineFrom === "asking"
      ? `your asking price of ${termPrice(mine)}`
      : `your ${termPrice(mine)}`;
  return `I'd counter with ${price}, between ${their} and ${your}.`;
}

function keptPriceSentence(price: string, from: TermsFrom, otherName: string) {
  if (from === "them") return `I kept ${otherName}'s ${price}.`;
  if (from === "chat") return `I read ${price} in your messages.`;
  return `I kept your ${price}.`;
}

/** "the seller's weekend pickup", or the seller's own words when they say more. */
function availabilityWords(available: string, role: DealRole) {
  const owner = role === "seller" ? "your" : "the seller's";
  const words = available.trim();
  if (!words) return null;
  return /pickup$/i.test(words)
    ? `${owner} ${words.toLowerCase()}`
    : `${owner} times (“${words}”)`;
}

function timeClause(proposal: OfferProposal, context: LineContext) {
  const { slot, reasons } = proposal;
  if (!slot) return null;
  const when = spokenSlot(slot.pickupAt, context.now);
  if (reasons.time === "earliest") {
    const fits = availabilityWords(context.available, context.role);
    return fits
      ? `${when} fits ${fits}`
      : `${when} is the earliest time I found`;
  }
  const from = TERMS_FROM[context.mode];
  if (from === "them")
    return `${when} is the time ${context.otherName} suggested`;
  if (from === "chat") return `${when} is the time from your messages`;
  return `${when} is your time`;
}

function placeClause({ place, reasons }: OfferProposal, context: LineContext) {
  if (!place) return null;
  const at = `at ${shortPlace(place)}`;
  switch (reasons.place) {
    case "listing":
      return context.role === "seller"
        ? `${at}, your listing's meeting point`
        : `${at}, the listing's meeting point`;
    case "home":
      return `${at}, near where you search`;
    default:
      return TERMS_FROM[context.mode] === "them"
        ? `${at}, where ${context.otherName} suggested`
        : at;
  }
}

/** The pickup in one sentence, and what the student still picks. */
function pickupSentence(
  time: string | null,
  place: string | null,
  missing: { time: boolean; place: boolean },
) {
  if (time && place) return `${time}, ${place}.`;
  if (time)
    return missing.place
      ? `${time}. Pick a meeting point to send.`
      : `${time}.`;
  if (place)
    return missing.time
      ? `We'd meet ${place}. Pick a pickup time and I'll add it.`
      : `We'd meet ${place}.`;
  if (missing.time && missing.place)
    return "Pick a time and a meeting point and I'll add them.";
  return missing.time ? "Pick a pickup time and I'll add it." : null;
}

/**
 * What Pako says about his proposal, in his voice, with the reason for each
 * term he filled in. A term the student changed drops out of his line; once
 * every term is theirs, he only acknowledges.
 */
export function proposalLine(
  proposal: OfferProposal,
  changed: ChangedTerms,
  context: LineContext,
): string {
  const price = changed.price ? null : priceSentence(proposal, context);
  if (context.shipping) return price ?? "Got it. The message has your price.";
  const kept =
    changed.time || changed.place
      ? null
      : keptPickupSentence(proposal, context);
  const pickup = kept ?? pickupSentenceFor(proposal, changed, context);
  const line = [price, pickup].filter(Boolean).join(" ");
  return line || "Got it. Your changes are in the message.";
}

/** A time and place both kept from the terms the card opened with, said once. */
function keptPickupSentence(
  { slot, place, reasons }: OfferProposal,
  { mode, otherName, now }: LineContext,
) {
  if (!slot || !place || reasons.time !== "kept" || reasons.place !== "kept")
    return null;
  const pickup = `${spokenSlot(slot.pickupAt, now)} at ${shortPlace(place)}`;
  const from = TERMS_FROM[mode];
  if (from === "them") return `${pickup} stays as ${otherName} suggested.`;
  if (from === "chat") return `${pickup}, as in your messages.`;
  return `${pickup} stays as you had it.`;
}

function pickupSentenceFor(
  proposal: OfferProposal,
  changed: ChangedTerms,
  context: LineContext,
) {
  return pickupSentence(
    changed.time ? null : timeClause(proposal, context),
    changed.place ? null : placeClause(proposal, context),
    {
      time: !changed.time && !proposal.slot,
      place: !changed.place && !proposal.place,
    },
  );
}
