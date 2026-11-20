import type { AgentActionEvidence } from "../shared/actions.ts";
import type { AgentRunRequest, AgentRunSource } from "../shared/runs.ts";
import { isSkippedAnswer } from "./conversation.ts";

export const normalized = (text: string) =>
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

export function fail(message: string): never {
  throw new ActionRejection(`ACTION_REJECTED: ${message}`);
}
export const contains = (text: string, quote: string) =>
  normalized(text).includes(normalized(quote));

export function sellerFacts(request: AgentRunRequest): string[] {
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

export function validateEvidence(
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

export function negated(value: string, text: string) {
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

export function extractive(value: string, quotes: string[]) {
  const parts = textParts(value);
  return parts.length > 0 && parts.every((part) => quoted(part, quotes));
}

export type SellerAnswer = { question: string; answer: string };

/** The seller's answers to Pako's questions so far; a skip states nothing. */
export function sellerAnswers(request: AgentRunRequest): SellerAnswer[] {
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
export function sellerWording(
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

export function wantsClear(field: string, text: string) {
  const label = field === "pickup" ? "(?:pickup|deadline|date)" : field;
  return new RegExp(
    `\\b(?:clear|remove|reset|delete)\\s+(?:the\\s+)?(?:asking\\s+)?${label}\\b`,
    "i",
  ).test(text);
}
