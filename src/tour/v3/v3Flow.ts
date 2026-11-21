import type { StudyEventKind } from "../../../shared/study.ts";
import { shuffleOptions, type RandomSource } from "../optionOrder.ts";
import { emptiedOffPath, isShown, neighbourStep } from "../stepConditions.ts";
import type { V3Answer, V3Progress } from "./v3Progress.ts";
import {
  answerIds,
  offeredOptions,
  V3_SECTIONS,
  V3_STEPS,
  type V3Section,
  type V3Step,
} from "./v3Script.ts";

/** The contract's limit for the time on one step. */
const MAX_STEP_MS = 60 * 60 * 1000;

type AnswerSheet = V3Progress["answers"];

/**
 * The steps that pass `keeps`, in order. A step that depends on an earlier one goes with
 * it, so an answer left on a step off the path decides nothing.
 */
function stepsAlong(keeps: (step: V3Step) => boolean): V3Step[] {
  const along: V3Step[] = [];
  for (const step of V3_STEPS) {
    const dependsOn = step.when?.step;
    const reachable =
      dependsOn === undefined || along.some(({ id }) => id === dependsOn);
    if (reachable && keeps(step)) along.push(step);
  }
  return along;
}

/** The steps this participant sees, given their answers so far. */
export const visibleV3Steps = (answers: AnswerSheet): V3Step[] =>
  stepsAlong((step) => isShown(step, answers));

/**
 * The options a stored answer was given among, where earlier answers decide them, such
 * as the obstacles of `last-trouble` per role. Null where every participant sees the same.
 */
function offerOf(id: string, answers: AnswerSheet): string | null {
  const step = V3_STEPS.find((candidate) => candidate.id === id);
  if (step?.kind !== "choice" || !step.onlyFor) return null;
  return offeredOptions(step, answers).join();
}

/**
 * Answers given among other options than an earlier answer now offers, so the
 * participant never answered the list they would now see: they are emptied like
 * answers off the path.
 */
function emptiedByOffer(before: AnswerSheet, after: AnswerSheet) {
  const emptied: AnswerSheet = {};
  for (const [id, answer] of Object.entries(after)) {
    const given = answer.chosen.length > 0 || answer.text !== "";
    if (given && offerOf(id, before) !== offerOf(id, after))
      emptied[id] = { ...answer, chosen: [], text: "" };
  }
  return emptied;
}

/**
 * Empties the answers of steps that the change from `before` takes off the participant's
 * path, such as `last-trouble` once `last-role` becomes `none`, and of steps whose options
 * the change alters, such as `last-trouble` between buying and selling. Each keeps its
 * first answer, its order and its time; the events stay as they were.
 */
export function withoutAnswersOffPath(
  before: AnswerSheet,
  after: V3Progress,
): V3Progress {
  const emptied = {
    ...emptiedByOffer(before, after.answers),
    ...emptiedOffPath(
      visibleV3Steps(before),
      visibleV3Steps(after.answers),
      answerIds,
      after.answers,
    ),
  };
  // An emptied answer is a new save, so it outranks the answer it replaces.
  const raised = Object.fromEntries(
    Object.entries(emptied).map(([id, answer]) => [
      id,
      { ...answer, revision: answer.revision + 1 },
    ]),
  );
  return { ...after, answers: { ...after.answers, ...raised } };
}

export function v3StepById(id: string): V3Step {
  const step = V3_STEPS.find((candidate) => candidate.id === id);
  if (!step) throw new Error(`Survey v3 has no step ${id}.`);
  return step;
}

export const nextV3 = (answers: AnswerSheet, id: string) =>
  neighbourStep(visibleV3Steps(answers), id, 1);
const previousV3 = (answers: AnswerSheet, id: string) =>
  neighbourStep(visibleV3Steps(answers), id, -1);

export const backTarget = (progress: V3Progress): V3Step =>
  previousV3(progress.answers, progress.stepId);

/** Back is offered except before the first screen and once the answers are saved. */
export function canGoBack(steps: readonly V3Step[], step: V3Step): boolean {
  const index = steps.findIndex((candidate) => candidate.id === step.id);
  return index > 0 && step.kind !== "end";
}

/** Which options a step shuffles, the answer id their order is stored under, and the fixed ends. */
type Shuffle = {
  key: string;
  ids: readonly string[];
  fixedFirst: number;
  fixedLast: number;
};

/** The middle options in a new order; the fixed ones keep their places at both ends. */
function shuffledIds(
  { ids, fixedFirst, fixedLast }: Shuffle,
  random: RandomSource,
) {
  const marked = ids.slice(fixedFirst).map((id, index, rest) => ({
    id,
    last: index >= rest.length - fixedLast,
  }));
  const middle = shuffleOptions(marked, random).map((option) => option.id);
  return [...ids.slice(0, fixedFirst), ...middle];
}

