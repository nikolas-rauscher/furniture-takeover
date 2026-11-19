import { formatPickup } from "./pickupTime.ts";
import type { DealRole, DealTerms } from "./deal.ts";
import type { NegotiationTerms } from "./negotiation.ts";

/** The words students send about a deal, in one place so every screen says the same. */

/** The buyer's opening message, prepared with Pako in the search chat. */
export function draftMessage(title: string, terms: NegotiationTerms): string {
  const parts = [`Hi, I'm interested in your ${title}. Is it still available?`];
  if (terms.amount !== null)
    parts.push(`Would you accept CHF ${terms.amount}?`);
  if (terms.fulfillment === "shipping")
    parts.push(
      "Would shipping be possible, and what would the total including shipping be?",
    );
  else if (
    terms.fulfillment === "pickup" ||
    terms.pickupTime ||
    terms.pickupPoint
  ) {
    parts.push(
      terms.pickupTime
        ? `Would pickup ${terms.pickupTime} work for you?`
        : "When would pickup work for you?",
    );
    parts.push(
      terms.pickupPoint
        ? `Could we meet at ${terms.pickupPoint}?`
        : "Where would you like to meet for pickup?",
    );
  } else parts.push("How would you prefer to arrange handover?");
  if (terms.note) parts.push(terms.note);
  return parts.join(" ");
}

/** A friendly check-in after a day without an answer: it asks, it never pushes. */
export function nudgeMessage(role: DealRole, title: string): string {
  return role === "buyer"
    ? `Hi! Just checking in: is the ${title} still available?`
    : `Hi! Just checking in: are you still interested in the ${title}?`;
}

/** When the item is reserved, a buyer can still ask to be next. */
export function askToBeNextMessage(title: string): string {
  return `Hi! If the ${title} becomes available again, I'd still like it. Could you let me know?`;
}

function statedTerms(terms: DealTerms) {
  const price =
    terms.amount === null
      ? null
      : terms.amount === 0
        ? "free"
        : `CHF ${terms.amount}`;
  const time = terms.pickupAt ? formatPickup(terms.pickupAt) : terms.pickupTime;
  return [
    price,
    terms.fulfillment === "shipping"
      ? "shipping"
      : terms.fulfillment === "pickup"
        ? "pickup"
        : null,
    time,
    terms.pickupPoint,
  ]
    .filter(Boolean)
    .join(" · ");
}
export const offerMessage = (title: string, t: DealTerms) =>
  `Hi! I'm interested in your ${title}. Would this work for you? ${statedTerms(t)}`.trim();
export const counterMessage = (t: DealTerms) =>
  `Thanks! How about ${statedTerms(t)}?`;
export const acceptMessage = (role: DealRole, t: DealTerms) =>
  `Deal! ${role === "seller" ? "It's yours. " : ""}${statedTerms(t)}.`;
export const confirmAgreementMessage = (t: DealTerms) =>
  `Great, confirming: ${statedTerms(t)}.`;
export const askToConfirmMessage = () =>
  "Could you tap Confirm on the deal card?";
export const declineMessage = () =>
  "Thanks for the offer, but I'll pass on that one.";
export const withdrawMessage = () => "Sorry, I'm withdrawing my offer.";
export const cancelDealMessage = () =>
  "Sorry, I have to cancel our deal. Thanks for understanding.";
export const reservedElsewhereMessage = (title: string) =>
  `Sorry, the ${title} is now reserved for someone else. I'll let you know if that changes.`;
