import { shuffleOptions, type RandomSource } from "./optionOrder.ts";
import type { RecordedAnswer, StudyProgress } from "./studyProgress.ts";
import {
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

function neighbour(answers: AnswerSheet, id: string, offset: 1 | -1) {
  const steps = visibleSteps(answers);
  const index = steps.findIndex((step) => step.id === id);
  if (index === -1) throw new Error(`Step ${id} is not part of this run.`);
  const step = steps[index + offset];
  if (!step)
    throw new Error(
      `Step ${id} has no step ${offset > 0 ? "after" : "before"} it.`,
    );
  return step;
}

export const nextStep = (answers: AnswerSheet, id: string) =>
  neighbour(answers, id, 1);
export const previousStep = (answers: AnswerSheet, id: string) =>
  neighbour(answers, id, -1);

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
