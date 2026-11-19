import { createDeepSeek } from "@ai-sdk/deepseek";
import { stepCountIs, tool, ToolLoopAgent, type LanguageModel } from "ai";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { campusPickupPoints } from "../shared/campusPickupPoints.ts";
import {
  messageStatesTerms,
  missingTerms,
  type DealTerms,
} from "../shared/deal.ts";
import { resolvePickupAt } from "../shared/pickupTime.ts";
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
  messageAmounts,
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
            label: z.string().trim().min(1).max(40),
            kind: z.enum(THREAD_OPTION_KINDS),
            message: z.string().trim().min(1).max(600),
            terms: proposedTermsSchema.optional(),
          })
          .strict(),
      )
      .min(1)
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
const includesWords = (text: string, words: string) =>
  text.toLowerCase().includes(words.toLowerCase());
const messageTexts = (request: ThreadTurnRequest) =>
  request.messages.map((message) => message.text);
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
  if (/[{}]/.test(text.replaceAll(OTHER_TOKEN, "")))
    throw new Error(
      `${where}: the only placeholder allowed is ${OTHER_TOKEN}.`,
    );
}

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
  if (!sources.some((text) => text.includes(fact.quote)))
    throw new Error(
      `${where}: copy the quote exactly from one message of "${fact.from}" or from the listing.`,
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
        "facts.fulfillment: the quote must say pickup or shipping.",
      );
  }
  for (const [field, fact] of [
    ["pickupTime", pickupTime],
    ["pickupPoint", pickupPoint],
  ] as const) {
    if (!fact) continue;
    checkQuote(`facts.${field}`, fact, request);
    if (!fact.quote.includes(fact.value))
      throw new Error(`facts.${field}: the value must appear in its quote.`);
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
  const named = [
    listing.price,
    ...request.messages.flatMap((message) => messageAmounts(message.text)),
  ];
  if (named.includes(amount)) return true;
  if (kind !== "counter") return false;
  const sellerSide = request.role === "seller" ? "me" : "them";
  const buyerSide = request.role === "seller" ? "them" : "me";
  const asked = latestAmount(request, sellerSide) ?? listing.price;
  const offered = latestAmount(request, buyerSide);
  return (
    offered !== undefined &&
    amount > Math.min(asked, offered) &&
    amount < Math.max(asked, offered)
  );
}

const campusPointNames = campusPickupPoints.map((point) =>
  point.name.toLowerCase(),
);

function pointAllowed(point: string, request: ThreadTurnRequest) {
  const places = [
    ...messageTexts(request),
    request.listing.pickupPoint,
    request.listing.location,
  ].filter(isText);
  return (
    places.some((text) => includesWords(text, point)) ||
    campusPointNames.includes(point.toLowerCase())
  );
}

const sameWords = (a: string, b: string | undefined) =>
  b !== undefined && a.toLowerCase() === b.toLowerCase();

/** Accepting takes the terms as the conversation states them, never other ones. */
function checkAccepted(terms: DealTerms, facts: ThreadFacts, where: string) {
  if (
    (terms.amount !== null && terms.amount !== facts.amount?.value) ||
    (terms.pickupTime !== null &&
      !sameWords(terms.pickupTime, facts.pickupTime?.value)) ||
    (terms.pickupPoint !== null &&
      !sameWords(terms.pickupPoint, facts.pickupPoint?.value))
  )
    throw new Error(
      `${where}: an accept option accepts the terms exactly as facts state them.`,
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
  if (!proposed || Object.keys(proposed).length === 0) return null;
  if (
    proposed.amount !== undefined &&
    !amountAllowed(proposed.amount, option.kind, request)
  )
    throw new Error(
      `${where}.terms.amount: use an amount from the conversation or the listing${option.kind === "counter" ? ", or a whole number between the two sides' latest amounts" : ""}.`,
    );
  const pickupTime = proposed.pickupTime;
  if (
    pickupTime &&
    ![...messageTexts(request), request.listing.pickup]
      .filter(isText)
      .some((text) => includesWords(text, pickupTime))
  )
    throw new Error(
      `${where}.terms.pickupTime: copy the time words from a message or the listing.`,
    );
  if (proposed.pickupPoint && !pointAllowed(proposed.pickupPoint, request))
    throw new Error(
      `${where}.terms.pickupPoint: use a meeting point from the conversation, the listing or campusMeetingPoints.`,
    );
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
    pickupAt: pickupTime ? resolvePickupAt(pickupTime, now) : null,
    pickupTime: pickupTime ?? null,
    pickupPoint: proposed.pickupPoint ?? null,
  };
  const stated = messageStatesTerms(option.message, terms);
  if (!stated.ok)
    throw new Error(
      `${where}.message: state its ${stated.missing.join(", ")} (the amount as CHF <number>, the time as HH:MM, the meeting point as written).`,
    );
  if (option.kind === "accept") checkAccepted(terms, facts, where);
  return terms;
}

