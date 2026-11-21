import type { TourText } from "../i18n/en.ts";
import { orderOptions } from "../optionOrder.ts";
import type { StudyOption } from "../tourScript.ts";
import type { V3Progress } from "./v3Progress.ts";
import {
  FREE_DRAFTS,
  triedBefore,
  wasBuying,
  type V3ChoiceStep,
} from "./v3Script.ts";

/**
 * A step's question in the page's language. Whether a feature would have helped
 * is asked as a hypothetical of someone who never tried to exchange anything.
 */
export function questionOf(
  text: TourText,
  step: V3ChoiceStep,
  answers: V3Progress["answers"],
): string {
  if (step.feature && !triedBefore(answers)) return text.v3.helpedNeverTried;
  const { question } = text.v3.steps[step.id];
  return typeof question === "function" ? question(FREE_DRAFTS) : question;
}

function labelOf(
  text: TourText,
  step: V3ChoiceStep,
  id: string,
  answers: V3Progress["answers"],
) {
  if (step.id === "last-trouble" && id === "finding") {
    const buying = wasBuying(answers["last-role"]?.chosen[0]);
    return buying
      ? text.v3.steps["last-trouble"].options.finding
      : text.v3.findingBySeller;
  }
  const labels: Record<string, string> = text.v3.steps[step.id].options;
  const label = labels[id];
  if (label === undefined)
    throw new Error(`Option ${id} of ${step.id} has no words.`);
  return label;
}

/** The step's options with their words, in the order this participant sees them. */
export function optionsOf(
  text: TourText,
  step: V3ChoiceStep,
  progress: Pick<V3Progress, "answers" | "orders">,
): StudyOption[] {
  const options = step.options.map((id) => ({
    id,
    label: labelOf(text, step, id, progress.answers),
    withText: id === step.withText,
    exclusive: id === step.exclusive,
  }));
  const order = progress.orders[step.id];
  return order ? orderOptions(options, order) : options;
}
