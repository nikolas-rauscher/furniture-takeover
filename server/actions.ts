import { z } from "zod";
import type {
  AgentActionEvidence,
  AgentListingPatchEvent,
  AgentPreferencesPatchEvent,
} from "../shared/actions.ts";
import type { AgentRunRequest, AgentRunSource } from "../shared/runs.ts";
import {
  extractSearchConstraints,
  takeoverOnlyPattern,
  parsePickupDate,
  TODAY,
} from "../shared/marketplace.ts";
import { isSkippedAnswer } from "./conversation.ts";
import { AMOUNT, amountValue, bareAmount, explicitPrice } from "./facts.ts";

export const dateSchema = z
  .string()
  .trim()
  .refine(
    (value) =>
      value === "" ||
      (/^\d{4}-\d{2}-\d{2}$/.test(value) &&
        !Number.isNaN(Date.parse(value)) &&
        new Date(value).toISOString().slice(0, 10) === value),
  );
const listingFields = {
  title: z.string().trim().max(180),
  description: z.string().trim().max(4000),
  price: z.number().finite().min(0).max(10_000).nullable(),
  condition: z.string().trim().max(120),
  dimensions: z.string().trim().max(160),
  location: z.string().trim().max(120),
  pickup: dateSchema,
};
export const listingDraftSchema = z.object({
  ...listingFields,
  raw: z.string().max(4000),
});
const sellerEvidenceSchema = z
  .object({
    kind: z.literal("seller"),
    quote: z.string().trim().min(1).max(500),
  })
  .strict();
const sourceEvidenceSchema = z
  .object({
    kind: z.literal("source"),
    sourceId: z.string().min(1).max(160),
    quote: z.string().trim().min(1).max(500),
  })
  .strict();
const reasonSchema = z.string().trim().min(1).max(500);
const answerLabel = z.string().trim().min(1).max(120);
const tapAnswer = z
  .object({
    label: answerLabel,
    patch: z.object(listingFields).partial().strict().optional(),
    appendDescription: z.string().trim().min(1).max(160).optional(),
  })
  .strict();
const questionFields = z
  .object({
    question: z.string().trim().min(1).max(500),
    listingField: z
      .enum([
        "price",
        "condition",
        "dimensions",
        "location",
        "pickup",
        "description",
        "title",
        "other",
      ])
      .describe(
        "For seller questions, name the draft field being requested. Use price for the listing asking price; other for item-specific details.",
      )
      .optional(),
    purpose: z
      .enum(["missing_detail", "change_detail"])
      .describe(
        "Use change_detail only when the user explicitly wants to revise a known value; otherwise missing_detail.",
      )
      .optional(),
    input: z
      .object({
        type: z.literal("price"),
        min: z.number().finite().min(0).max(10_000),
        max: z.number().finite().min(0).max(10_000),
        step: z.number().finite().positive().max(1000),
        value: z.number().finite().min(0).max(10_000).optional(),
      })
      .strict()
      .refine(
        (input) =>
          input.max > input.min &&
          input.step <= input.max - input.min &&
          (input.value === undefined ||
            (input.value >= input.min && input.value <= input.max)),
      )
      .optional(),
    choices: z
      .array(z.union([answerLabel, tapAnswer]))
      .min(1)
      .max(5)
      .describe(
        "For measurements, use listingField dimensions and offer relevant exact sizes with units and a matching dimensions patch. The seller can also type their own measurements.",
      )
      .optional(),
  })
  .strict();
export const questionSchema = questionFields.extend({
  followUps: z
    .array(questionFields.omit({ input: true }))
    .max(2)
    .optional(),
});
export const listingUpdateSchema = z
  .object({
    patch: z
      .object(listingFields)
      .partial()
      .strict()
      .refine((patch) => Object.keys(patch).length > 0),
    reason: reasonSchema,
    evidence: z
      .array(
        z.discriminatedUnion("kind", [
          sellerEvidenceSchema,
          sourceEvidenceSchema,
        ]),
      )
      .min(1)
      .max(8),
  })
  .strict();
