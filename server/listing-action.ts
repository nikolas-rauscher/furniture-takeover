import type {
  AgentActionEvidence,
  AgentListingDraft,
  AgentListingPatch,
  AgentListingPatchEvent,
} from "../shared/actions.ts";
import type { AgentRunRequest, AgentRunSource } from "../shared/runs.ts";
import { parsePickupDate, TODAY } from "../shared/marketplace.ts";
import {
  contains,
  fail,
  negated,
  normalized,
  sellerAnswers,
  sellerFacts,
  sellerWording,
  validateEvidence,
  wantsClear,
  type SellerAnswer,
} from "./action-evidence.ts";
import { listingUpdateSchema } from "./action-schemas.ts";
import { AMOUNT, amountValue, bareAmount, explicitPrice } from "./facts.ts";
import { chfPrices } from "./price-research.ts";

const FOREIGN_CURRENCY = /\b(?:eur|usd|dollars?|euros?)\b|[€$]/i;
const PRICE_QUESTION = /(?:price|asking|sell.*for)/i;
const MAX_DESCRIPTION = 4000;
const MAX_EVIDENCE = 8;

type SourceEvidence = Extract<AgentActionEvidence, { kind: "source" }>;
type CorrectedDescription = { text: string; quote: string };

/** What a seller-backed change is checked against. */
type SellerContext = {
  request: AgentRunRequest;
  draft: AgentListingDraft;
  quotes: string[];
  answers: SellerAnswer[];
  latestPrice: number | null;
  corrected: CorrectedDescription | undefined;
  preservedNarrative: string | undefined;
};

const asksForPrice = (request: AgentRunRequest) =>
  PRICE_QUESTION.test(request.context?.previousQuestion ?? "");

function latestSellerPrice(request: AgentRunRequest): number | null {
  if (FOREIGN_CURRENCY.test(request.text)) return null;
  if (asksForPrice(request) && bareAmount(request.text) !== null)
    return bareAmount(request.text);
  return explicitPrice(request.text);
}

