import { campusPickupPoints } from "../shared/campusPickupPoints.ts";
import { resolvePickupAt } from "../shared/pickupTime.ts";
import type { ThreadFacts, ThreadTurnRequest } from "../shared/threadTurn.ts";
import {
  containsQuote,
  messageAmounts,
  namesTime,
  quoteSupportsHandover,
} from "./quotes.ts";
import type { ProposedOption } from "./thread-proposal.ts";

/* What a conversation names, and so which terms Pako may repeat in a reply. */

export const isText = (text: string | undefined): text is string =>
  Boolean(text);
export const messageTexts = (request: ThreadTurnRequest) =>
  request.messages.map((message) => message.text);
export const ownTexts = (request: ThreadTurnRequest) =>
  [
    request.draft,
    request.instruction,
    ...request.messages
      .filter((message) => message.from === "me")
      .map((message) => message.text),
  ].filter(isText);
export const cardTerms = (request: ThreadTurnRequest) =>
  [request.deal?.agreed, request.deal?.proposal?.terms].filter(
    (terms) => terms != null,
  );
export const listingTexts = ({ listing }: ThreadTurnRequest) =>
  [
    listing.title,
    listing.description,
    listing.location,
    listing.condition,
    listing.dimensions,
    listing.pickup,
    listing.pickupPoint,
  ].filter(isText);

/** The last amount one side named in its messages. */
function latestAmount(request: ThreadTurnRequest, side: "me" | "them") {
  for (const message of [...request.messages].reverse()) {
    if (message.from !== side) continue;
    const amounts = messageAmounts(message.text);
    if (amounts.length) return amounts.at(-1);
  }
  return undefined;
}

/**
 * An option may name an amount from the conversation or the listing price; a
 * counter-offer also any whole franc between the buyer's and the seller's
 * latest amounts. A free listing has no price to talk about.
 */
export function amountAllowed(
  amount: number,
  kind: ProposedOption["kind"],
  request: ThreadTurnRequest,
) {
  const { listing } = request;
  if (listing.price === 0) return amount === 0;
  const named = [
    listing.price,
    ...ownTexts(request).flatMap(messageAmounts),
    ...cardTerms(request).map((terms) => terms.amount),
  ];
  if (named.includes(amount)) return true;
  if (kind !== "counter") return false;
  const mine =
    latestAmount(request, "me") ??
    (request.role === "seller" ? listing.price : undefined);
  const theirs =
    latestAmount(request, "them") ??
    (request.role === "buyer" ? listing.price : undefined);
  return (
    mine !== undefined &&
    theirs !== undefined &&
    amount <= Math.max(listing.price, mine) &&
    amount > Math.min(mine, theirs) &&
    amount < Math.max(mine, theirs)
  );
}

export const campusPointNames = campusPickupPoints.map((point) =>
  point.name.toLowerCase(),
);
/** Words every meeting point shares, which name none of them. */
const GENERIC_PLACE_WORDS = new Set([
  "fmel",
  "outside",
  "inside",
  "entrance",
  "reception",
  "center",
  "centre",
  "front",
  "main",
  "hall",
  "metro",
  "station",
  "unil",
  "lausanne",
]);

/**
 * Whether a quote names a meeting point: the point's words stand in the quote,
 * or the point is the listing's or a campus meeting point and the quote names
 * it by one of its own words, as in "at the Vortex" for "FMEL Vortex · outside
 * reception".
 */
export function namesPlace(
  quote: string,
  point: string,
  request: ThreadTurnRequest,
) {
  if (containsQuote(quote, point)) return true;
  const known =
    campusPointNames.includes(point.toLowerCase()) ||
    point.toLowerCase() === request.listing.pickupPoint?.toLowerCase();
  return (
    known &&
    point
      .split(/[^\p{L}\p{N}]+/u)
      .filter(
        (word) =>
          word.length >= 4 && !GENERIC_PLACE_WORDS.has(word.toLowerCase()),
      )
      .some((word) => containsQuote(quote, word))
  );
}

export function pointAllowed(point: string, request: ThreadTurnRequest) {
  return (
    ownTexts(request).some((text) => namesPlace(text, point, request)) ||
    cardTerms(request).some(
      (terms) => terms.pickupPoint?.toLowerCase() === point.toLowerCase(),
    ) ||
    namesPlace(request.listing.pickupPoint ?? "", point, request) ||
    containsQuote(request.listing.location ?? "", point) ||
    campusPointNames.includes(point.toLowerCase())
  );
}

export function resolveWrittenPickup(
  words: string,
  request: ThreadTurnRequest,
  now: Date,
  fact?: NonNullable<ThreadFacts["pickupTime"]>,
) {
  const source = [...request.messages]
    .reverse()
    .find((message) =>
      fact
        ? message.from === fact.from && containsQuote(message.text, fact.quote)
        : message.from === "me" && namesTime([message.text], words),
    );
  if (source) return resolvePickupAt(words, new Date(source.at));
  if (
    !fact &&
    /\b(?:today|tomorrow|tonight|demain|heute|morgen)\b/i.test(words) &&
    !namesTime([request.draft ?? "", request.instruction ?? ""], words)
  )
    return null;
  return resolvePickupAt(words, now);
}

export function timeAllowed(words: string, request: ThreadTurnRequest) {
  return (
    namesTime(ownTexts(request), words) ||
    cardTerms(request).some(
      (terms) => terms.pickupTime && namesTime([terms.pickupTime], words),
    ) ||
    (request.role === "seller" &&
      namesTime([request.listing.pickup ?? ""], words))
  );
}

export function shippingAllowed(request: ThreadTurnRequest) {
  return (
    ownTexts(request).some((text) => quoteSupportsHandover(text, "shipping")) ||
    cardTerms(request).some((terms) => terms.fulfillment === "shipping")
  );
}
