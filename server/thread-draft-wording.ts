import { messageStatesTerms } from "../shared/deal.ts";
import type { ThreadFacts, ThreadTurnRequest } from "../shared/threadTurn.ts";
import { containsQuote, messageAmounts, namesTime } from "./quotes.ts";
import {
  amountAllowed,
  campusPointNames,
  isText,
  messageTexts,
  pointAllowed,
  shippingAllowed,
  timeAllowed,
} from "./thread-conversation.ts";
import type { ProposedOption } from "./thread-proposal.ts";

const AGREEMENT_LABEL =
  /\b(?:accept\w*|agree(?:d|ment)?|deal|accepter|accord|annehmen|zustimmen)\b|\bconfirm (?:the |our )?(?:offer|price|sale|pickup|CHF)\b/i;
const PROPOSAL_LABEL =
  /\b(?:propos\w*|suggest\w*|offer|counter\w*|vorschlag\w*|vorschlagen|anbieten)\b/i;
const LISTING_LABEL =
  /\b(?:list(?:ed|ing)|asking|affiché|annonce|inserat|angebotspreis)\b/i;
const PICKUP_TIMES =
  /\b(?:(?:before|after|avant|après|vor|nach)\s+)?(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday|today|tomorrow|tonight|morning|afternoon|evening|weekend|lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche|demain|montag|dienstag|mittwoch|donnerstag|freitag|samstag|sonntag|morgen|\d{1,2}[:h]\d{2}|\d{1,2}\s?(?:am|pm|uhr))\b/gi;

/** Inspect the draft even when the model omitted terms or classified it as a question. */
export function checkOptionLabel(
  option: ProposedOption,
  request: ThreadTurnRequest,
  facts: ThreadFacts,
) {
  const { label, message } = option;
  if (
    AGREEMENT_LABEL.test(label) ||
    /\b(?:we have a deal|it's a deal|deal confirmed|i accept|deal[!,])/i.test(
      message,
    )
  )
    throw new Error(
      "Use conversational wording. Only the deal card confirms an agreement.",
    );

  if (
    /\b(?:still available|still for sale|no longer available|already sold)\b/i.test(
      message,
    ) &&
    !/\b(?:availab(?:le|ility)|unavailable|sold|for sale)\b/i.test(label)
  )
    throw new Error(
      "Disclose the availability reply in the label or leave it out of the message.",
    );

  checkDraftPrices(option, request);
  checkDraftPickup(option, request, facts);
  if (
    /\b(?:i|we)(?:['’]ll| will| can| could| would)\s+(?:ship|post|mail)\b/i.test(
      message,
    ) &&
    !shippingAllowed(request)
  )
    throw new Error("Leave shipping out until the student offers it.");
}

function checkDraftPrices(option: ProposedOption, request: ThreadTurnRequest) {
  const { message, label, terms } = option;
  const conversation = messageTexts(request);
  const mentionedAmounts = conversation.flatMap(messageAmounts);
  const prices =
    message.match(
      /\b(?:CHF\s*\d+(?:[', ]\d{3})*|\d+(?:[', ]\d{3})*\s*(?:CHF|francs?))\b/gi,
    ) ?? [];
  const amounts = new Set(
    prices.map((price) => Number(price.replace(/[^0-9]/g, ""))),
  );
  // A bare "145 works" can name the asking price just as clearly as "CHF 145".
  const priceContext = message.replace(
    /\b\d+(?:[.,]\d+)?[ -]*(?:cm|mm|kg|inch(?:es)?|years?|speeds?)\b/gi,
    "",
  );
  for (const number of messageAmounts(priceContext)) {
    if (number === request.listing.price || mentionedAmounts.includes(number))
      amounts.add(number);
  }
  if (
    terms?.amount !== undefined &&
    option.kind !== "ask" &&
    option.kind !== "answer"
  )
    amounts.add(terms.amount);
  for (const amount of amounts) {
    const discussesTheirOffer =
      (option.kind === "ask" || option.kind === "answer") &&
      /^(?:could|can|may|would) (?:we|i) (?:talk|discuss|ask)\b[^.!?;]*\byour\b[^.!?;]*\boffer\b[^.!?;]*[?？]$/i.test(
        message,
      ) &&
      request.messages.some(
        (entry) =>
          entry.from === "them" && messageAmounts(entry.text).includes(amount),
      );
    if (!discussesTheirOffer && !amountAllowed(amount, option.kind, request))
      throw new Error(
        "Use a price from the conversation, listing or allowed counter range.",
      );
    if (
      !messageStatesTerms(label, {
        amount,
        fulfillment: null,
        pickupAt: null,
        pickupTime: null,
        pickupPoint: null,
      }).ok
    )
      throw new Error(
        "Name the draft's exact CHF amount in the label or remove it.",
      );
    if (mentionedAmounts.includes(amount)) continue;
    if (amount === request.listing.price) {
      if (!LISTING_LABEL.test(label))
        throw new Error(
          "Identify the listing-only amount as listed in the label.",
        );
    } else if (!PROPOSAL_LABEL.test(label))
      throw new Error("Label a new amount as a proposal.");
  }
}

function checkDraftPickup(
  option: ProposedOption,
  request: ThreadTurnRequest,
  facts: ThreadFacts,
) {
  const { message, label, terms } = option;
  const conversation = messageTexts(request);
  const asksForTime =
    option.kind === "ask" &&
    /\b(?:what|which)\b[^.!?]*\b(?:time|window|day)\b[^.!?]*[?？]/i.test(
      message,
    );
  const times = (message.match(PICKUP_TIMES) ?? []).filter(
    (time) =>
      !asksForTime || !/^(?:morning|afternoon|evening|weekend)$/i.test(time),
  );
  const places = [
    request.listing.location,
    request.listing.pickupPoint,
    facts.pickupPoint?.value,
    terms?.pickupPoint,
    ...campusPointNames,
  ].filter(isText);
  const placePhrases = Array.from(
    message.matchAll(
      /\b(?:at|near|outside|inside|chez) (?:the )?([\p{Lu}][\p{L}-]*(?: +[\p{Lu}][\p{L}-]*)*)/gu,
    ),
    ([, place]) => place,
  );
  const details = [
    ...times,
    terms?.pickupTime,
    ...places,
    ...placePhrases,
  ].filter(isText);
  for (const detail of details) {
    if (!containsQuote(message, detail)) continue;
    if (
      !containsQuote(label, detail) &&
      !(detail === terms?.pickupTime && namesTime([label], detail))
    )
      throw new Error(
        "Name every stated day, time and place in the label, or simplify the draft.",
      );
    const clock = /\d/.test(detail) && times.includes(detail);
    const place = placePhrases.includes(detail) || places.includes(detail);
    const asksAboutExistingTime =
      /[?？]$/.test(message) &&
      (option.kind === "ask" || /\bwhich day\b/i.test(message)) &&
      conversation.some((text) => containsQuote(text, detail));
    if (
      (clock && !timeAllowed(detail, request) && !asksAboutExistingTime) ||
      (place && !pointAllowed(detail, request))
    )
      throw new Error(
        "Use concrete pickup terms from the student's words or the deal card.",
      );
    if (
      !conversation.some((text) => containsQuote(text, detail)) &&
      !PROPOSAL_LABEL.test(label)
    )
      throw new Error("Label a new pickup time or place as a proposal.");
  }
}
