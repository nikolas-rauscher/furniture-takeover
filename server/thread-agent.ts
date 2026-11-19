import { createDeepSeek } from "@ai-sdk/deepseek";
import {
  InvalidToolInputError,
  stepCountIs,
  tool,
  ToolLoopAgent,
  type LanguageModel,
} from "ai";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { campusPickupPoints } from "../shared/campusPickupPoints.ts";
import {
  messageStatesTerms,
  missingTerms,
  type DealTerms,
  turnTerms,
} from "../shared/deal.ts";
import { formatPickup, resolvePickupAt } from "../shared/pickupTime.ts";
import {
  OTHER_TOKEN,
  THREAD_OPTION_KINDS,
  THREAD_STANCES,
  threadFactsSchema,
  threadTurnRequestSchema,
  threadTurnSchema,
  type ThreadFacts,
  type ThreadTurn,
  type ThreadTurnRequest,
} from "../shared/threadTurn.ts";
import { AgentError } from "./errors.ts";
import {
  containsQuote,
  messageAmounts,
  namesTime,
  quoteNumbers,
  quoteSupportsHandover,
} from "./quotes.ts";
import { threadInstructions } from "./thread-instructions.ts";

export type ThreadAgentConfig = {
  apiKey: string;
  baseUrl?: string;
  model?: string;
  fetchImpl?: typeof fetch;
  /** Inject the official SDK mock model in tests; never supplied by HTTP callers. */
  modelImpl?: LanguageModel;
  /** The clock pickup words resolve against; tests fix it. */
  now?: () => Date;
  timeoutMs?: number;
};
export type ThreadAgent = {
  /** Whether a model key is set, so a reading can run at all. */
  configured: boolean;
  turn(request: ThreadTurnRequest, signal?: AbortSignal): Promise<ThreadTurn>;
};

const TURN_LIMIT_MS = 20_000;
/** One reading plus two repairs after a failed check. */
const MAX_STEPS = 3;
const MAX_OUTPUT_TOKENS = 1_200;
const TOOL_NAME = "propose_next_message";
const ZONE = "Europe/Zurich";

const proposedTermsSchema = z
  .object({
    amount: z.number().int().min(0).max(1_000_000).optional(),
    fulfillment: z.enum(["pickup", "shipping"]).optional(),
    pickupTime: z.string().trim().min(1).max(240).optional(),
    pickupPoint: z.string().trim().min(1).max(240).optional(),
  })
  .strict();
const proposalSchema = z
  .object({
    summary: z.string().trim().min(1).max(200),
    language: z
      .string()
      .trim()
      .regex(/^[a-z]{2}$/),
    stance: z.enum(THREAD_STANCES),
    facts: threadFactsSchema,
    options: z
      .array(
        z
          .object({
            label: z.string().trim().min(1).describe("At most 40 characters."),
            kind: z.enum(THREAD_OPTION_KINDS),
            message: z
              .string()
              .trim()
              .min(1)
              .max(600)
              .optional()
              .describe(
                "For a short question, write the complete question as label and omit message. Otherwise write a draft containing only what the label says.",
              ),
            terms: proposedTermsSchema.optional(),
          })
          .strict()
          .transform((option) => ({
            ...option,
            message:
              option.message ??
              (option.kind === "ask" && /[?？]$/.test(option.label)
                ? option.label
                : ""),
          })),
      )
      .max(3),
  })
  .strict();
type Proposal = z.infer<typeof proposalSchema>;
type ProposedOption = Proposal["options"][number];
type QuotedFact = { quote: string; from: "me" | "them" | "listing" };

export function validateThreadTurnRequest(input: unknown): ThreadTurnRequest {
  const parsed = threadTurnRequestSchema.safeParse(input);
  if (!parsed.success)
    throw new AgentError(
      400,
      "INVALID_THREAD_REQUEST",
      "Pako couldn't read this conversation. Reload it and try again.",
    );
  return parsed.data;
}

const isText = (text: string | undefined): text is string => Boolean(text);
const messageTexts = (request: ThreadTurnRequest) =>
  request.messages.map((message) => message.text);
const ownTexts = (request: ThreadTurnRequest) => [
  request.draft,
  request.instruction,
  ...request.messages.filter((message) => message.from === "me").map((message) => message.text),
].filter(isText);
const cardTerms = (request: ThreadTurnRequest) =>
  [request.deal?.agreed, request.deal?.proposal?.terms].filter((terms) => terms != null);
