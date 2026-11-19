import type {
  AgentListingPatchEvent,
  AgentQuestionEvent,
  AgentTapAnswer,
} from "../shared/actions.ts";
import { listingFieldNames, type ListingField } from "./agentActions.ts";
import type { ListingDraft } from "./components/SellFlow.tsx";
import type { AgentRunAction } from "./hooks/useAgentRun.ts";

const MAX_DESCRIPTION = 4000;

/** What a tapped answer does: most apply here, only open answers go back to Pako. */
export type TapOutcome =
  | { kind: "accept-proposal"; answer: AgentTapAnswer }
  | { kind: "patch"; answer: AgentTapAnswer }
  /** A plain answer to a question with tap actions is an uncertain one, such as "Not sure". */
  | { kind: "record" }
  | { kind: "ask-agent" };

export function tapOutcome(
  question: AgentQuestionEvent,
  label: string,
): TapOutcome {
  const answer = question.choiceActions?.find((item) => item.label === label);
  if (answer?.acceptsProposal) return { kind: "accept-proposal", answer };
  if (answer?.patch || answer?.appendDescription)
    return { kind: "patch", answer };
  const offered = Boolean(answer) || Boolean(question.choices?.includes(label));
  return question.choiceActions?.length && offered
    ? { kind: "record" }
    : { kind: "ask-agent" };
}

export class DescriptionFullError extends Error {
  constructor() {
    super("The description has no room for this. Shorten it in Edit details.");
    this.name = "DescriptionFullError";
  }
}

/** Adds a sentence on its own line, once; a description that would grow too long is refused. */
export function appendToDescription(
  description: string,
  sentence: string,
): string {
  const current = description.trim();
  const addition = sentence.trim();
  if (current.toLowerCase().includes(addition.toLowerCase())) return current;
  const next = current ? `${current}\n${addition}` : addition;
  if (next.length > MAX_DESCRIPTION) throw new DescriptionFullError();
  return next;
}

/**
 * The change a tapped answer makes, as a listing change of its own: the student's
 * choice is the evidence, and it needs no further confirmation.
 */
export function tapAction(
  answer: Pick<AgentTapAnswer, "label" | "patch" | "appendDescription">,
  draft: Pick<ListingDraft, "description">,
  id: string,
): AgentListingPatchEvent {
  return {
    type: "listing_patch",
    id,
    patch: {
      ...answer.patch,
      ...(answer.appendDescription
        ? {
            description: appendToDescription(
              draft.description,
              answer.appendDescription,
            ),
          }
        : {}),
    },
    reason: `You chose “${answer.label}”.`,
    evidence: [{ kind: "seller", quote: answer.label }],
    requiresAcceptance: false,
  };
}

/** The question to ask now: the first one waiting, with those put off for later at the end. */
export function nextQuestion<Question extends { id: string }>(
  questions: readonly Question[],
  answers: Readonly<Record<string, string>>,
  deferred: readonly string[],
): Question | undefined {
  const waiting = questions.filter((question) => !answers[question.id]);
  return (
    waiting.find((question) => !deferred.includes(question.id)) ?? waiting[0]
  );
}

const isDraftField = (field: string): field is ListingField =>
  (listingFieldNames as readonly string[]).includes(field);

/** A question about a field the student has since filled in no longer needs an answer. */
export function resolvedByDraft(
  question: Pick<AgentQuestionEvent, "listingField">,
  draft: ListingDraft,
): boolean {
  const field = question.listingField;
  return Boolean(
    field &&
    field !== "description" &&
    isDraftField(field) &&
    draft[field].trim(),
  );
}

/** Pako's researched price, which waits for the student's decision. */
export type PriceSuggestion = AgentListingPatchEvent & {
  patch: { price: number };
};

export const isPriceSuggestion = (
  action: AgentRunAction,
): action is PriceSuggestion =>
  action.type === "listing_patch" &&
  action.requiresAcceptance &&
  typeof action.patch.price === "number";

