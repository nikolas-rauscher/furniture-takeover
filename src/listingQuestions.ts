import type {
  AgentListingPatchEvent,
  AgentQuestionEvent,
  AgentTapAnswer,
} from "../shared/actions.ts";
import { listingFieldNames, type ListingField } from "./agentActions.ts";
import type { ListingDraft } from "./components/SellFlow.tsx";

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
