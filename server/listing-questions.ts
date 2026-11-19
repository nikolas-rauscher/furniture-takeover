import type { z } from "zod";
import type {
  AgentListingQuestion,
  AgentQuestionEvent,
} from "../shared/actions.ts";
import type { questionSchema } from "./actions.ts";

type Question = z.infer<typeof questionSchema>;

export function formatQuestion({
  choices,
  ...question
}: Omit<Question, "followUps">): AgentListingQuestion {
  if (!choices) return question;
  const choiceActions = choices.filter((choice) => typeof choice !== "string");
  return {
    ...question,
    choices: choices.map((choice) =>
      typeof choice === "string" ? choice : choice.label,
    ),
    ...(choiceActions.length ? { choiceActions } : {}),
  };
}

export function askingPriceQuestion(
  id: string,
  price?: number,
): AgentQuestionEvent {
  const question: AgentQuestionEvent = {
    type: "question",
    id,
    listingField: "price",
    question: "What asking price would you like?",
  };
  if (price === undefined) return question;
  const label = `Use CHF ${price}`;
  return {
    ...question,
    input: {
      type: "price",
      min: 0,
      max: Math.min(10_000, Math.ceil(price * 1.5)),
      step: Number.isInteger(price) ? 1 : 0.01,
      value: price,
    },
    choices: [label, "Give it away for free"],
    choiceActions: [
      { label, patch: { price }, acceptsProposal: true },
      { label: "Give it away for free", patch: { price: 0 } },
    ],
  };
}