/** The newest price Pako suggested among these changes. */
export function priceSuggestion(
  actions: readonly AgentRunAction[],
): PriceSuggestion | undefined {
  return actions.filter(isPriceSuggestion).at(-1);
}

/** Pako's newest suggested price, while the listing has no price of its own. */
export function pendingPrice(
  turns: readonly { actions: readonly AgentRunAction[] }[],
  draft: Pick<ListingDraft, "price">,
): number | undefined {
  if (draft.price.trim()) return undefined;
  return priceSuggestion(turns.flatMap((turn) => turn.actions))?.patch.price;
}

/** A question about the asking price, answered with the price card. */
export const asksPrice = (
  question: Pick<AgentQuestionEvent, "listingField" | "input">,
) => question.listingField === "price" || question.input?.type === "price";

/** The highest asking price the price card takes. */
export const MAX_ASKING_PRICE = 10_000;

/** A round step that suits the amount: single francs for small things, rounder steps for dearer ones. */
export function niceStep(price: number): number {
  if (price < 20) return 1;
  if (price < 100) return 5;
  if (price < 500) return 10;
  if (price < 2000) return 50;
  return 100;
}

/**
 * The seller's price slider: from free up to twice the price, or the top of
 * the range Pako offered when that is higher, ending on a round amount.
 */
export function priceSliderRange(price: number, rangeMax = 0) {
  const room = Math.max(price * 2, rangeMax, 20);
  const round = niceStep(room);
  const max = Math.min(MAX_ASKING_PRICE, Math.ceil(room / round) * round);
  return { min: 0, max, step: 1 };
}

/** What Pako's tray above the composer shows. */
export type TrayPhase =
  "hidden" | "starting" | "working" | "asking" | "done" | "error" | "asleep";

export function trayPhase({
  starting,
  status,
  asking,
  asleep,
}: {
  /** Pako still reads the photos before his first run starts. */
  starting: boolean;
  status: "idle" | "running" | "complete" | "error";
  /** A question waits for the student. */
  asking: boolean;
  /** The day's allowance is used up, so a failed run will not work again today. */
  asleep: boolean;
}): TrayPhase {
  if (starting) return "starting";
  if (asking) return "asking";
  if (status === "running") return "working";
  if (status === "error") return asleep ? "asleep" : "error";
  if (status === "complete") return "done";
  return "hidden";
}

const listWords = (words: readonly string[]) =>
  words.length < 2
    ? words.join("")
    : `${words.slice(0, -1).join(", ")} and ${words.at(-1)}`;

/** Pako's closing line once his questions are answered: what is left before saving. */
export function closingLine(missing: readonly string[], action: string) {
  return missing.length
    ? {
        title: "Almost there!",
        text: `Add the ${listWords(missing)}, then tap ${action}.`,
      }
    : {
        title: "All set!",
        text: `Check the card and tap ${action} when you're happy.`,
      };
}

