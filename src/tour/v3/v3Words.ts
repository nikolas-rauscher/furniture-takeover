import type { TourText } from "../i18n/en.ts";
import { orderOptions } from "../optionOrder.ts";
import type { StudyOption } from "../tourScript.ts";
import type { V3Progress } from "./v3Progress.ts";
import { offeredOptions, type V3ChoiceStep } from "./v3Script.ts";

/** A step's question in the page's language. */
export const questionOf = (text: TourText, step: V3ChoiceStep): string =>
  text.v3.steps[step.id].question;

function labelOf(text: TourText, step: V3ChoiceStep, id: string) {
  const labels: Record<string, string> = text.v3.steps[step.id].options;
  const label = labels[id];
  if (label === undefined)
    throw new Error(`Option ${id} of ${step.id} has no words.`);
  return label;
}

/** A way of paying as a card: its price and the same two facts as every other card. */
function planOf(text: TourText, step: V3ChoiceStep, id: string) {
  if (step.id !== "pay-model" || id === "not-sure") return {};
  const { plans } = text.v3;
  const cards: Record<string, TourText["v3"]["plans"]["cards"]["monthly"]> =
    plans.cards;
  const card = cards[id];
  if (card === undefined) throw new Error(`Plan ${id} has no words.`);
  return {
    plan: {
      price: card.price,
      facts: [
        { label: plans.help, value: card.help },
        { label: plans.pay, value: card.pay },
      ],
    },
  };
}

/** The one-line field's label, where a step names it instead of the option. */
function textLineOf(text: TourText, step: V3ChoiceStep, id: string) {
  if (id !== step.withText || step.id !== "seeking") return {};
  return { textLine: text.v3.seekingWhat };
}

/** The options this participant is offered, with their words, in the order they see them. */
export function optionsOf(
  text: TourText,
  step: V3ChoiceStep,
  progress: Pick<V3Progress, "answers" | "orders">,
): StudyOption[] {
  const options = offeredOptions(step, progress.answers).map((id) => ({
    id,
    label: labelOf(text, step, id),
    withText: id === step.withText,
    exclusive: id === step.exclusive,
    ...planOf(text, step, id),
    ...textLineOf(text, step, id),
  }));
  const order = progress.orders[step.id];
  return order ? orderOptions(options, order) : options;
}
