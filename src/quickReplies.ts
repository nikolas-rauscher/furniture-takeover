import {
  defaults,
  extractSearchConstraints,
  type Criteria,
} from "../shared/marketplace.ts";
import type { AgentRunState } from "./hooks/useAgentRun.ts";
import { foundNothing } from "./pakoMoods.ts";
import type { SearchSnapshot } from "./searchRequest.ts";

/** A reply the student can tap under Pako's latest answer. */
export type QuickReply =
  /** Sent through the follow-up path exactly as if the student had typed it. */
  | { kind: "ask"; text: string }
  /** Opens Pako's offer draft for the best match he showed. */
  | { kind: "offer"; text: string; listingId: string }
  /** Puts the two best matches side by side on the comparison page. */
  | { kind: "compare"; text: string; listingIds: [string, string] };

/** A listing Pako showed in the turn, best match first. */
export type ShownListing = {
  id: string;
  title: string;
  price: number;
  /** Someone else's active listing, so the student can draft an offer for it. */
  offerable: boolean;
};

export type QuickRepliesInput = {
  turn: Pick<
    AgentRunState,
    | "status"
    | "steps"
    | "inventoryMatchIds"
    | "sources"
    | "questions"
    | "answers"
    | "proposal"
  >;
  /** The turn is the newest one in the conversation. */
  latest: boolean;
  /** The search the conversation runs on, if any. */
  search: Pick<
    SearchSnapshot,
    "criteria" | "text" | "originalRequest" | "intent"
  > | null;
  /** An offer draft is open in the conversation, so a reply would go to it. */
  negotiating: boolean;
  listings: readonly ShownListing[];
  /** Today in Zurich as YYYY-MM-DD, which fixes "this weekend". */
  today: string;
};

/** The replies, and the line Pako says above them when they need an introduction. */
export type QuickReplies = {
  line: string | null;
  replies: readonly QuickReply[];
};

const NO_REPLIES: QuickReplies = { line: null, replies: [] };
const MAX_NEXT_STEPS = 4;
const MAX_BROADER_SEARCHES = 3;
const NOTHING_FOUND_LINE =
  "Nothing turned up this time. Shall I look a little wider?";
/** "Any budget" is stored as this maximum price. */
const ANY_BUDGET = 1_000_000;
/** The largest radius a search area accepts. */
const MAX_RADIUS_KM = 500;
/* The parser reads a free budget only from an amount, so the reply names one. */
const FREE_ONLY = "Free items only (CHF 0)";
const READY_THIS_WEEKEND = "Ready this weekend";

/**
 * What the student can tap after Pako's latest finished answer: acting on the
 * best matches or narrowing the search after results, broadening it after an
 * empty search. Every reply comes from the turn and the search's own criteria.
 */
export function quickReplies(input: QuickRepliesInput): QuickReplies {
  const { turn, search } = input;
  if (!search || search.intent === "listing_review" || !awaitsReply(input))
    return NO_REPLIES;
  const budget = chosenBudget(search);
  if (foundNothing(turn)) {
    const replies = broaderSearches(search.criteria, budget).slice(
      0,
      MAX_BROADER_SEARCHES,
    );
    return replies.length ? { line: NOTHING_FOUND_LINE, replies } : NO_REPLIES;
  }
  return {
    line: null,
    replies: [
      ...listingActions(input.listings),
      ...narrowerSearches(search.criteria, budget, input.today),
    ].slice(0, MAX_NEXT_STEPS),
  };
}

/** Every reply except the comparison asks Pako, so it needs the daily allowance. */
export const usesAllowance = (reply: QuickReply) => reply.kind !== "compare";

/** Only the newest finished turn waits for a reply; a question or an offer draft has its own. */
function awaitsReply({ turn, latest, negotiating }: QuickRepliesInput) {
  return (
    latest &&
    turn.status === "complete" &&
    !negotiating &&
    !turn.proposal &&
    turn.questions.every((question) => turn.answers[question.id])
  );
}