/** Where one sentence ends and the next begins with a capital letter or a quote. */
const SENTENCE_BREAK = /(?<=[.!])\s+(?=["“A-Z])/;

/**
 * A question as asked, and what Pako wrote around it: the tray shows the asked
 * sentence as the heading, the sentences leading up to it as its context, and
 * keeps what follows, such as his reasoning, apart.
 */
export function splitQuestion(text: string): {
  lead: string;
  ask: string;
  aside: string;
} {
  const end = text.search(/\?\s+\S/);
  const asked = (end < 0 ? text : text.slice(0, end + 1)).trim();
  const sentences = asked.split(SENTENCE_BREAK);
  return {
    lead: sentences.slice(0, -1).join(" "),
    ask: sentences.at(-1) ?? asked,
    aside: end < 0 ? "" : text.slice(end + 1).trim(),
  };
}

/** Pako's own question about pickup times, asked without a run. */
export const PICKUP_QUESTION: AgentQuestionEvent = {
  type: "question",
  id: "pako-pickup",
  listingField: "pickup",
  question: "When can buyers pick it up?",
  choices: ["Weekday evenings", "Weekends"],
  choiceActions: [
    {
      label: "Weekday evenings",
      appendDescription: "Pickup on weekday evenings.",
    },
    { label: "Weekends", appendDescription: "Pickup on weekends." },
  ],
};

const HANDOVER_WORDS =
  /\b(?:pick(?:ing)?[ -]?up|collect(?:ed|ion)?|hand(?:ed|ing)?[ -]?over|shipping|ship|deliver(?:y|ed)?|postage)\b/i;
const HANDOVER_METHOD =
  /\b(?:shipping|ship|deliver(?:y|ed)?|postage|hand(?:ed|ing)?[ -]?over)\b/i;
const PICKUP_WORD = /\b(?:pick(?:ing)?[ -]?up|collect(?:ed|ion)?)\b/i;
const TIME_WORD =
  /\b(?:evenings?|mornings?|afternoons?|weekends?|weekdays?|(?:mon|tues|wednes|thurs|fri|satur|sun)days?|any ?time|appointment|only|until|flexible)\b/i;

/** The longest pickup sentence a listing shows in its short pickup line. */
const MAX_PICKUP_LINE = 80;

const sentences = (text: string) =>
  text
    .split(/[.!?\n]/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);

const saysPickupTime = (sentence: string) =>
  PICKUP_WORD.test(sentence) && TIME_WORD.test(sentence);

/** The description already says how or when buyers get the item, not only where. */
function saysHandover(description: string) {
  return sentences(description).some(
    (sentence) => HANDOVER_METHOD.test(sentence) || saysPickupTime(sentence),
  );
}

/**
 * A listing's pickup line without a last collection day: the pickup times its
 * description states, such as "Pickup on weekends", or flexible pickup.
 */
export function undatedPickup(description: string): string {
  const times = sentences(description).find(saysPickupTime);
  if (!times) return "Flexible pickup";
  return times.length <= MAX_PICKUP_LINE
    ? times
    : `${times.slice(0, MAX_PICKUP_LINE - 1).trimEnd()}…`;
}

/**
 * A question about how or when buyers get the item. A price question stays one even
 * when it names pickup on the way, as in "desks for pickup near Lausanne go for…".
 */
export const isPickupQuestion = (
  question: Pick<AgentQuestionEvent, "listingField" | "question" | "input">,
) =>
  !asksPrice(question) &&
  (question.listingField === "pickup" ||
    HANDOVER_WORDS.test(question.question));

/**
 * Pako asks for pickup times himself, once per listing, unless the listing
 * already says how it is handed over or an earlier turn asked about it.
 */
export function handoverQuestion(
  draft: Pick<ListingDraft, "pickup" | "description">,
  earlierTurns: readonly { questions: readonly AgentQuestionEvent[] }[],
): AgentQuestionEvent | undefined {
  if (draft.pickup || saysHandover(draft.description)) return undefined;
  const asked = earlierTurns.flatMap((turn) => turn.questions);
  return asked.some(
    (question) =>
      question.id === PICKUP_QUESTION.id || isPickupQuestion(question),
  )
    ? undefined
    : PICKUP_QUESTION;
}

/**
 * The questions of this turn in the order Pako asks them: his own pickup question
 * first, asked or answered, then the run's, which leave pickup to him.
 */
export function questionQueue(
  questions: readonly AgentQuestionEvent[],
  pickup: AgentQuestionEvent | undefined,
): AgentQuestionEvent[] {
  const own =
    pickup ?? questions.find((question) => question.id === PICKUP_QUESTION.id);
  const fromRun = questions.filter(
    (question) =>
      question.id !== PICKUP_QUESTION.id && (!own || !isPickupQuestion(question)),
  );
  return own ? [own, ...fromRun] : fromRun;
}

/** Pako's line when his allowance runs out while he writes the listing. */
export function restingLine(action: string) {
  return {
    title: "I've used today's requests",
    text: `Your card keeps what I wrote so far. Fill in the rest and tap ${action}.`,
  };
}
