import type { z } from "zod";
import type {
  AgentListingQuestion,
  AgentQuestionEvent,
} from "../shared/actions.ts";
import type { questionSchema } from "./actions.ts";

type Question = z.infer<typeof questionSchema>;

type SingleQuestion = Omit<Question, "followUps">;

const measurementLabel = /^(?:\d+(?:[.,]\d+)?\s*(?:(?:mm|cm|m|in|inches|ft)\s*)?[×x]\s*){0,2}\d+(?:[.,]\d+)?\s*(?:mm|cm|m|in|inch|inches|ft)$/i;

const deskMeasurements = /\bwidth\b.*\bdepth\b.*\bheight\b|\bdimensions\b/i;

function dimensionChoices(question: SingleQuestion, title: string) {
  let choices = question.choices;
  if (!choices && /\bdesk\b/i.test(title) &&
      deskMeasurements.test(question.question) &&
      !/\b(?:inch(?:es)?|feet|mm)\b/i.test(question.question)) {
    choices = ["120 × 60 × 75 cm", "140 × 70 × 75 cm", "160 × 80 × 75 cm"];
  }
  return choices?.map((choice) =>
    typeof choice === "string" && measurementLabel.test(choice)
      ? { label: choice, patch: { dimensions: choice } }
      : choice,
  );
}

export function formatQuestion(
  { choices, ...question }: SingleQuestion,
  listingTitle?: string,
): AgentListingQuestion {
  if (listingTitle !== undefined && (!question.listingField || question.listingField === "other") &&
      deskMeasurements.test(question.question)) {
    question.listingField = "dimensions";
  }
  if (listingTitle !== undefined && question.listingField === "dimensions") {
    choices = dimensionChoices({ ...question, choices }, listingTitle);
  }
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