/** Only replace an explicitly marked asking-price amount; preserve all other wording. */
function correctedDescriptionPrice(
  description: string,
  oldPrice: number | null,
  newPrice: number | null,
): CorrectedDescription | undefined {
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
  return quote && result.length <= MAX_DESCRIPTION
    ? { text: result, quote }
    : undefined;
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

/** Research may only propose an asking price, inside the range its offers quote. */
function checkResearchedPrice(
  patch: AgentListingPatch,
  research: SourceEvidence[],
  offerSourceIds: Set<string>,
) {
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
}

/**
 * A seller's price-only description ("CHF 40") becomes the price field and
 * joins the draft's narrative instead of replacing it. Returns that narrative.
 */
function reconcilePriceFragment(
  patch: AgentListingPatch,
  {
    draft,
    quotes,
    latestPrice,
    corrected,
  }: Omit<SellerContext, "request" | "answers" | "preservedNarrative">,
): string | undefined {
  const fragment = patch.description;
  if (
    typeof fragment !== "string" ||
    !priceOnlyDescription(fragment) ||
    !quotes.some((quote) => contains(quote, fragment))
  )
    return undefined;
  if (latestPrice !== null && explicitPrice(fragment) !== latestPrice)
    fail("Use the latest seller-stated price, keeping the item description.");
  // A model may emit only a description patch for an explicit seller price.
  // Fill the structured field from the same validated quote; never infer a bundle division.
  if (
    patch.price === undefined &&
    latestPrice !== null &&
    quotes.some((quote) => explicitPrice(quote) === latestPrice)
  )
    patch.price = latestPrice;
  if (!draft.description || priceOnlyDescription(draft.description))
    return undefined;
  const narrative = (corrected?.text ?? draft.description).trim();
  const trimmed = fragment.trim();
  const onlyRepeatsCorrectedPrice =
    corrected !== undefined &&
    chfPrices(trimmed).length === 1 &&
    !/\b(?:per|each|both|together)\b/i.test(trimmed);
  const preserved =
    contains(narrative, trimmed) || onlyRepeatsCorrectedPrice
      ? narrative
      : `${narrative}\n${trimmed}`;
  if (preserved.length > MAX_DESCRIPTION)
    fail(
      "Keep the existing description; add the price through the price field.",
    );
  patch.description = preserved;
  return preserved;
}

/** A new seller price also corrects the old asking amount in the description. */
function syncDescriptionPrice(
  patch: AgentListingPatch,
  evidence: AgentActionEvidence[],
  { latestPrice, corrected }: Pick<SellerContext, "latestPrice" | "corrected">,
) {
  if (
    typeof patch.price === "number" &&
    patch.price === latestPrice &&
    patch.description === undefined &&
    corrected &&
    evidence.length < MAX_EVIDENCE
  ) {
    patch.description = corrected.text;
    evidence.push({ kind: "seller", quote: corrected.quote });
  }
}

/** A description the server itself rewrote for the seller's new price. */
function isKnownPriceCorrection(value: unknown, context: SellerContext) {
  const { quotes, latestPrice, corrected, preservedNarrative } = context;
  return (
    value === preservedNarrative ||
    (corrected?.text === value &&
      quotes.some(
        (quote) =>
          chfPrices(quote).includes(latestPrice!) ||
          explicitPrice(quote) === latestPrice ||
          normalized(quote) === String(latestPrice),
      ))
  );
}

/**
 * The carried-forward photo narrative is already in the draft. Check the
 * addition against the full reply, even if the tool quoted only one fact.
 */
function isTypedAddition(value: unknown, { request, draft }: SellerContext) {
  return (
    typeof value === "string" &&
    (!draft.description ||
      value.startsWith(draft.description + " ") ||
      value.startsWith(draft.description + "\n")) &&
    normalized(value.slice(draft.description.length)).replace(/[.!?]+$/, "") ===
      normalized(request.text).replace(/[.!?]+$/, "")
  );
}

function checkSellerPrice(
  value: number | null,
  { request, draft, quotes }: SellerContext,
) {
  const priceAnswer = asksForPrice(request) ? bareAmount(request.text) : null;
  const priceText = FOREIGN_CURRENCY.test(request.text)
    ? null
    : explicitPrice(request.text);
  const explicit =
    priceText ??
    (draft.price === null && !FOREIGN_CURRENCY.test(draft.raw)
      ? explicitPrice(draft.raw)
      : null);
  if (
    value === null
      ? !wantsClear("price", request.text)
      : value !== explicit && value !== priceAnswer && value !== draft.price
  )
    fail(
      "The price must be stated by the seller; research suggestions need source evidence.",
    );
  if (
    value !== null &&
    !quotes.some(
      (quote) =>
        chfPrices(quote).includes(value) ||
        explicitPrice(quote) === value ||
        (normalized(quote) === String(value) &&
          (value === priceAnswer || value === draft.price)),
    )
  )
    fail("Price evidence must include the stated asking amount.");
}

function checkSellerPickup(
  value: string | undefined,
  { request, draft, quotes }: SellerContext,
) {
  if (value && value < TODAY && value !== draft.pickup)
    fail(
      "A new pickup deadline must be today or later; ask for a current date.",
    );
  if (
    value !== parsePickupDate(request.text) &&
    value !== parsePickupDate(quotes.join(" ")) &&
    value !== draft.pickup
  )
    fail("The pickup date must be stated by the seller.");
}

/** A text field changed from the draft must not let older notes replace newer facts. */
function checkAgainstDraft(
  field: keyof AgentListingDraft,
  value: string,
  serverWritten: boolean,
  { request, draft, answers }: SellerContext,
) {
  const current = draft[field];
  if (
    typeof current === "string" &&
    current &&
    value !== current &&
    !serverWritten &&
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
  if (field === "description" && typeof current === "string")
    checkKeepsDisclosures(value, current);
}

function checkKeepsDisclosures(value: string, current: string) {
  const disclosed = current
    .split(/\n+|(?<=[.!?])\s+/)
    .filter((part) =>
      /\b(?:not|no|without|scratch|scratches|damaged|broken|defect|stain|stains|worn)\b/i.test(
        part,
      ),
    );
  if (disclosed.some((part) => !contains(value, part.replace(/[.!?]+$/, ""))))
    fail("Do not remove a disclosed defect or exclusion from the description.");
}

function checkSellerField(
  field: keyof AgentListingDraft,
  value: unknown,
  context: SellerContext,
) {
  const { request, quotes, answers } = context;
  const serverWritten =
    field === "description" &&
    (isKnownPriceCorrection(value, context) || isTypedAddition(value, context));
  if (field === "price") checkSellerPrice(value as number | null, context);
  else if (field === "pickup")
    checkSellerPickup(value as string | undefined, context);
  else if (value === "") {
    if (!wantsClear(field, request.text))
      fail(`Clearing ${field} needs an explicit request.`);
  } else if (
    typeof value !== "string" ||
    (!serverWritten && !sellerWording(value, quotes, answers)) ||
    negated(value, request.text)
  )
    fail(
      `${field} must use only supplied seller wording; ask for missing facts.`,
    );
  if (typeof value === "string" && value && field !== "pickup")
    checkAgainstDraft(field, value, serverWritten, context);
}

/** Every changed field stands in the seller's own words; the description keeps its narrative. */
function checkSellerPatch(
  patch: AgentListingPatch,
  evidence: AgentActionEvidence[],
  request: AgentRunRequest,
  draft: AgentListingDraft,
) {
  const quotes = evidence
    .filter((item) => item.kind === "seller")
    .map((item) => item.quote);
  const latestPrice = latestSellerPrice(request);
  const corrected = correctedDescriptionPrice(
    draft.description,
    draft.price ?? explicitPrice(draft.description),
    latestPrice,
  );
  const preservedNarrative = reconcilePriceFragment(patch, {
    draft,
    quotes,
    latestPrice,
    corrected,
  });
  const context: SellerContext = {
    request,
    draft,
    quotes,
    answers: sellerAnswers(request),
    latestPrice,
    corrected,
    preservedNarrative,
  };
  syncDescriptionPrice(patch, evidence, context);
  for (const [field, value] of Object.entries(patch))
    checkSellerField(field as keyof AgentListingDraft, value, context);
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
  if (research.length) checkResearchedPrice(patch, research, offerSourceIds);
  else checkSellerPatch(patch, evidence, request, request.context.currentDraft);
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
