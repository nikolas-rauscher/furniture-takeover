import { shuffleOptions, type RandomSource } from "./optionOrder.ts";
import { emptiedOffPath, neighbourStep } from "./stepConditions.ts";
import type { RecordedAnswer, StudyProgress } from "./studyProgress.ts";
import {
  isQuestion,
  visibleSteps,
  type AnswerSheet,
  type StepAnswer,
  type StudyStep,
} from "./tourScript.ts";

/** The contract's limit for the time on one step. */
const MAX_STEP_MS = 60 * 60 * 1000;

export const EMPTY_ANSWER: StepAnswer = { chosen: [], shown: [], text: "" };

function shufflesOptions(step: StudyStep): boolean {
  return (
    step.kind === "nearer-or-cheaper" ||
    (step.kind === "multiple" && step.shuffle)
  );
}

/** A shuffled step draws its order the first time it is shown and keeps it. */
export function withOrder(
  progress: StudyProgress,
  step: StudyStep,
  random: RandomSource = Math.random,
): StudyProgress {
  if (!shufflesOptions(step) || !("options" in step)) return progress;
  if (progress.orders[step.id]) return progress;
  const order = shuffleOptions(step.options, random).map((option) => option.id);
  return { ...progress, orders: { ...progress.orders, [step.id]: order } };
}

export const nextStep = (
  steps: readonly StudyStep[],
  answers: AnswerSheet,
  id: string,
) => neighbourStep(visibleSteps(steps, answers), id, 1);
export const previousStep = (
  steps: readonly StudyStep[],
  answers: AnswerSheet,
  id: string,
) => neighbourStep(visibleSteps(steps, answers), id, -1);

/**
 * The answers of steps that the change from `before` to `after` takes off the
 * participant's path, emptied, such as `far-transport` once the nearer desk is chosen.
 */
export function answersOffPath(
  steps: readonly StudyStep[],
  before: AnswerSheet,
  after: Record<string, RecordedAnswer>,
): Record<string, RecordedAnswer> {
  return emptiedOffPath(
    visibleSteps(steps, before),
    visibleSteps(steps, after),
    (step) => (isQuestion(step) ? [step.id] : []),
    after,
  );
}

/**
 * The answer as stored. Time adds up over every visit to the step, and a tab left open
 * longer than the contract allows counts as its limit, so the answer is still kept.
 */
export function recordAnswer(
  answer: StepAnswer,
  earlier: RecordedAnswer | undefined,
  visitMs: number,
): RecordedAnswer {
  const elapsed = (earlier?.elapsedMs ?? 0) + Math.round(visitMs);
  return {
    chosen: answer.chosen,
    shown: answer.shown,
    text: answer.text.trim(),
    elapsedMs: Math.min(elapsed, MAX_STEP_MS),
  };
}

/** Whether Continue may be pressed with this answer. */
export function isAnswered(step: StudyStep, answer: StepAnswer): boolean {
  switch (step.kind) {
    case "single":
    case "nearer-or-cheaper":
      return answer.chosen.length === 1;
    case "multiple":
      return answer.chosen.length > 0;
    case "draft-check":
      return answer.chosen.length > 0;
    default:
      return true;
  }
}