function shuffleOf(step: V3Step, answers: AnswerSheet): Shuffle | null {
  if (step.kind !== "choice" || !step.shuffle) return null;
  return {
    key: step.id,
    ids: offeredOptions(step, answers),
    fixedFirst: step.fixedFirst,
    fixedLast: step.fixedLast,
  };
}

/** Whether a stored order holds exactly the options offered now. */
const ordersSame = (
  stored: readonly string[] | undefined,
  ids: readonly string[],
) =>
  stored !== undefined &&
  stored.length === ids.length &&
  ids.every((id) => stored.includes(id));

/**
 * A shuffled step draws its order the first time it is shown and keeps it, until an
 * earlier answer changes the options it offers.
 */
export function withV3Order(
  progress: V3Progress,
  step: V3Step,
  random: RandomSource = Math.random,
): V3Progress {
  const shuffle = shuffleOf(step, progress.answers);
  if (!shuffle || ordersSame(progress.orders[shuffle.key], shuffle.ids))
    return progress;
  return {
    ...progress,
    orders: {
      ...progress.orders,
      [shuffle.key]: shuffledIds(shuffle, random),
    },
  };
}

/**
 * The answer as stored. The first answer's options stay; time adds up over every visit,
 * and a tab left open longer than the contract allows counts as its limit.
 */
export function recordV3Answer(
  given: { chosen: string[]; text: string; firstChosen?: string[] },
  shown: string[],
  earlier: V3Answer | undefined,
  visitMs: number,
): V3Answer {
  const elapsed = (earlier?.elapsedMs ?? 0) + Math.round(visitMs);
  return {
    chosen: given.chosen,
    firstChosen: earlier?.firstChosen ?? given.firstChosen ?? given.chosen,
    shown,
    text: given.text.trim(),
    elapsedMs: Math.min(elapsed, MAX_STEP_MS),
    revision: (earlier?.revision ?? 0) + 1,
  };
}

/** How a stored answer was reached: first given, given again differently, or left out. */
export function answerEvent(
  answer: V3Answer,
  earlier: V3Answer | undefined,
): StudyEventKind {
  if (answer.chosen.length === 0 && answer.text === "") return "skipped";
  if (!earlier) return "answered";
  const same =
    earlier.text === answer.text &&
    earlier.chosen.join() === answer.chosen.join();
  return same ? "answered" : "changed";
}

/** Adds an event at the end of the record. */
export function withEvent(
  progress: V3Progress,
  kind: StudyEventKind,
  step: string | null = null,
  detail: string | null = null,
  at: Date = new Date(),
): V3Progress {
  const event = {
    seq: progress.events.length,
    kind,
    step,
    detail,
    at: at.toISOString(),
  };
  return { ...progress, events: [...progress.events, event] };
}

export type SectionState = "done" | "current" | "next";

/** Each section's state on this step; after the core every section is done. */
export function sectionStates(step: V3Step): Record<V3Section, SectionState> {
  const current = step.section
    ? V3_SECTIONS.indexOf(step.section)
    : V3_SECTIONS.length;
  return Object.fromEntries(
    V3_SECTIONS.map((section, index) => [
      section,
      index < current ? "done" : index === current ? "current" : "next",
    ]),
  ) as Record<V3Section, SectionState>;
}

/** The current part's bar never starts empty, so its first screen already shows a start. */
export const MIN_SECTION_FILL = 0.15;

/**
 * Steps that may still come: a conditional step counts until the answer it depends on
 * rules it out. So the strip counts the longest path, and an answer can only shorten it.
 */
function possibleSteps(answers: AnswerSheet): V3Step[] {
  return stepsAlong((step) => {
    if (!step.when) return true;
    const decided = (answers[step.when.step]?.chosen.length ?? 0) > 0;
    return !decided || isShown(step, answers);
  });
}

/**
 * How far the participant is through the current part: the share of its possible steps
 * before this one, at least the minimum. As answers only rule steps out, the bar never
 * goes back on the way forward; never having tried skips part 1's rest at once.
 */
export function sectionFill(answers: AnswerSheet, step: V3Step): number {
  const inSection = possibleSteps(answers).filter(
    (candidate) => candidate.section === step.section,
  );
  const done = inSection.findIndex((candidate) => candidate.id === step.id);
  if (done === -1) throw new Error(`Step ${step.id} is not part of this run.`);
  return Math.max(MIN_SECTION_FILL, done / inSection.length);
}
