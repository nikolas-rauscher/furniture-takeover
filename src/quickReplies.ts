import {
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
  | { kind: "compare"; text: string; listingIds: [string, string] }
  /** Starts the watch Pako offered, as far out as the search looks; the tap creates it, never the agent. */
  | {
      kind: "watch";
      text: string;
      query: string;
      maxPrice?: number;
      radius: number;
    }
  /** The offered watch is on already: a confirmation, not a button. */
  | { kind: "watching"; text: string }
  /** Beside that confirmation, the way to the saved searches and their matches. */
  | { kind: "searches"; text: string };

/** The replies the student can tap; a running watch only confirms itself. */
export type TappableReply = Exclude<QuickReply, { kind: "watching" }>;

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
    | "watchSuggestion"
  >;
  /** The watch Pako offered in this turn is on already. */
  watching: boolean;
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
const WATCH_OFFER_LINE =
  "Nothing yet. Save this search for new matches, or let me look wider.";
const WATCHING_LINE = "This search is saved. New matches show up in Searches.";
/** "Any budget" is stored as this maximum price. */
const ANY_BUDGET = 1_000_000;
/** The largest radius a search area accepts. */
const MAX_RADIUS_KM = 500;
const FREE_ONLY = "Free items only";
const COLLECT_BY_SUNDAY = "Pickup by Sunday";
const SEE_SEARCHES: QuickReply = { kind: "searches", text: "See Searches" };

/**
 * What the student can tap after Pako's latest finished answer: keeping watch
 * when nothing fits yet, acting on the best matches or narrowing the search
 * after student listings, broadening it when none fit. Every reply comes from
 * the turn and the search's own criteria.
 */
export function quickReplies(input: QuickRepliesInput): QuickReplies {
  const { turn, search } = input;
  if (
    !search ||
    search.intent === "listing_review" ||
    !input.latest ||
    turn.status !== "complete" ||
    input.negotiating ||
    turn.proposal
  )
    return NO_REPLIES;
  const budget = chosenBudget(search);
  const watch = watchReply(input);
  if (turn.questions.some((question) => !turn.answers[question.id]))
    return watch ? { line: null, replies: withRoute(watch) } : NO_REPLIES;
  if (foundNothing(turn)) {
    const broader = broaderSearches(search.criteria, budget);
    if (!watch)
      return broader.length
        ? {
            line: NOTHING_FOUND_LINE,
            replies: broader.slice(0, MAX_BROADER_SEARCHES),
          }
        : NO_REPLIES;
    return {
      line: watch.kind === "watching" ? WATCHING_LINE : WATCH_OFFER_LINE,
      replies: [...withRoute(watch), ...broader].slice(0, MAX_BROADER_SEARCHES),
    };
  }
  // Web results alone mean no student listing fits: widen the search, never narrow it.
  const studentMatches = Boolean(turn.inventoryMatchIds?.length);
  return {
    line: null,
    replies: [
      ...(watch ? withRoute(watch) : []),
      ...listingActions(input.listings),
      ...(studentMatches
        ? narrowerSearches(search.criteria, budget, input.today)
        : broaderSearches(search.criteria, budget)),
    ].slice(0, MAX_NEXT_STEPS),
  };
}

/** Replies that ask Pako need the daily allowance; comparing and keeping watch do not. */
export const usesAllowance = (reply: QuickReply) =>
  reply.kind === "ask" || reply.kind === "offer";

/**
 * Pako's offer to keep watch, first among the replies. With web results on
 * screen it names student listings, since only those can be watched.
 */
function watchReply({
  turn,
  watching,
  search,
}: QuickRepliesInput): QuickReply | undefined {
  const suggestion = turn.watchSuggestion;
  if (!suggestion || !search) return;
  if (watching) return { kind: "watching", text: "Search saved" };
  return {
    kind: "watch",
    text: foundNothing(turn) ? "Save search" : "Save search for new listings",
    query: suggestion.query,
    ...(suggestion.maxPrice === undefined
      ? {}
      : { maxPrice: suggestion.maxPrice }),
    radius: search.criteria.radius,
  };
}

const ask = (text: string): QuickReply => ({ kind: "ask", text });

/** A saved search confirms itself and points to Searches right beside it. */
const withRoute = (watch: QuickReply) =>
  watch.kind === "watching" ? [watch, SEE_SEARCHES] : [watch];

function listingActions([best, second]: readonly ShownListing[]) {
  const replies: QuickReply[] = [];
  if (best?.offerable)
    replies.push({
      kind: "offer",
      listingId: best.id,
      text: `${best.price === 0 ? "Plan pickup" : "Draft offer"}: ${best.title}`,
    });
  if (best && second)
    replies.push({
      kind: "compare",
      listingIds: [best.id, second.id],
      text: "Compare two listings",
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
  if (lower !== undefined) replies.push(ask(`Under CHF ${lower}`));
  const closer = closerRadius(criteria.radius);
  if (closer !== undefined) replies.push(ask(`Within ${closer} km`));
  if (criteria.maxPrice > 0) replies.push(ask(FREE_ONLY));
  if (!criteria.pickup || criteria.pickup > weekendDeadline(today))
    replies.push(ask(COLLECT_BY_SUNDAY));
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
}: NonNullable<QuickRepliesInput["search"]>) {
  return maxPrice > 0 && maxPrice < ANY_BUDGET ? maxPrice : undefined;
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
  const { pickup } = extractSearchConstraints(COLLECT_BY_SUNDAY, today);
  if (!pickup) throw new Error("The weekend reply must name a pickup date.");
  return pickup;
}