const listingTexts = ({ listing }: ThreadTurnRequest) =>
  [
    listing.title,
    listing.description,
    listing.location,
    listing.condition,
    listing.dimensions,
    listing.pickup,
    listing.pickupPoint,
  ].filter(isText);

const CONTACT_DETAILS = [
  /https?:\/\//i,
  /\bwww\./i,
  /[^\s@]+@[^\s@]+\.[a-z]{2,}/i,
  /\+?\d(?:[\s\-/().]?\d){6,}/,
];

/** Pako's words carry no links or contact details, and no placeholder but the other student's. */
function checkSafeText(text: string, where: string) {
  if (CONTACT_DETAILS.some((pattern) => pattern.test(text)))
    throw new Error(
      `${where}: remove links, email addresses and phone numbers.`,
    );
  if (
    /\b(?:twint|paypal|iban|revolut|bank transfer|wire transfer|gift cards?|crypto)\b/i.test(text) ||
    /\b(?:prepay\w*|upfront payment|advance payment|paiement d'avance|vorkasse)\b|\b(?:pay\w*|send|transfer|deposit)\b[^.!?;]*\b(?:in advance|up ?front|ahead of time|before (?:pickup|collect\w*|meeting|delivery|shipping))\b/i.test(text)
  ) throw new Error(`${where}: leave payment methods and advance payment out of the reply.`);
  if (/[{}]/.test(text.replaceAll(OTHER_TOKEN, "")))
    throw new Error(
      `${where}: the only placeholder allowed is ${OTHER_TOKEN}.`,
    );
}

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
function amountAllowed(
  amount: number,
  kind: ProposedOption["kind"],
  request: ThreadTurnRequest,
) {
  const { listing } = request;
  if (listing.price === 0) return amount === 0;
  const named = [listing.price, ...ownTexts(request).flatMap(messageAmounts),
    ...cardTerms(request).map((terms) => terms.amount)];
  if (named.includes(amount)) return true;
  if (kind !== "counter") return false;
  const mine = latestAmount(request, "me") ?? (request.role === "seller" ? listing.price : undefined);
  const theirs = latestAmount(request, "them") ?? (request.role === "buyer" ? listing.price : undefined);
  return mine !== undefined && theirs !== undefined &&
    amount <= Math.max(listing.price, mine) &&
    amount > Math.min(mine, theirs) && amount < Math.max(mine, theirs);
}

const campusPointNames = campusPickupPoints.map((point) =>
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
function namesPlace(quote: string, point: string, request: ThreadTurnRequest) {
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

function pointAllowed(point: string, request: ThreadTurnRequest) {
  return ownTexts(request).some((text) => namesPlace(text, point, request)) ||
    cardTerms(request).some((terms) => terms.pickupPoint?.toLowerCase() === point.toLowerCase()) ||
    namesPlace(request.listing.pickupPoint ?? "", point, request) ||
    containsQuote(request.listing.location ?? "", point) ||
    campusPointNames.includes(point.toLowerCase());
}

function resolveWrittenPickup(
  words: string,
  request: ThreadTurnRequest,
  now: Date,
  fact?: NonNullable<ThreadFacts["pickupTime"]>,
) {
  const source = [...request.messages].reverse().find((message) =>
    fact
      ? message.from === fact.from && containsQuote(message.text, fact.quote)
      : message.from === "me" && namesTime([message.text], words),
  );
  if (source) return resolvePickupAt(words, new Date(source.at));
  if (!fact && /\b(?:today|tomorrow|tonight|demain|heute|morgen)\b/i.test(words) &&
      !namesTime([request.draft ?? "", request.instruction ?? ""], words))
    return null;
  return resolvePickupAt(words, now);
}

function timeAllowed(words: string, request: ThreadTurnRequest) {
  return namesTime(ownTexts(request), words) ||
    cardTerms(request).some((terms) => terms.pickupTime && namesTime([terms.pickupTime], words)) ||
    (request.role === "seller" && namesTime([request.listing.pickup ?? ""], words));
}

function shippingAllowed(request: ThreadTurnRequest) {
  return ownTexts(request).some((text) => quoteSupportsHandover(text, "shipping")) ||
    cardTerms(request).some((terms) => terms.fulfillment === "shipping");
}

/** Accepting takes the price as it stands: the one last named, or else the asking price. */
function checkAccepted(
  terms: DealTerms,
  facts: ThreadFacts,
  request: ThreadTurnRequest,
  where: string,
) {
  const standing = facts.amount?.value ?? request.listing.price;
  if (terms.amount !== null && terms.amount !== standing)
    throw new Error(
      `${where}.terms.amount: an accept option keeps the amount as it stands, CHF ${standing}.`,
    );
}

/** The terms an option records, checked against the conversation; null when it states none. */
function optionTerms(
  option: ProposedOption,
  index: number,
  request: ThreadTurnRequest,
  facts: ThreadFacts,
  now: Date,
): DealTerms | null {
  const where = `options[${index}]`;
  const proposed = option.terms;
  // Only an offer or an acceptance records terms; asking or answering just talks about them.
  if (option.kind !== "accept" && option.kind !== "counter") return null;
  if (!proposed || Object.keys(proposed).length === 0) return null;
  if (
    proposed.amount !== undefined &&
    !amountAllowed(proposed.amount, option.kind, request)
  )
    throw new Error(
      `${where}.terms.amount: nobody named that amount. Use one from the conversation or the listing${option.kind === "counter" ? ", or a whole number between the two sides' latest amounts" : ""}, or leave the amount out.`,
    );
  const pickupTime = proposed.pickupTime;
  if (
    pickupTime &&
    !timeAllowed(pickupTime, request)
  )
    throw new Error(
      `${where}.terms.pickupTime: nobody named that time. Copy time words from a message or the listing, or leave the time out and ask for one.`,
    );
  if (proposed.pickupPoint && !pointAllowed(proposed.pickupPoint, request))
    throw new Error(
      `${where}.terms.pickupPoint: nobody named that place. Use a meeting point from the conversation, the listing or campusMeetingPoints, or leave it out.`,
    );
  if (proposed.fulfillment === "shipping" && !shippingAllowed(request))
    throw new Error(`${where}.terms.fulfillment: shipping needs the student's own words or the deal card.`);
  const meeting =
    pickupTime !== undefined || proposed.pickupPoint !== undefined;
  if (proposed.fulfillment === "shipping" && meeting)
    throw new Error(
      `${where}.terms: shipping has no pickup time or meeting point.`,
    );
  const terms: DealTerms = {
    amount: proposed.amount ?? null,
    // A time or place to meet means the item is picked up.
    fulfillment: proposed.fulfillment ?? (meeting ? "pickup" : null),
    pickupAt: pickupTime
      ? cardTerms(request).find((terms) => terms.pickupTime === pickupTime)?.pickupAt ??
        resolveWrittenPickup(pickupTime, request, now)
      : null,
    pickupTime: pickupTime ?? null,
    pickupPoint: proposed.pickupPoint ?? null,
  };
  const stated = messageStatesTerms(option.message, terms);
  if (!stated.ok)
    throw new Error(
      `${where}.message: state its ${stated.missing.join(", ")} (the amount as CHF <number>, the time as HH:MM, the meeting point as written).`,
    );
  if (option.kind === "accept") checkAccepted(terms, facts, request, where);
  return terms;
}

const plainText = (text: string) =>
  text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();

const AGREEMENT_LABEL =
  /\b(?:accept\w*|agree(?:d|ment)?|deal|accepter|accord|annehmen|zustimmen)\b|\bconfirm (?:the |our )?(?:offer|price|sale|pickup|CHF)\b/i;
const PROPOSAL_LABEL =
  /\b(?:propos\w*|suggest\w*|offer|counter\w*|vorschlag\w*|vorschlagen|anbieten)\b/i;
const LISTING_LABEL =
  /\b(?:list(?:ed|ing)|asking|affiché|annonce|inserat|angebotspreis)\b/i;
const PICKUP_TIMES =
  /\b(?:(?:before|after|avant|après|vor|nach)\s+)?(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday|today|tomorrow|tonight|morning|afternoon|evening|weekend|lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche|demain|montag|dienstag|mittwoch|donnerstag|freitag|samstag|sonntag|morgen|\d{1,2}[:h]\d{2}|\d{1,2}\s?(?:am|pm|uhr))\b/gi;

/** Inspect the draft even when the model omitted terms or classified it as a question. */
function checkOptionLabel(
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
  if (/\b(?:i|we)(?:['’]ll| will| can| could| would)\s+(?:ship|post|mail)\b/i.test(message) &&
      !shippingAllowed(request))
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
    const discussesTheirOffer = (option.kind === "ask" || option.kind === "answer") &&
      /^(?:could|can|may|would) (?:we|i) (?:talk|discuss|ask)\b[^.!?;]*\byour\b[^.!?;]*\boffer\b[^.!?;]*[?？]$/i.test(message) &&
      request.messages.some((entry) => entry.from === "them" && messageAmounts(entry.text).includes(amount));
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
  const asksForTime = option.kind === "ask" && /\b(?:what|which)\b[^.!?]*\b(?:time|window|day)\b[^.!?]*[?？]/i.test(message);
  const times = (message.match(PICKUP_TIMES) ?? []).filter((time) =>
    !asksForTime || !/^(?:morning|afternoon|evening|weekend)$/i.test(time));
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
    const asksAboutExistingTime = /[?？]$/.test(message) &&
      (option.kind === "ask" || /\bwhich day\b/i.test(message)) &&
      conversation.some((text) => containsQuote(text, detail));
    if ((clock && !timeAllowed(detail, request) && !asksAboutExistingTime) ||
      (place && !pointAllowed(detail, request)))
      throw new Error("Use concrete pickup terms from the student's words or the deal card.");
    if (
      !conversation.some((text) => containsQuote(text, detail)) &&
      !PROPOSAL_LABEL.test(label)
    )
      throw new Error("Label a new pickup time or place as a proposal.");
  }
}

function logDroppedOption(
  runId: string,
  index: number,
  label: string,
  error: Error,
) {
  console.warn(
    "[thread-turn]",
    JSON.stringify({
      runId,
      event: "option_dropped",
      optionId: `opt-${index + 1}`,
      check: error.message,
      label,
    }),
  );
}

function checkedOption(
  option: ProposedOption,
  index: number,
  request: ThreadTurnRequest,
  facts: ThreadFacts,
  now: Date,
): ThreadTurn["options"][number] {
  if (option.label.length > 40)
    throw new Error("Keep the label within 40 characters.");
  if (!option.message)
    throw new Error(
      "Supply a draft or use its complete question as the label.",
    );
  if (
    /\bcondition\b/i.test(option.label) &&
    /[?？]/.test(option.message) &&
    !/[?？]|\b(?:ask|check|which|what|whether)\b/i.test(option.label)
  )
    throw new Error(
      "Disclose the follow-up question in the condition label or remove it.",
    );
  const terms = optionTerms(option, index, request, facts, now);
  checkOptionLabel(option, request, facts);
  return { ...option, id: `opt-${index + 1}`, terms };
}

/** A reading can offer fewer chips when one draft fails its grounding checks. */
function checkedOptions(
  proposal: Proposal,
  request: ThreadTurnRequest,
  now: Date,
  runId: string,
) {
  if (proposal.stance === "accepts") return [];
  if (!proposal.options.length)
    throw new Error(
      "Supply a conversational reply unless the other student accepts.",
    );
  proposal.options.forEach((option, index) => {
    checkSafeText(option.label, `options[${index}].label`);
    checkSafeText(option.message, `options[${index}].message`);
  });
  const drafts = proposal.options
    .map((option) => option.message)
    .filter(Boolean);
  const distinct = new Set(drafts.map(plainText));
  if (distinct.size !== drafts.length)
    throw new Error("options: each option must be a different message.");
  const options: ThreadTurn["options"] = [];
  let firstFailure: Error | undefined;
  for (const [index, option] of proposal.options.entries()) {
    try {
      options.push(checkedOption(option, index, request, proposal.facts, now));
    } catch (error) {
      if (!(error instanceof Error)) throw error;
      logDroppedOption(runId, index, option.label, error);
      firstFailure ??= error;
    }
  }
  if (!options.length && firstFailure) throw firstFailure;
  return options;
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
  const ownsPickupAt = pickupTime && request.messages.some((message) =>
    message.from === "me" && namesTime([message.text], pickupTime) &&
    resolvePickupAt(pickupTime, new Date(message.at)) === pickupAt,
  );
  const matchingCardTime = cardTerms(request).some((card) =>
    card.pickupAt === pickupAt && (pickupAt !== null || card.pickupTime === pickupTime),
  );
  if (
    (amount !== null && !ownTexts(request).some((text) => messageAmounts(text).includes(amount)) &&
      !cardTerms(request).some((card) => card.amount === amount)) ||
    (fulfillment === "shipping" && !shippingAllowed(request)) ||
    (pickupTime && !ownsPickupAt && !matchingCardTime) ||
    (pickupPoint && !ownTexts(request).some((text) => namesPlace(text, pickupPoint, request)) &&
      !cardTerms(request).some((card) => card.pickupPoint === pickupPoint))
  ) throw new Error("Do not treat terms as agreed if they came only from the other student's message.");
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
function groundProposal(
  proposal: Proposal,
  request: ThreadTurnRequest,
  now: Date,
  runId: string,
): ThreadTurn {
  checkSafeText(proposal.summary, "summary");
  checkFacts(proposal.facts, request);
  const pickupAt = proposal.facts.pickupTime
    ? resolveWrittenPickup(proposal.facts.pickupTime.value, request, now, proposal.facts.pickupTime)
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

/** "Thu 19 Nov 2026, 14:05" in Zurich: the day and time Pako reads the thread on. */
const zurichNow = new Intl.DateTimeFormat("en-GB", {
  timeZone: ZONE,
  weekday: "short",
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

function safeError(
  error: unknown,
  callerSignal: AbortSignal | undefined,
  timeout: AbortSignal,
): AgentError {
  if (callerSignal?.aborted)
    return new AgentError(
      499,
      "REQUEST_CANCELLED",
      "The request was cancelled.",
    );
  if (timeout.aborted)
    return new AgentError(
      504,
      "AGENT_TIMEOUT",
      "Pako took too long to read this. Try again.",
    );
  if (error instanceof AgentError) return error;
  return new AgentError(
    502,
    "PROVIDER_ERROR",
    "Pako can't read replies right now. Try again in a moment.",
  );
}

/**
 * Pako's reading of one conversation: a small agent with one forced tool. A
 * proposal that fails a check goes back to the model as a tool error to
 * repair; after two repairs the reading fails.
 */
export function createThreadAgent(config: ThreadAgentConfig): ThreadAgent {
  const apiKey = config.apiKey.trim();
  const model = config.model?.trim() || "deepseek-flash";
  const clock = config.now ?? (() => new Date());
  return {
    configured: Boolean(apiKey),
    async turn(request, callerSignal) {
      if (!apiKey)
        throw new AgentError(
          503,
          "AGENT_NOT_CONFIGURED",
          "Add a DeepSeek API key to the server .env so Pako can read replies.",
        );
      const runId = randomUUID();
      const startedAt = Date.now();
      const timeout = AbortSignal.timeout(
        Math.min(config.timeoutMs ?? TURN_LIMIT_MS, TURN_LIMIT_MS),
      );
      const repairDeadline = new AbortController();
      let repairTimer: ReturnType<typeof setTimeout> | undefined;
      const signal = callerSignal
        ? AbortSignal.any([callerSignal, timeout, repairDeadline.signal])
        : AbortSignal.any([timeout, repairDeadline.signal]);
      const now = clock();
      let reading: ThreadTurn | undefined;
      let repairIndex: number | undefined;
      let repairStarted = false;
      let streamFailure: unknown;
      /** The checks the model's attempts failed; fixed wording, never what the students wrote. */
      const failedChecks: string[] = [];
      let stage = "Reading the conversation";
      try {
        const provider = createDeepSeek({
          apiKey,
          baseURL: config.baseUrl || "https://api.deepseek.com",
          fetch: config.fetchImpl,
        });
        const agent = new ToolLoopAgent({
          model: config.modelImpl ?? provider(model),
          instructions: threadInstructions,
          tools: {
            [TOOL_NAME]: tool({
              description:
                "Save your reading of the conversation: the summary, the facts with their quotes, the stance and suggested replies. For accepts, return an empty options array. Nothing is sent.",
              inputSchema: proposalSchema,
              execute: async (proposal) => {
                try {
                  reading = groundProposal(proposal, request, now, runId);
                  if (
                    reading.options.length === 1 &&
                    proposal.options.length > 1
                  ) {
                    const kept = reading.options[0];
                    repairIndex = proposal.options.findIndex(
                      (_, i) => `opt-${i + 1}` !== kept.id,
                    );
                    return {
                      kept: kept.label,
                      instruction:
                        "Replace one rejected draft. Write one short, different reply about a single point. Omit extra prices, times and places.",
                    };
                  }
                } catch (error) {
                  failedChecks.push(
                    error instanceof Error ? error.message : "check failed",
                  );
                  throw error;
                }
                return { saved: true };
              },
            }),
            repair_reply: tool({
              description:
                "Replace one rejected reply. The saved reading and valid reply are already kept.",
              inputSchema: proposalSchema.shape.options.element,
              execute: async (option) => {
                if (!reading || repairIndex === undefined)
                  throw new Error("No reply needs repair.");
                const index = repairIndex;
                repairIndex = undefined;
                try {
                  checkSafeText(option.label, "replacement label");
                  checkSafeText(option.message, "replacement message");
                  if (
                    reading.options.some(
                      (kept) =>
                        plainText(kept.message) === plainText(option.message) ||
                        plainText(kept.label) === plainText(option.label),
                    )
                  )
                    throw new Error("Write a different message.");
                  const replacement = checkedOption(
                    option,
                    index,
                    request,
                    reading.facts,
                    now,
                  );
                  reading.options.push(replacement);
                } catch (error) {
                  if (!(error instanceof Error)) throw error;
                  // An unsafe label can contain contact details.
                  const label = error.message.startsWith("replacement label")
                    ? "[redacted]"
                    : option.label;
                  logDroppedOption(runId, index, label, error);
                }
                return { saved: reading.options.length > 1 };
              },
            }),
          },
          prepareStep: () => {
            if (repairIndex === undefined) return { activeTools: [TOOL_NAME] };
            repairStarted = true;
            repairTimer = setTimeout(() => repairDeadline.abort(), 2500);
            return { activeTools: ["repair_reply"] };
          },
          toolChoice: "required",
          stopWhen: [
            stepCountIs(MAX_STEPS),
            () =>
              reading !== undefined &&
              (repairIndex === undefined || repairStarted),
          ],
          maxOutputTokens: MAX_OUTPUT_TOKENS,
          maxRetries: 1,
          // DeepSeek cannot combine thinking with a forced tool.
          providerOptions: { deepseek: { thinking: { type: "disabled" } } },
          // Keep provider response bodies out of the console.
          prepareCall: (options) => ({
            ...options,
            onError: ({ error }: { error: unknown }) => {
              streamFailure = error;
            },
          }),
          onStepStart: async ({ stepNumber }) => {
            stage =
              stepNumber === 0
                ? "Reading the conversation"
                : `Repair ${stepNumber}`;
          },
        });
        const result = await agent.stream({
          prompt: JSON.stringify({
            ...request,
            pickupLabels: {
              agreed: request.deal?.agreed?.pickupAt
                ? formatPickup(request.deal.agreed.pickupAt)
                : null,
              proposed: request.deal?.proposal?.terms.pickupAt
                ? formatPickup(request.deal.proposal.terms.pickupAt)
                : null,
            },
            now: zurichNow.format(now),
            timeZone: ZONE,
            campusMeetingPoints: campusPickupPoints.map((point) => point.name),
          }),
          abortSignal: signal,
        });
        for await (const part of result.fullStream) {
          if (part.type === "error") streamFailure = part.error;
          // The SDK's message would repeat the input, which quotes the students.
          if (
            part.type === "tool-call" &&
            part.invalid &&
            InvalidToolInputError.isInstance(part.error)
          )
            failedChecks.push("the input did not match the tool's schema");
        }
        callerSignal?.throwIfAborted();
        if (repairStarted && reading) return reading;
        signal.throwIfAborted();
        if (reading) return reading;
        if (streamFailure) throw streamFailure;
        throw new AgentError(
          502,
          "THREAD_TURN_INVALID",
          "Pako couldn't read this one. Try again or reply yourself.",
        );
      } catch (error) {
        const safe = safeError(error, callerSignal, timeout);
        const status = (error as { statusCode?: unknown } | null)?.statusCode;
        console.error(
          "[thread-turn]",
          JSON.stringify({
            runId,
            code: safe.code,
            model,
            stage,
            elapsedMs: Date.now() - startedAt,
            ...(Number.isInteger(status) ? { providerStatus: status } : {}),
            ...(failedChecks.length ? { failedChecks } : {}),
          }),
        );
        if (repairStarted && reading && !callerSignal?.aborted) return reading;
        throw safe;
      } finally {
        clearTimeout(repairTimer);
      }
    },
  };
}
