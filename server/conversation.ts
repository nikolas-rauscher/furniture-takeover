import type { AgentListingQuestion } from "../shared/actions.ts";
import type { AgentRunRequest } from "../shared/runs.ts";

/** Classify the actual question, ignoring confirmations preceding it. */
export function questionTopic(text: string): string | undefined {
  const question = (text.match(/[^.!?]*\?/g)?.at(-1) ?? text)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  if (
    /pickup|pick(?:ed)?|collect|handover|hand(?:ed|ing)? over|ab(?:ge)?hol|uberg|versand|ship|livraison|retrait/.test(
      question,
    )
  ) {
    if (
      /\b(?:when|time|day|evening|weekend|availability|wann|zeit|abend|wochenende|quand)\b/.test(
        question,
      )
    )
      return "pickup-time";
    if (/\b(?:where|location|address|point|wo|adresse|ort|ou)\b/.test(question))
      return "pickup-location";
    if (
      /shipping|ship|postage|post it|posted|delivery|only|how|versand|nur|wie|uberg|livraison|comment/.test(
        question,
      )
    )
      return "fulfillment";
  }
  if (
    /\b(?:charger|charging (?:brick|cable|adapter)|power (?:adapter|supply|brick))\b/.test(
      question,
    )
  )
    return "charger";
  if (/\b(?:budget|spend|price limit|ausgeben)\b/.test(question))
    return "budget";
  if (/\b(?:condition|zustand|etat)\b/.test(question)) return "condition";
  return undefined;
}

export function isSkippedAnswer(text: string): boolean {
  return /^(?:skip(?:ped| for now)?|i don.t know(?:[.!].*)?|not sure|leave this detail unspecified.*|keine angabe.*|uberspringen|weiß ich nicht.*|weiss ich nicht.*)$/i.test(
    text.trim(),
  );
}

export function answeredQuestions(request: AgentRunRequest) {
  const messages = request.context?.recentMessages ?? [];
  const answered = (request.context?.answeredQuestions ?? []).map((item) => ({
    ...item,
    topic: questionTopic(item.question),
  }));
  for (let index = 0; index < messages.length - 1; index++) {
    const question = messages[index];
    const answer = messages[index + 1];
    if (
      question.role === "assistant" &&
      answer.role === "user" &&
      question.text.includes("?")
    )
      answered.push({
        question: question.text,
        answer: answer.text,
        topic: questionTopic(question.text),
      });
  }
  if (request.context?.previousQuestion)
    answered.push({
      question: request.context.previousQuestion,
      answer: request.text,
      topic: questionTopic(request.context.previousQuestion),
    });
  return answered;
}

/** Words that phrase a question rather than say what it asks about. */
const PHRASING = new Set(
  (
    "a an and any are as at be by can could did do does for from has have how i " +
    "in is it its me much my next of on or please so some that the there these " +
    "this those to was what when where which who will with would you your"
  ).split(" "),
);

/** Words of answers that fit any question, such as "Not sure" or "Yes". */
const GENERIC_ANSWER = new Set(
  "yes no not sure maybe other none unknown skip don t know".split(" "),
);

const words = (value: string) =>
  value.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? [];

/** The words naming the item, such as "MacBook Pro"; its numbers are specs, not its name. */
const nameWords = (itemName: string) =>
  new Set(words(itemName).filter((word) => /^\p{L}+$/u.test(word)));

/**
 * What a question asks about: the words of its last question sentence, without
 * the phrasing around them or the item's own name.
 */
function askedAbout(text: string, name: ReadonlySet<string>): Set<string> {
  const question = text.match(/[^.!?]*\?/g)?.at(-1) ?? text;
  return new Set(
    words(question).filter((word) => !PHRASING.has(word) && !name.has(word)),
  );
}

/** Reworded, the same question still asks about the same things: one's subject holds the other's. */
function asksSame(first: string, second: string, name: ReadonlySet<string>) {
  if (first.trim().toLowerCase() === second.trim().toLowerCase()) return true;
  const [smaller, larger] = [
    askedAbout(first, name),
    askedAbout(second, name),
  ].sort((a, b) => a.size - b.size);
  return smaller.size > 0 && [...smaller].every((word) => larger.has(word));
}

/** The concrete answers a question offers, each in its words without the item's name. */
function concreteAnswers(
  choices: readonly (string | { label: string })[],
  name: ReadonlySet<string>,
) {
  return choices
    .map((choice) =>
      words(typeof choice === "string" ? choice : choice.label)
        .filter((word) => !name.has(word) && !GENERIC_ANSWER.has(word))
        .join(" "),
    )
    .filter(Boolean);
}

/** However it is worded, a question offering two of the same concrete answers asks the same thing. */
function offersSameAnswers(
  first: readonly (string | { label: string })[],
  second: readonly (string | { label: string })[],
  name: ReadonlySet<string>,
) {
  const offered = new Set(concreteAnswers(first, name));
  return (
    concreteAnswers(second, name).filter((answer) => offered.has(answer))
      .length >= 2
  );
}

export function repeatedQuestion(
  question: string,
  request: AgentRunRequest,
  listingField?: AgentListingQuestion["listingField"],
  choices?: readonly (string | { label: string })[],
) {
  // Seller history is reset when opening a different draft. Buyer history spans
  // multiple listings, so topic matches cannot establish that a proposal's fact
  // is known. Let the buyer agent use the current structured negotiation instead.
  if (request.context?.intent !== "listing_assist") return undefined;
  const topic = questionTopic(question);
  const name = nameWords(request.context.currentDraft?.title ?? "");
  const skipped = request.context.skippedQuestions?.find(
    (item) =>
      asksSame(question, item.question, name) ||
      (choices &&
        item.choices &&
        offersSameAnswers(item.choices, choices, name)) ||
      (topic && topic === questionTopic(item.question)) ||
      (listingField &&
        listingField !== "other" &&
        listingField !== "description" &&
        listingField === item.listingField),
  );
  if (skipped) return { question: skipped.question, answer: "Skipped" };
  // A user may deliberately revise a fact; allow clarification in that case.
  if (
    /\b(?:actually|change|correct|instead|different|correction)\b/i.test(
      request.text,
    )
  )
    return undefined;
  const normalize = (text: string) =>
    text
      .toLowerCase()
      .replace(/[^\p{L}\p{N}]+/gu, " ")
      .trim();
  return answeredQuestions(request).find(
    (answered) =>
      (topic && topic === answered.topic) ||
      normalize(question) === normalize(answered.question),
  );
}