const plainText = (text: string) =>
  text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();

/** The terms as they stand now: what the latest messages say, then what both already agreed. */
function currentTerms(
  facts: ThreadFacts,
  agreed: DealTerms | null,
  pickupAt: string | null,
): DealTerms {
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

/** Agreement is worked out from the checked facts, never taken from the model. */
function agreementOf(
  proposal: Proposal,
  request: ThreadTurnRequest,
  pickupAt: string | null,
): ThreadTurn["agreement"] {
  if (proposal.stance !== "accepts") return { status: "none", missing: [] };
  const missing = missingTerms(
    currentTerms(proposal.facts, request.deal?.agreed ?? null, pickupAt),
  );
  return missing.length
    ? { status: "partial", missing }
    : { status: "complete", missing: [] };
}

/** Checks Pako's proposal against the conversation and adds what the server works out. */
function groundProposal(
  proposal: Proposal,
  request: ThreadTurnRequest,
  now: Date,
): ThreadTurn {
  checkSafeText(proposal.summary, "summary");
  proposal.options.forEach((option, index) => {
    checkSafeText(option.label, `options[${index}].label`);
    checkSafeText(option.message, `options[${index}].message`);
  });
  checkFacts(proposal.facts, request);
  const distinct = new Set(
    proposal.options.map((option) => plainText(option.message)),
  );
  if (distinct.size !== proposal.options.length)
    throw new Error("options: each option must be a different message.");
  const pickupAt = proposal.facts.pickupTime
    ? resolvePickupAt(proposal.facts.pickupTime.value, now)
    : null;
  return threadTurnSchema.parse({
    forMessageId: request.messages.at(-1)?.id ?? null,
    summary: proposal.summary,
    language: proposal.language,
    stance: proposal.stance,
    facts: proposal.facts,
    pickupAt,
    agreement: agreementOf(proposal, request, pickupAt),
    options: proposal.options.map((option, index) => ({
      id: `opt-${index + 1}`,
      label: option.label,
      kind: option.kind,
      message: option.message,
      terms: optionTerms(option, index, request, proposal.facts, now),
    })),
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
      const signal = callerSignal
        ? AbortSignal.any([callerSignal, timeout])
        : timeout;
      const now = clock();
      let reading: ThreadTurn | undefined;
      let streamFailure: unknown;
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
                "Save your reading of the conversation: the summary, the facts with their quotes, the stance and 1 to 3 messages the student could send next. Nothing is sent.",
              inputSchema: proposalSchema,
              execute: async (proposal) => {
                reading = groundProposal(proposal, request, now);
                return { saved: true };
              },
            }),
          },
          activeTools: [TOOL_NAME],
          toolChoice: "required",
          stopWhen: [stepCountIs(MAX_STEPS), () => reading !== undefined],
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
            now: zurichNow.format(now),
            timeZone: ZONE,
            campusMeetingPoints: campusPickupPoints.map((point) => point.name),
          }),
          abortSignal: signal,
        });
        for await (const part of result.fullStream)
          if (part.type === "error") streamFailure = part.error;
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
          }),
        );
        throw safe;
      }
    },
  };
}
