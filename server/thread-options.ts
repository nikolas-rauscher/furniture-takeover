import { messageStatesTerms, type DealTerms } from "../shared/deal.ts";
import type {
  ThreadFacts,
  ThreadTurn,
  ThreadTurnRequest,
} from "../shared/threadTurn.ts";
import {
  amountAllowed,
  cardTerms,
  pointAllowed,
  resolveWrittenPickup,
  shippingAllowed,
  timeAllowed,
} from "./thread-conversation.ts";
import { checkOptionLabel } from "./thread-draft-wording.ts";
import type { Proposal, ProposedOption } from "./thread-proposal.ts";
import { checkSafeText } from "./thread-safe-text.ts";

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
  if (pickupTime && !timeAllowed(pickupTime, request))
    throw new Error(
      `${where}.terms.pickupTime: nobody named that time. Copy time words from a message or the listing, or leave the time out and ask for one.`,
    );
  if (proposed.pickupPoint && !pointAllowed(proposed.pickupPoint, request))
    throw new Error(
      `${where}.terms.pickupPoint: nobody named that place. Use a meeting point from the conversation, the listing or campusMeetingPoints, or leave it out.`,
    );
  if (proposed.fulfillment === "shipping" && !shippingAllowed(request))
    throw new Error(
      `${where}.terms.fulfillment: shipping needs the student's own words or the deal card.`,
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
    pickupAt: pickupTime
      ? (cardTerms(request).find((terms) => terms.pickupTime === pickupTime)
          ?.pickupAt ?? resolveWrittenPickup(pickupTime, request, now))
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

export function logDroppedOption(
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
export function checkedOptions(
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

/** A replacement for one rejected reply: safe, checked and different from the reply kept. */
export function replacementOption(
  option: ProposedOption,
  index: number,
  reading: ThreadTurn,
  request: ThreadTurnRequest,
  now: Date,
): ThreadTurn["options"][number] {
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
  return checkedOption(option, index, request, reading.facts, now);
}
