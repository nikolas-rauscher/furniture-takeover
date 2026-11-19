import { formatPickup } from "./pickupTime.ts";
import type { DealRole, DealTerms, LateMinutes } from "./deal.ts";
import type { NegotiationTerms } from "./negotiationTerms.ts";

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

function priceWords({ amount, fulfillment }: DealTerms): string {
  const price = amount === 0 ? "free" : amount === null ? "" : `CHF ${amount}`;
  return price && fulfillment === "shipping" ? `${price} with shipping` : price;
}

function pickupWords(terms: DealTerms): string {
  const time = terms.pickupAt ? formatPickup(terms.pickupAt) : terms.pickupTime;
  return [time, terms.pickupPoint && `at ${terms.pickupPoint}`]
    .filter(Boolean)
    .join(" ");
}

export function offerMessage(title: string, terms: DealTerms): string {
  const price = priceWords(terms);
  const pickup = pickupWords(terms);
  const sentences = [`Hi! I'd like your ${title}.`];
  if (terms.amount === 0) sentences.push(`Could I have it for ${price}?`);
  else if (price) sentences.push(`Would you take ${price}?`);
  if (pickup) sentences.push(`I could pick it up ${pickup}.`);
  else if (terms.fulfillment === "pickup")
    sentences.push("When could I pick it up?");
  else if (terms.fulfillment === "shipping" && !price)
    sentences.push("Could you ship it?");
  return sentences.join(" ");
}

export function counterMessage(terms: DealTerms): string {
  const price = priceWords(terms);
  const pickup = pickupWords(terms);
  const question = price ? `Could we do this for ${price}?` : "";
  if (pickup)
    return `Thanks! ${question ? question + " " : ""}Could we meet ${pickup}?`;
  if (terms.fulfillment === "pickup")
    return `Thanks! ${question ? question + " " : ""}Would pickup work?`;
  return `Thanks! ${question || (terms.fulfillment === "shipping" ? "Could we arrange shipping?" : "Could we work out the details?")}`;
}

function meetingSentence(terms: DealTerms): string {
  const pickup = pickupWords(terms);
  if (pickup) return ` See you ${pickup}!`;
  if (terms.fulfillment === "pickup") return " Let's arrange pickup.";
  if (terms.fulfillment === "shipping" && terms.amount === null)
    return " Let's arrange shipping.";
  return "";
}

export function acceptMessage(role: DealRole, terms: DealTerms): string {
  const price = priceWords(terms);
  const action = role === "seller" ? "It's yours" : "I'll take it";
  return `Deal! ${action}${price ? ` for ${price}` : ""}.${meetingSentence(terms)}`;
}

/**
 * The first confirmation of terms both students talked about: it states them
 * and asks the other side to confirm, so it never sounds booked yet.
 */
export function confirmAgreementMessage(terms: DealTerms): string {
  const price = priceWords(terms);
  const pickup = pickupWords(terms);
  const agreeing =
    terms.amount === 0
      ? "Great, free it is."
      : price
        ? `I can do ${price}.`
        : "That works for me.";
  if (pickup) return `${agreeing} Can you confirm pickup ${pickup}?`;
  return terms.fulfillment === "shipping"
    ? `${agreeing} Can you confirm shipping?`
    : `${agreeing} Can you confirm?`;
}

export const askToConfirmMessage = () =>
  "Could you confirm the offer in the deal card?";
export const declineMessage = () =>
  "Thanks for the offer, but I'll pass on that one.";
export const withdrawMessage = () => "Sorry, I'm withdrawing my offer.";
export const cancelDealMessage = () =>
  "Sorry, I have to cancel our deal. Thanks for understanding.";
export const reservedElsewhereMessage = (title: string) =>
  `Sorry, the ${title} is now reserved for someone else. I'll let you know if that changes.`;

export const changeTimeMessage = (terms: DealTerms) =>
  `Could we move pickup to ${pickupWords(terms)}? Still ${terms.amount === 0 ? "CHF 0" : priceWords(terms)}.`;
export const acceptNewTimeMessage = (terms: DealTerms) =>
  `The new time works for me. See you ${pickupWords(terms)} for ${priceWords(terms)}.`;
export const withdrawTimeMessage = (terms: DealTerms) =>
  `Let's keep ${pickupWords(terms)} after all.`;
export const keepTimeMessage = (terms: DealTerms) =>
  `Sorry, that doesn't work for me. Can we keep ${pickupWords(terms)} for ${priceWords(terms)}?`;
export const onMyWayMessage = (terms: DealTerms) =>
  `On my way! See you ${pickupWords(terms)}.`;
export const lateMessage = (minutes: LateMinutes) =>
  `Running about ${minutes} minutes late, sorry! See you soon.`;
export const cantMakeItMessage = () =>
  "Sorry, I can't make it anymore and need to cancel. Thanks for understanding.";
export const noShowCheckMessage = (terms: DealTerms) =>
  `Hi, I've been waiting at ${terms.pickupPoint} since ${terms.pickupAt ? formatPickup(terms.pickupAt) : terms.pickupTime}. Are you still coming?`;
export const noShowReleaseMessage = (title: string, role: DealRole) =>
  role === "seller"
    ? `We didn't manage to meet, so I'm making the ${title} available again.`
    : "We didn't manage to meet, so I'm cancelling our pickup.";
export const pickedUpMessage = (role: DealRole, title: string) =>
  role === "seller" ? `Thanks, enjoy the ${title}!` : "Got it, thanks a lot!";
export const availableAgainMessage = (title: string) =>
  `Hi! The ${title} is available again. Are you still interested?`;
