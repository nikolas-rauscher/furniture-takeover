/** A step is shown only when an earlier answer includes one of these options. */
export type StepCondition = { step: string; anyOf: readonly string[] };

type ConditionalStep = { id: string; when?: StepCondition };
type ChosenSheet = Record<string, { chosen: readonly string[] }>;

export function isShown(step: ConditionalStep, answers: ChosenSheet): boolean {
  if (!step.when) return true;
  const { step: earlier, anyOf } = step.when;
  const chosen = answers[earlier]?.chosen ?? [];
  return chosen.some((id) => anyOf.includes(id));
}

type GivenAnswer = { chosen: string[]; text: string };

/** Whether an answer holds a choice or words; a skipped or emptied one holds neither. */
const holdsAnswer = (answer: GivenAnswer | undefined) =>
  answer !== undefined && (answer.chosen.length > 0 || answer.text !== "");

/**
 * The answers of steps a change takes off the participant's path: shown with the
 * answers before it, not shown with those after it. Each comes back emptied, so it
 * counts as not answered; the rest it records, such as the time on screen, stays.
 */
export function emptiedOffPath<
  Step extends { id: string },
  Answer extends GivenAnswer,
>(
  shownBefore: readonly Step[],
  shownAfter: readonly Step[],
  answerIds: (step: Step) => string[],
  answers: Record<string, Answer>,
): Record<string, Answer> {
  const stillShown = new Set(shownAfter.map((step) => step.id));
  const emptied: Record<string, Answer> = {};
  for (const step of shownBefore) {
    if (stillShown.has(step.id)) continue;
    for (const id of answerIds(step))
      if (holdsAnswer(answers[id]))
        emptied[id] = { ...answers[id], chosen: [], text: "" };
  }
  return emptied;
}

/** The step just after or before `id` among the steps shown. */
export function neighbourStep<Step extends { id: string }>(
  steps: readonly Step[],
  id: string,
  offset: 1 | -1,
): Step {
  const index = steps.findIndex((step) => step.id === id);
  if (index === -1) throw new Error(`Step ${id} is not part of this run.`);
  const step = steps[index + offset];
  if (!step)
    throw new Error(
      `Step ${id} has no step ${offset > 0 ? "after" : "before"} it.`,
    );
  return step;
}
