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
    super("Your description is full. Shorten it in Edit details.");
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

/**
 * A step of the price card's stepper that suits the amount: single francs for
 * small things, rounder steps for dearer ones.
 */
export function niceStep(price: number): number {
  if (price < 20) return 1;
  if (price < 100) return 5;
  if (price < 500) return 10;
  if (price < 2000) return 50;
  return 100;
}

/** What Pako's tray above the composer shows. */
export type TrayPhase =
  "hidden" | "starting" | "working" | "asking" | "done" | "error";

export function trayPhase({
  starting,
  status,
  asking,
}: {
  /** Pako still reads the photos before his first run starts. */
  starting: boolean;
  status: "idle" | "running" | "complete" | "error";
  /** A question waits for the student. */
  asking: boolean;
}): TrayPhase {
  if (starting) return "starting";
  if (asking) return "asking";
  if (status === "running") return "working";
  if (status === "error") return "error";
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

/**
 * A question as asked, and what Pako wrote after it: the tray shows the asked
 * sentence as the heading and keeps the rest, such as his reasoning, apart.
 */
export function splitQuestion(text: string): { ask: string; aside: string } {
  const end = text.search(/\?\s+\S/);
  if (end < 0) return { ask: text.trim(), aside: "" };
  return {
    ask: text.slice(0, end + 1).trim(),
    aside: text.slice(end + 1).trim(),
  };
}