const ask = (text: string): QuickReply => ({ kind: "ask", text });

function listingActions([best, second]: readonly ShownListing[]) {
  const replies: QuickReply[] = [];
  if (best?.offerable)
    replies.push({
      kind: "offer",
      listingId: best.id,
      text: `${best.price === 0 ? "Plan pickup for" : "Draft an offer for"} ${best.title}`,
    });
  if (best && second)
    replies.push({
      kind: "compare",
      listingIds: [best.id, second.id],
      text: "Compare the top two",
    });
  return replies;
}

function narrowerSearches(
  criteria: Criteria,
  budget: number | undefined,
  today: string,
) {
  const replies: QuickReply[] = [];
  const lower = budget === undefined ? undefined : lowerBudget(budget);
  if (lower !== undefined) replies.push(ask(`Cheaper: under CHF ${lower}`));
  const closer = closerRadius(criteria.radius);
  if (closer !== undefined) replies.push(ask(`Closer: within ${closer} km`));
  if (criteria.maxPrice > 0) replies.push(ask(FREE_ONLY));
  if (!criteria.pickup || criteria.pickup > weekendDeadline(today))
    replies.push(ask(READY_THIS_WEEKEND));
  return replies;
}

function broaderSearches(criteria: Criteria, budget: number | undefined) {
  const replies: QuickReply[] = [];
  const higher = budget === undefined ? undefined : higherBudget(budget);
  if (higher !== undefined)
    replies.push(ask(`Raise my budget to CHF ${higher}`));
  const wider = widerRadius(criteria.radius);
  if (wider !== undefined) replies.push(ask(`Search within ${wider} km`));
  if (criteria.source !== "All") replies.push(ask("Search all sources"));
  if (criteria.pickup) replies.push(ask("Any pickup date"));
  return replies;
}

/** The CHF limit the student chose; the app's default ceiling, "free" and "any budget" are none. */
function chosenBudget({
  criteria: { maxPrice },
  originalRequest,
  text,
}: NonNullable<QuickRepliesInput["search"]>) {
  if (maxPrice <= 0 || maxPrice >= ANY_BUDGET) return undefined;
  if (maxPrice !== defaults.maxPrice) return maxPrice;
  const written = extractSearchConstraints(`${originalRequest}\n${text}`);
  return written.maxPrice === maxPrice ? maxPrice : undefined;
}

/** Amounts as students say them: whole francs, then steps of 5, 10, 50 and 100. */
function priceStep(amount: number) {
  if (amount < 20) return 1;
  if (amount < 200) return 5;
  if (amount < 1000) return 10;
  if (amount < 5000) return 50;
  return 100;
}

/** A share of an amount in whole cents, so 100 × 1.3 is 130 rather than a hair above it. */
const share = (amount: number, factor: number) =>
  Math.round(amount * factor * 100) / 100;

/** About a quarter below the budget, rounded down to an amount students say. */
function lowerBudget(budget: number) {
  const target = share(budget, 0.75);
  const lower = Math.floor(target / priceStep(target)) * priceStep(target);
  return lower > 0 ? lower : undefined;
}

/** About 30% above the budget, rounded up to an amount students say. */
function higherBudget(budget: number) {
  const target = share(budget, 1.3);
  const higher = Math.ceil(target / priceStep(target)) * priceStep(target);
  return higher < ANY_BUDGET ? higher : undefined;
}

function closerRadius(radius: number) {
  const closer = Math.max(1, Math.floor(radius / 2));
  return closer < radius ? closer : undefined;
}

function widerRadius(radius: number) {
  const wider = Math.min(MAX_RADIUS_KM, radius * 2);
  return wider > radius ? wider : undefined;
}

/** The pickup deadline the weekend reply sets, read the way its follow-up will be read. */
function weekendDeadline(today: string) {
  const { pickup } = extractSearchConstraints(READY_THIS_WEEKEND, today);
  if (!pickup) throw new Error("The weekend reply must name a pickup date.");
  return pickup;
}