export const preferencesUpdateSchema = z
  .object({
    patch: z
      .object({
        query: z.string().trim().max(500),
        maxPrice: z.number().finite().min(0).max(1_000_000),
        radius: z.number().finite().min(0).max(500),
        pickupBy: dateSchema,
        condition: z.string().trim().max(120),
        source: z.string().trim().max(120),
        location: z.string().trim().max(120),
      })
      .partial()
      .strict()
      .refine((patch) => Object.keys(patch).length > 0),
    reason: reasonSchema,
    evidence: z.array(sellerEvidenceSchema).min(1).max(8),
  })
  .strict();

const normalized = (text: string) =>
  text
    .toLowerCase()
    // CHF 1,250 and CHF 1250 quote the same amount.
    .replace(/(?<=\d)[’',](?=\d{3}(?!\d))/g, "")
    .replace(/×/g, "x")
    .replace(/(?<=\d)\s*x\s*(?=\d)/g, "x")
    .replace(/(?<=\d)\s+(?=(?:cm|mm|m)\b)/g, "")
    .replace(/\s+/g, " ")
    .trim();
// Messages contain only server-defined wording and validated field names.
export class ActionRejection extends Error {}

function fail(message: string): never {
  throw new ActionRejection(`ACTION_REJECTED: ${message}`);
}
const contains = (text: string, quote: string) =>
  normalized(text).includes(normalized(quote));

function sellerFacts(request: AgentRunRequest): string[] {
  const draft = request.context?.currentDraft;
  return [
    request.text,
    ...(request.context?.recentMessages ?? [])
      .filter((message) => message.role === "user")
      .map((message) => message.text),
    ...(request.context?.answeredQuestions ?? []).map((item) => item.answer),
    ...(draft
      ? Object.values(draft).filter(
          (value): value is string => typeof value === "string",
        )
      : []),
  ];
}

function validateEvidence(
  evidence: AgentActionEvidence[],
  request: AgentRunRequest,
  sources: AgentRunSource[],
) {
  const facts = sellerFacts(request);
  for (const item of evidence) {
    if (item.kind === "seller") {
      if (!facts.some((fact) => contains(fact, item.quote)))
        fail(
          "Seller evidence must quote the current or an earlier user answer, or the current draft exactly.",
        );
    } else {
      const source = sources.find((source) => source.id === item.sourceId);
      if (
        !source ||
        ![source.title, source.snippet].some((text) =>
          contains(text, item.quote),
        )
      )
        fail("Source evidence must quote a source returned during this run.");
    }
  }
}

function negated(value: string, text: string) {
  const source = normalized(text);
  const needle = normalized(value);
  if (!needle) return false;
  for (
    let at = source.indexOf(needle);
    at !== -1;
    at = source.indexOf(needle, at + 1)
  ) {
    if (
      /\b(?:not|no|never|without|isn't|is not|kein|nicht)\b[^.!?;]{0,24}$/.test(
        source.slice(Math.max(0, at - 35), at),
      )
    )
      return true;
  }
  return false;
}

/** The lines and sentences of a text, without their closing punctuation. */
const textParts = (value: string) =>
  value
    .split(/\n+|(?<=[.!?])\s+/)
    .map((part) => part.trim().replace(/[.!?]+$/, ""))
    .filter(Boolean);

const quoted = (part: string, quotes: string[]) =>
  quotes.some((quote) => contains(quote, part) && !negated(part, quote));

function extractive(value: string, quotes: string[]) {
  const parts = textParts(value);
  return parts.length > 0 && parts.every((part) => quoted(part, quotes));
}

type SellerAnswer = { question: string; answer: string };

/** The seller's answers to Pako's questions so far; a skip states nothing. */
function sellerAnswers(request: AgentRunRequest): SellerAnswer[] {
  const context = request.context;
  return [
    ...(context?.answeredQuestions ?? []),
    ...(context?.previousQuestion
      ? [{ question: context.previousQuestion, answer: request.text }]
      : []),
  ].filter(({ answer }) => !isSkippedAnswer(answer));
}

const words = (text: string) => normalized(text).match(/[\p{L}\p{N}]+/gu) ?? [];

/**
 * "Storage: 512 GB" restates the answer "512 GB" to "How much storage does it
 * have?": besides the whole answer it uses only words of the question.
 */
function restatesAnswer(part: string, answers: readonly SellerAnswer[]) {
  return answers.some(({ question, answer }) => {
    const asked = new Set(words(question));
    const added = words(part).filter((word) => !asked.has(word));
    const answered = words(answer).filter((word) => !asked.has(word));
    return added.length > 0 && added.join(" ") === answered.join(" ");
  });
}

/** Listing text in the seller's own wording, or restating their answers to Pako's questions. */
function sellerWording(
  value: string,
  quotes: string[],
  answers: readonly SellerAnswer[],
) {
  const parts = textParts(value);
  return (
    parts.length > 0 &&
    parts.every((part) => quoted(part, quotes) || restatesAnswer(part, answers))
  );
}

function wantsClear(field: string, text: string) {
  const label = field === "pickup" ? "(?:pickup|deadline|date)" : field;
  return new RegExp(
    `\\b(?:clear|remove|reset|delete)\\s+(?:the\\s+)?(?:asking\\s+)?${label}\\b`,
    "i",
  ).test(text);
}

function chfAmounts(text: string) {
  const amount = String.raw`(\d{1,3}(?:[’',. ]\d{3})+(?:[.,]\d{1,2})?|\d+(?:[.,]\d{1,2})?)`;
  // In "MacBook 2020 CHF 400", CHF belongs to the following amount.
  const currency = new RegExp(
    String.raw`\b(?:CHF|Fr\.?)\s*${amount}|${amount}\s*CHF\b(?!\s*\d)`,
    "gi",
  );
  return [...text.matchAll(currency)].map((match) => ({
    price: Number(
      (match[1] ?? match[2])
        .replace(/[’' ]|[.,](?=\d{3}(?:\D|$))/g, "")
        .replace(",", "."),
    ),
    index: match.index,
    length: match[0].length,
  }));
}

function chfPrices(text: string): number[] {
  return chfAmounts(text)
    .map(({ price }) => price)
    .filter((price) => Number.isFinite(price) && price >= 0 && price <= 10_000);
}

const NOT_AN_ASKING_PRICE =
  /\b(?:sold|retail|original price|originally|new price|previous price|starting (?:bid|price)|start(?:ing)? at|auction start|startpreis|startgebot|neupreis|verkauft|vendu|prix neuf|mise à prix)\b/i;
/** A cost beside the item's price: "Shipping: CHF 9", or Ricardo's "Retrait par l'acheteur à 1012 Lausanne, CHF 0.00". */
const INCIDENTAL_COST =
  /(?:\b(?:shipping|postage|deposit|delivery|versand(?:kosten)?|port|livraison)\s*[:=]?\s*|\b(?:retrait par l['’]acheteur|abholung durch (?:den )?käufer|pickup by (?:the )?buyer)\b[^·|]*,\s*)$/i;

type AskingPrice = { price: number; quote: string } | { rejection: string };

/** A source's one fixed CHF asking price with its surrounding quote, or why it can't anchor a price. */
export function askingPriceOf(source: AgentRunSource): AskingPrice {
  if (NOT_AN_ASKING_PRICE.test(source.title + " " + source.snippet))
    return {
      rejection:
        "Use fixed asking prices, excluding auction starts, retail and sold prices.",
    };
  const amounts = [source.title, source.snippet].flatMap((part) =>
    chfAmounts(part).map((amount) => ({ ...amount, part })),
  );
  const itemAmounts = amounts.filter(
    ({ part, index }) => !INCIDENTAL_COST.test(part.slice(0, index)),
  );
  if (amounts.length && !itemAmounts.length)
    return { rejection: "Use the asking price of the item itself." };
  const first = itemAmounts[0];
  if (
    !first ||
    first.price <= 0 ||
    first.price > 10_000 ||
    itemAmounts.some(({ price }) => price !== first.price)
  )
    return {
      rejection:
        "Choose an offer with one unambiguous positive CHF asking price.",
    };
  const quote = first.part
    .slice(Math.max(0, first.index - 100), first.index + first.length + 100)
    .trim();
  return { price: first.price, quote };
}

const NEW_OFFER =
  /\b(?:brand new|factory sealed|new (?:item|stock)|condition[: ]+new|(?:article|produit|[ée]tat)\s*:?\s*neu[fv]e?|(?:zustand\s*:?\s*neu|fabrikneu|neuware|originalverpackt))\b/i;
const USED_OFFER =
  /\b(?:used|second[ -]?hand|pre[ -]?owned|d['’]occasion|gebraucht(?:e[rmns]?)?|seconda mano|usat[oa])\b/i;

type ComparableOffer = {
  source: AgentRunSource;
  price: number;
  quote: string;
  used: boolean;
  url: string;
  words: Set<string>;
};

function comparableOffer(source: AgentRunSource): ComparableOffer | undefined {
  const text = `${source.title} ${source.snippet}`;
  if (NEW_OFFER.test(text)) return;
  const asking = askingPriceOf(source);
  if ("rejection" in asking) return;
  const url = new URL(source.url);
  return {
    source,
    ...asking,
    used: USED_OFFER.test(text),
    url: url.hostname + url.pathname.replace(/\/$/, ""),
    words: new Set(
      text
        .toLowerCase()
        .normalize("NFKD")
        .replace(/\p{M}/gu, "")
        .match(/[\p{L}\p{N}]+/gu),
    ),
  };
}

function sameOffer(a: ComparableOffer, b: ComparableOffer) {
  if (a.url === b.url) return true;
  if (a.price !== b.price || Math.min(a.words.size, b.words.size) < 6)
    return false;
  const shared = [...a.words].filter((word) => b.words.has(word)).length;
  return shared / (a.words.size + b.words.size - shared) >= 0.8;
}

/** A gap above 3× separates price groups. Only a majority can anchor a price. */
function typicalOffers(offers: ComparableOffer[]) {
  const groups: ComparableOffer[][] = [];
  for (const offer of [...offers].sort((a, b) => a.price - b.price)) {
    const group = groups.at(-1);
    if (group && offer.price <= group.at(-1)!.price * 3) group.push(offer);
    else groups.push([offer]);
  }
  const typical = groups.find((group) => group.length > offers.length / 2);
  return offers.filter((offer) => typical?.includes(offer)).slice(0, 4);
}

/** The median asking price of distinct comparable second-hand offers, in whole francs. */
export function researchedProposal(
  sources: AgentRunSource[],
  offerSourceIds: Set<string>,
  id: string,
): AgentListingPatchEvent | undefined {
  const candidates = sources
    .filter((source) => offerSourceIds.has(source.id))
    .map(comparableOffer)
    .filter((offer) => offer !== undefined);
  const used = candidates.filter((offer) => offer.used);
  const unique: ComparableOffer[] = [];
  for (const offer of used.length ? used : candidates) {
    if (!unique.some((previous) => sameOffer(offer, previous)))
      unique.push(offer);
  }
  const comparable = typicalOffers(unique);
  if (comparable.length < (used.length ? 1 : 2)) return;

  const prices = comparable.map(({ price }) => price).sort((a, b) => a - b);
  const price = Math.round(
    (prices[Math.floor((prices.length - 1) / 2)] +
      prices[Math.floor(prices.length / 2)]) /
      2,
  );
  const citations = comparable.map(({ source }) => `[${source.id}]`).join(" ");
  const basis =
    prices.length === 1
      ? "one used offer. Treat it as a starting point."
      : `the median of ${prices.length} ${used.length ? "used " : ""}offers asking CHF ${prices[0]}–${prices.at(-1)}.`;
  return {
    type: "listing_patch",
    id,
    patch: { price },
    requiresAcceptance: true,
    evidence: comparable.map(({ source, quote }) => ({
      kind: "source",
      sourceId: source.id,
      quote,
    })),
    reason: `Suggested CHF ${price} based on ${basis} ${citations}`,
  };
}

function latestSellerPrice(request: AgentRunRequest): number | null {
  if (/\b(?:eur|usd|dollars?|euros?)\b|[€$]/i.test(request.text)) return null;
  if (
    /(?:price|asking|sell.*for)/i.test(
      request.context?.previousQuestion ?? "",
    ) &&
    bareAmount(request.text) !== null
  )
    return bareAmount(request.text);
  return explicitPrice(request.text);
}

/** Only replace an explicitly marked asking-price amount; preserve all other wording. */
function correctedDescriptionPrice(
  description: string,
  oldPrice: number | null,
  newPrice: number | null,
): { text: string; quote: string } | undefined {
  if (oldPrice === null || newPrice === null || oldPrice === newPrice) return;
  let quote = "";
  const result = description.replace(
    new RegExp(
      String.raw`(\b(?:asking(?: price)?|price)\s*:?\s*(?:CHF\s*)?|\bCHF\s*)(${AMOUNT})(?![\d’',])`,
      "gi",
    ),
    (match, prefix: string, amount: string, offset: number) => {
      if (amountValue(amount) !== oldPrice) return match;
      const before =
        description
          .slice(0, offset)
          .split(/[.!?\n;]/)
          .at(-1) ?? "";
      if (
        /\b(?:bought|paid|original(?:ly)?|retail|purchase|cost)\b/i.test(before)
      )
        return match;
      quote ||= match;
      return `${prefix}${newPrice.toLocaleString("en-GB")}`;
    },
  );
  return quote && result.length <= 4000 ? { text: result, quote } : undefined;
}

/** A price fragment is additional listing information, not a replacement item narrative. */
function priceOnlyDescription(text: string): boolean {
  if (explicitPrice(text) === null) return false;
  const remaining = text
    .toLowerCase()
    .replace(/\d+(?:[.,]\d+)?/g, "")
    .replace(
      /\b(?:chf|francs?|franken|asking|price|preis|per|book|books|item|items|piece|pieces|unit|units|each|for|both|together|the|give|it|away|free|to|collect)\b/g,
      "",
    )
    .replace(/[\s:;,.()–—-]/g, "");
  return remaining === "";
}

/** Each changed field needs its own factual support; a generic quote never authorizes extra facts. */
export function listingAction(
  input: unknown,
  request: AgentRunRequest,
  sources: AgentRunSource[],
  offerSourceIds: Set<string>,
  id: string,
): AgentListingPatchEvent {
  const parsed = listingUpdateSchema.safeParse(input);
  if (!parsed.success)
    fail("Use only valid editable listing fields and bounded evidence.");
  const { patch, reason, evidence } = parsed.data!;
  if (
    request.context?.intent !== "listing_assist" ||
    !request.context.currentDraft
  )
    fail("Listing updates need a current listing draft.");
  validateEvidence(evidence, request, sources);
  const research = evidence.filter((item) => item.kind === "source");
  const quotes = evidence
    .filter((item) => item.kind === "seller")
    .map((item) => item.quote);
  const draft = request.context.currentDraft;
  const answers = sellerAnswers(request);
  if (research.length) {
    if (
      Object.keys(patch).some((field) => field !== "price") ||
      typeof patch.price !== "number"
    )
      fail(
        "Research can only propose an asking price, never seller-specific facts.",
      );
    if (research.some((item) => !offerSourceIds.has(item.sourceId)))
      fail(
        "Price evidence must come from an individual offer, not product specifications.",
      );
    const prices = research.flatMap((item) => chfPrices(item.quote));
    if (
      research.some((item) =>
        /\b(?:sold|retail|original(?:ly)?|new price|previous price)\b/i.test(
          item.quote,
        ),
      )
    )
      fail("Use current asking-price evidence, not retail or sold prices.");
    if (
      !prices.length ||
      patch.price! < Math.min(...prices) ||
      patch.price! > Math.max(...prices)
    )
      fail(
        "A price proposal needs observed CHF asking prices and must stay within their supported range.",
      );
  } else {
    const latestPrice = latestSellerPrice(request);
    const suppliedPriceFragment = patch.description;
    const priceFragmentGrounded =
      typeof suppliedPriceFragment === "string" &&
      priceOnlyDescription(suppliedPriceFragment) &&
      quotes.some((quote) => contains(quote, suppliedPriceFragment));
    if (
      priceFragmentGrounded &&
      latestPrice !== null &&
      explicitPrice(suppliedPriceFragment!) !== latestPrice
    ) {
      fail("Use the latest seller-stated price, keeping the item description.");
    }
    // A model may emit only a description patch for an explicit seller price.
    // Fill the structured field from the same validated quote; never infer a bundle division.
    if (
      priceFragmentGrounded &&
      patch.price === undefined &&
      latestPrice !== null &&
      quotes.some((quote) => explicitPrice(quote) === latestPrice)
    ) {
      patch.price = latestPrice;
    }
    const corrected = correctedDescriptionPrice(
      draft.description,
      draft.price ?? explicitPrice(draft.description),
      latestPrice,
    );
    let preservedNarrative: string | undefined;
    if (
      priceFragmentGrounded &&
      draft.description &&
      !priceOnlyDescription(draft.description)
    ) {
      const narrative = (corrected?.text ?? draft.description).trim();
      const fragment = suppliedPriceFragment!.trim();
      const onlyRepeatsCorrectedPrice =
        corrected !== undefined &&
        chfPrices(fragment).length === 1 &&
        !/\b(?:per|each|both|together)\b/i.test(fragment);
      preservedNarrative =
        contains(narrative, fragment) || onlyRepeatsCorrectedPrice
          ? narrative
          : `${narrative}\n${fragment}`;
      if (preservedNarrative.length > 4000) {
        fail(
          "Keep the existing description; add the price through the price field.",
        );
      }
      patch.description = preservedNarrative;
    }
    if (
      typeof patch.price === "number" &&
      patch.price === latestPrice &&
      patch.description === undefined &&
      corrected &&
      evidence.length < 8
    ) {
      patch.description = corrected.text;
      evidence.push({ kind: "seller", quote: corrected.quote });
    }
    for (const [field, value] of Object.entries(patch)) {
      const knownPriceCorrection =
        field === "description" &&
        (value === preservedNarrative ||
          (corrected?.text === value &&
            quotes.some(
              (quote) =>
                chfPrices(quote).includes(latestPrice!) ||
                explicitPrice(quote) === latestPrice ||
                normalized(quote) === String(latestPrice),
            )));
      // The carried-forward photo narrative is already in the draft. Check the
      // addition against the full reply, even if the tool quoted only one fact.
      const typedAddition =
        field === "description" &&
        typeof value === "string" &&
        (!draft.description ||
          value.startsWith(draft.description + " ") ||
          value.startsWith(draft.description + "\n")) &&
        normalized(value.slice(draft.description.length)).replace(
          /[.!?]+$/,
          "",
        ) === normalized(request.text).replace(/[.!?]+$/, "");
      if (field === "price") {
        const priceAnswer = /(?:price|asking|sell.*for)/i.test(
          request.context.previousQuestion ?? "",
        )
          ? bareAmount(request.text)
          : null;
        const priceText = /\b(?:eur|usd|dollars?|euros?)\b|[€$]/i.test(
          request.text,
        )
          ? null
          : explicitPrice(request.text);
        const explicit =
          priceText ??
          (draft.price === null &&
          !/\b(?:eur|usd|dollars?|euros?)\b|[€$]/i.test(draft.raw)
            ? explicitPrice(draft.raw)
            : null);
        if (
          value === null
            ? !wantsClear("price", request.text)
            : value !== explicit &&
              value !== priceAnswer &&
              value !== draft.price
        )
          fail(
            "The price must be stated by the seller; research suggestions need source evidence.",
          );
        if (
          value !== null &&
          !quotes.some(
            (quote) =>
              chfPrices(quote).includes(value as number) ||
              explicitPrice(quote) === value ||
              (normalized(quote) === String(value) &&
                (value === priceAnswer || value === draft.price)),
          )
        )
          fail("Price evidence must include the stated asking amount.");
      } else if (field === "pickup") {
        if (
          typeof value === "string" &&
          value &&
          value < TODAY &&
          value !== draft.pickup
        )
          fail(
            "A new pickup deadline must be today or later; ask for a current date.",
          );
        if (
          value !== parsePickupDate(request.text) &&
          value !== parsePickupDate(quotes.join(" ")) &&
          value !== draft.pickup
        )
          fail("The pickup date must be stated by the seller.");
      } else if (value === "") {
        if (!wantsClear(field, request.text))
          fail(`Clearing ${field} needs an explicit request.`);
      } else if (
        typeof value !== "string" ||
        (!knownPriceCorrection &&
          !typedAddition &&
          !sellerWording(value, quotes, answers)) ||
        negated(value, request.text)
      ) {
        fail(
          `${field} must use only supplied seller wording; ask for missing facts.`,
        );
      }
      if (typeof value === "string" && value && field !== "pickup") {
        const current = draft[field as keyof typeof draft];
        if (
          typeof current === "string" &&
          current &&
          value !== current &&
          !knownPriceCorrection &&
          !typedAddition &&
          !sellerWording(value, [request.text, current], answers) &&
          // Earlier user replies may add missing details, never replace newer facts.
          !(
            field === "description" &&
            contains(value, current) &&
            sellerWording(value, sellerFacts(request), answers)
          )
        )
          fail(
            `Historical notes cannot override the current ${field}; ask for a correction.`,
          );
        if (field === "description" && typeof current === "string") {
          const disclosed = current
            .split(/\n+|(?<=[.!?])\s+/)
            .filter((part) =>
              /\b(?:not|no|without|scratch|scratches|damaged|broken|defect|stain|stains|worn)\b/i.test(
                part,
              ),
            );
          if (
            disclosed.some(
              (part) => !contains(value, part.replace(/[.!?]+$/, "")),
            )
          )
            fail(
              "Do not remove a disclosed defect or exclusion from the description.",
            );
        }
      }
    }
  }
  return {
    type: "listing_patch",
    id,
    patch,
    reason,
    evidence,
    requiresAcceptance: research.length > 0,
  };
}

/** Keep independently grounded seller changes even when another proposed field needs input. */
export function prepareListingAction(
  input: unknown,
  request: AgentRunRequest,
  sources: AgentRunSource[],
  offerSourceIds: Set<string>,
  id: string,
): { action: AgentListingPatchEvent | null; needsInput: string[] } {
  const parsed = listingUpdateSchema.parse(input);
  const draft = request.context?.currentDraft;
  if (!draft || request.context?.intent !== "listing_assist")
    fail("Listing updates need a current listing draft.");
  // Never salvage fabricated citations or quotes, and keep research proposals atomic.
  validateEvidence(parsed.evidence, request, sources);
  if (parsed.evidence.some((item) => item.kind === "source"))
    return {
      action: listingAction(input, request, sources, offerSourceIds, id),
      needsInput: [],
    };
  const entries = Object.entries(parsed.patch).filter(
    ([field, value]) => value !== draft[field as keyof typeof draft],
  );
  if (!entries.length) return { action: null, needsInput: [] };
  const candidate = { ...parsed, patch: Object.fromEntries(entries) };
  try {
    return {
      action: listingAction(candidate, request, sources, offerSourceIds, id),
      needsInput: [],
    };
  } catch (error) {
    if (
      !(error instanceof Error) ||
      !error.message.startsWith("ACTION_REJECTED:")
    )
      throw error;
  }
  const supportedActions: AgentListingPatchEvent[] = [];
  const needsInput: string[] = [];
  // Price runs last so its validated narrative reconciliation cannot be overwritten.
  entries.sort(([a], [b]) => Number(a === "price") - Number(b === "price"));
  for (const [field, value] of entries) {
    try {
      const supported = listingAction(
        { ...parsed, patch: { [field]: value } },
        request,
        sources,
        offerSourceIds,
        id,
      );
      supportedActions.push(supported);
    } catch (error) {
      if (
        !(error instanceof Error) ||
        !error.message.startsWith("ACTION_REJECTED:")
      )
        throw error;
      needsInput.push(field);
    }
  }
  const action = supportedActions.reduce<AgentListingPatchEvent | null>(
    (previous, supported) =>
      previous
        ? {
            ...supported,
            patch: { ...previous.patch, ...supported.patch },
            evidence: [...previous.evidence, ...supported.evidence]
              .filter(
                (item, index, items) =>
                  items.findIndex(
                    (other) => JSON.stringify(other) === JSON.stringify(item),
                  ) === index,
              )
              .slice(0, 8),
          }
        : supported,
    null,
  );
  return { action, needsInput };
}

export function preferencesAction(
  input: unknown,
  request: AgentRunRequest,
  id: string,
): AgentPreferencesPatchEvent {
  const parsed = preferencesUpdateSchema.safeParse(input);
  if (!parsed.success)
    fail("Use only valid search preferences and seller evidence.");
  const { patch, reason, evidence } = parsed.data!;
  validateEvidence(evidence, request, []);
  // A preference update must come from the latest request, never a stale draft or prior answer.
  if (evidence.some((item) => !contains(request.text, item.quote)))
    fail("Search changes need evidence in the latest user message.");
  if (
    patch.source &&
    patch.source !== "takeover" &&
    takeoverOnlyPattern.test(request.text)
  )
    fail("The buyer limited this search to Takeover.");
  const constraints = extractSearchConstraints(request.text);
  const shortNumber = /^\s*\d+(?:[.,]\d{1,2})?\s*$/.test(request.text)
    ? Number(request.text.trim().replace(",", "."))
    : undefined;
  const previousQuestion = request.context?.previousQuestion ?? "";
  if (
    shortNumber !== undefined &&
    /\b(?:budget|max(?:imum)? price|spend|price limit)\b/i.test(
      previousQuestion,
    )
  )
    constraints.maxPrice = shortNumber;
  if (
    shortNumber !== undefined &&
    /\b(?:radius|distance|kilometres|kilometers|km|how far)\b/i.test(
      previousQuestion,
    )
  )
    constraints.radius = shortNumber;
  const quotes = evidence.map((item) => item.quote);
  for (const [field, value] of Object.entries(patch)) {
    const existing =
      field === "query"
        ? request.context?.currentQuery
        : request.context?.[
            field as keyof NonNullable<AgentRunRequest["context"]>
          ];
    // Models may repeat current filters alongside a changed field; no-op values are already accepted facts.
    if (value === existing) continue;
    if (field === "maxPrice" || field === "radius") {
      if (value !== constraints[field])
        fail(`${field} must be explicitly stated in the latest message.`);
    } else if (field === "pickupBy") {
      if (value !== constraints.pickup)
        fail("Pickup must be explicitly stated in the latest message.");
    } else if (
      field === "condition" &&
      typeof value === "string" &&
      value.toLowerCase() === "used" &&
      /\b(?:second[- ]hand|pre[- ]owned|used)\b/i.test(request.text)
    ) {
      continue;
    } else if (
      field === "source" &&
      value === "takeover" &&
      /(?:only\s+(?:my|local|own)\s+listings|(?:don't|do not)\s+search\s+(?:the\s+)?web)/i.test(
        request.text,
      )
    ) {
      continue;
    } else if (value === "" || value === "All") {
      if (
        !wantsClear(field, request.text) &&
        !(
          field === "source" &&
          /\b(?:(?:search|include|use) (?:the )?web|takeover\s+(?:and|und|\+)\s+(?:(?:the|das)\s+)?web)\b/i.test(
            request.text,
          ) &&
          !/\b(?:don't|do not|don’t)\s+(?:search|include|use)\s+(?:the\s+)?web\b/i.test(
            request.text,
          )
        ) &&
        !/\b(?:anything|all furniture|all sources|any condition)\b/i.test(
          request.text,
        )
      )
        fail(`Clearing ${field} needs an explicit request.`);
    } else if (
      typeof value !== "string" ||
      !extractive(value, quotes) ||
      negated(value, request.text)
    )
      fail(`${field} needs explicit user wording.`);
  }
  return { type: "preferences_patch", id, patch, reason, evidence };
}
