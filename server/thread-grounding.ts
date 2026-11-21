import { missingTerms, turnTerms } from "../shared/deal.ts";
import { resolvePickupAt } from "../shared/pickupTime.ts";
import {
  threadTurnSchema,
  type ThreadFacts,
  type ThreadTurn,
  type ThreadTurnRequest,
} from "../shared/threadTurn.ts";
import {
  containsQuote,
  messageAmounts,
  namesTime,
  quoteNumbers,
  quoteSupportsHandover,
} from "./quotes.ts";
import {
  cardTerms,
  listingTexts,
  namesPlace,
  ownTexts,
  resolveWrittenPickup,
  shippingAllowed,
} from "./thread-conversation.ts";
import { checkedOptions } from "./thread-options.ts";
import type { Proposal } from "./thread-proposal.ts";
import { checkSafeText } from "./thread-safe-text.ts";

type QuotedFact = { quote: string; from: "me" | "them" | "listing" };

/** Where a fact's quote must come from, in the words the repair hint uses. */
const QUOTE_SOURCES: Record<QuotedFact["from"], string> = {
  me: 'one of the messages from "me"',
  them: 'one of the messages from "them"',
  listing: "the listing's text",
};

function checkQuote(
  where: string,
  fact: QuotedFact,
  request: ThreadTurnRequest,
) {
  const sources =
    fact.from === "listing"
      ? listingTexts(request)
      : request.messages
          .filter((message) => message.from === fact.from)
          .map((message) => message.text);
  if (!sources.some((text) => containsQuote(text, fact.quote)))
    throw new Error(
      `${where}: copy the quote exactly from ${QUOTE_SOURCES[fact.from]}, or leave this fact out.`,
    );
}

/** Every fact quotes the words it comes from, and its value stands in them. */
function checkFacts(facts: ThreadFacts, request: ThreadTurnRequest) {
  const { amount, fulfillment, pickupTime, pickupPoint } = facts;
  if (amount) {
    if (amount.from === "listing")
      throw new Error(
        "facts.amount: only a message can set the amount, not the listing.",
      );
    checkQuote("facts.amount", amount, request);
    if (!quoteNumbers(amount.quote).includes(amount.value))
      throw new Error("facts.amount: the amount must appear in its quote.");
  }
  if (fulfillment) {
    checkQuote("facts.fulfillment", fulfillment, request);
    if (!quoteSupportsHandover(fulfillment.quote, fulfillment.value))
      throw new Error(
        "facts.fulfillment: quote the words that say pickup or shipping, or leave fulfillment out; a pickup time or place already means pickup.",
      );
  }
  if (pickupTime) {
    checkQuote("facts.pickupTime", pickupTime, request);
    if (!namesTime([pickupTime.quote], pickupTime.value))
      throw new Error(
        "facts.pickupTime: use only the day and time words its quote names.",
      );
  }
  if (pickupPoint) {
    checkQuote("facts.pickupPoint", pickupPoint, request);
    if (!namesPlace(pickupPoint.quote, pickupPoint.value, request))
      throw new Error(
        "facts.pickupPoint: the quote must name this place; copy the place's words from it.",
      );
  }
}

/** Agreement is worked out from the checked facts, never taken from the model. */
function agreementOf(
  proposal: Proposal,
  request: ThreadTurnRequest,
  pickupAt: string | null,
  now: Date,
): ThreadTurn["agreement"] {
  if (proposal.stance !== "accepts") return { status: "none", missing: [] };
  if (Object.values(proposal.facts).some((fact) => fact.from === "listing"))
    throw new Error(
      "For an acceptance, quote the students' messages for each agreed detail. Omit listing-only details.",
    );
  const terms = turnTerms(
    { facts: proposal.facts, pickupAt },
    request.deal?.agreed ?? null,
  );
  const { amount, fulfillment, pickupTime, pickupPoint } = terms;
  const opening = request.messages.at(-1);
  const ownsPickupAt =
    pickupTime &&
    request.messages.some(
      (message) =>
        message.from === "me" &&
        namesTime([message.text], pickupTime) &&
        resolvePickupAt(pickupTime, new Date(message.at)) === pickupAt,
    );
  const matchingCardTime = cardTerms(request).some(
    (card) =>
      card.pickupAt === pickupAt &&
      (pickupAt !== null || card.pickupTime === pickupTime),
  );
  if (
    (amount !== null &&
      !ownTexts(request).some((text) =>
        messageAmounts(text).includes(amount),
      ) &&
      !cardTerms(request).some((card) => card.amount === amount)) ||
    (fulfillment === "shipping" && !shippingAllowed(request)) ||
    (pickupTime && !ownsPickupAt && !matchingCardTime) ||
    (pickupPoint &&
      !ownTexts(request).some((text) =>
        namesPlace(text, pickupPoint, request),
      ) &&
      !cardTerms(request).some((card) => card.pickupPoint === pickupPoint))
  )
    throw new Error(
      "Do not treat terms as agreed if they came only from the other student's message.",
    );
  if (opening?.from !== "them")
    throw new Error("Only a reply from the other student can accept.");
  const missing = missingTerms(terms);
  if (
    terms.fulfillment === "pickup" &&
    terms.pickupAt &&
    Date.parse(terms.pickupAt) <= now.getTime()
  )
    missing.push("pickupTime");
  return missing.length
    ? { status: "partial", missing }
    : { status: "complete", missing: [] };
}

/** Checks Pako's proposal against the conversation and adds what the server works out. */
export function groundProposal(
  proposal: Proposal,
  request: ThreadTurnRequest,
  now: Date,
  runId: string,
): ThreadTurn {
  checkSafeText(proposal.summary, "summary");
  checkFacts(proposal.facts, request);
  const pickupAt = proposal.facts.pickupTime
    ? resolveWrittenPickup(
        proposal.facts.pickupTime.value,
        request,
        now,
        proposal.facts.pickupTime,
      )
    : null;
  return threadTurnSchema.parse({
    forMessageId: request.messages.at(-1)?.id ?? null,
    summary: proposal.summary,
    language: proposal.language,
    stance: proposal.stance,
    facts: proposal.facts,
    pickupAt,
    agreement: agreementOf(proposal, request, pickupAt, now),
    options: checkedOptions(proposal, request, now, runId),
  });
}
