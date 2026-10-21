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
  if (/\b(?:budget|spend|price limit|ausgeben)\b/.test(question))
    return "budget";
  if (/\b(?:condition|zustand|etat)\b/.test(question)) return "condition";
  return undefined;
}

export function isSkippedAnswer(text: string): boolean {
  return /^(?:skip(?: for now)?|i don.t know(?:[.!].*)?|not sure|leave this detail unspecified.*|keine angabe.*|uberspringen|weiß ich nicht.*|weiss ich nicht.*)$/i.test(
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

export function repeatedQuestion(question: string, request: AgentRunRequest) {
  // Seller history is reset when opening a different draft. Buyer history spans
  // multiple listings, so topic matches cannot establish that a proposal's fact
  // is known. Let the buyer agent use the current structured negotiation instead.
  if (request.context?.intent !== "listing_assist") return undefined;
  // A user may deliberately revise a fact; allow clarification in that case.
  if (
    /\b(?:actually|change|correct|instead|different|correction)\b/i.test(
      request.text,
    )
  )
    return undefined;
  const topic = questionTopic(question);
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
