import type { StudyEventKind } from "../../../shared/study.ts";
import type { TourScene } from "../device/sceneMessages.ts";
import { shuffleOptions, type RandomSource } from "../optionOrder.ts";
import { emptiedOffPath, isShown, neighbourStep } from "../stepConditions.ts";
import { drawStart, ladderOf } from "./packPricing.ts";
import type { V3Answer, V3Progress } from "./v3Progress.ts";
import {
  answerIds,
  DRAFT_DAY_STEP,
  DRAFT_DAYS,
  sceneStepId,
  TOUR_SCENES_ORDER,
  V3_SECTIONS,
  V3_STEPS,
  type V3Section,
  type V3Step,
  packAnswerStep,
} from "./v3Script.ts";

/** The contract's limit for the time on one step. */
const MAX_STEP_MS = 60 * 60 * 1000;

type AnswerSheet = V3Progress["answers"];

/** The scenes in the order the participant picked: their first choice, then the rest. */
function sceneOrder(answers: AnswerSheet): readonly TourScene[] {
  const picked = answers["scene-pick"]?.chosen[0];
  const first = TOUR_SCENES_ORDER.find((scene) => scene === picked);
  if (!first) return TOUR_SCENES_ORDER;
  return [first, ...TOUR_SCENES_ORDER.filter((scene) => scene !== first)];
}

/** A scene of the optional tour, whose order the participant picks. */
export const isTourScene = (step: V3Step) =>
  step.kind === "scene" && !step.brief;

/** The steps this participant sees, given their answers so far. */
export function visibleV3Steps(answers: AnswerSheet): V3Step[] {
  const shown = V3_STEPS.filter((step) => isShown(step, answers));
  const scenes = sceneOrder(answers).map(sceneStepId);
  const firstScene = shown.findIndex(isTourScene);
  if (firstScene === -1) return shown;
  const byId = (id: string) => shown.find((step) => step.id === id);
  const ordered = scenes.map((id) => {
    const step = byId(id);
    if (!step) throw new Error(`The tour has no step ${id}.`);
    return step;
  });
  const rest = shown.filter((step) => !isTourScene(step));
  return [...rest.slice(0, firstScene), ...ordered, ...rest.slice(firstScene)];
}

/**
 * Empties the answers of steps that the change from `before` takes off the participant's
 * path, such as `last-trouble` once `last-role` becomes `none`. Each keeps its first
 * answer, its order and its time; the events stay as they were.
 */
export function withoutAnswersOffPath(
  before: AnswerSheet,
  after: V3Progress,
): V3Progress {
  const emptied = emptiedOffPath(
    visibleV3Steps(before),
    visibleV3Steps(after.answers),
    answerIds,
    after.answers,
  );
  return { ...after, answers: { ...after.answers, ...emptied } };
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

/** Where Back leads: to the scene a skip of the tour left from, or else to the step before. */
export function backTarget(progress: V3Progress): V3Step {
  if (progress.skippedFrom) return v3StepById(progress.skippedFrom);
  return previousV3(progress.answers, progress.stepId);
}

/** Back is offered except before the first screen and once the core is saved. */
export function canGoBack(steps: readonly V3Step[], step: V3Step): boolean {
  const index = steps.findIndex((candidate) => candidate.id === step.id);
  const firstAfterCore = steps.findIndex(
    (candidate) => candidate.kind === "about",
  );
  const blocked = step.kind === "saved" || step.kind === "end";
  return index > 0 && !blocked && index !== firstAfterCore;
}

/** Option ids with the ones that stay below marked, as the shuffle needs them. */
function shuffledIds(
  ids: readonly string[],
  fixedLast: number,
  random: RandomSource,
) {
  const marked = ids.map((id, index) => ({
    id,
    last: index >= ids.length - fixedLast,
  }));
  return shuffleOptions(marked, random).map((option) => option.id);
}

/** Which options a step shuffles, and the answer id their order is stored under. */
type Shuffle = { key: string; ids: readonly string[]; fixedLast: number };

function shuffleOf(step: V3Step): Shuffle | null {
  if (step.kind === "choice" && step.shuffle)
    return { key: step.id, ids: step.options, fixedLast: step.fixedLast };
  if (step.kind === "desk")
    return { key: step.id, ids: step.options, fixedLast: 1 };
  if (step.kind === "draft")
    return { key: DRAFT_DAY_STEP, ids: DRAFT_DAYS, fixedLast: 0 };
  return null;
}

/** A shuffled step draws its order the first time it is shown and keeps it; the ladder draws its start price. */
export function withV3Order(
  progress: V3Progress,
  step: V3Step,
  random: RandomSource = Math.random,
): V3Progress {
  if (step.kind === "ladder") {
    if (progress.orders[step.id]) return progress;
    const start = [drawStart(random)];
    return { ...progress, orders: { ...progress.orders, [step.id]: start } };
  }
  const shuffle = shuffleOf(step);
  if (!shuffle || progress.orders[shuffle.key]) return progress;
  const order = shuffledIds(shuffle.ids, shuffle.fixedLast, random);
  return { ...progress, orders: { ...progress.orders, [shuffle.key]: order } };
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

/**
 * Records the ladder's price on screen once, when it is first shown. The analysis
 * counts these as asked, so a participant who leaves at a price still counts there.
 */
export function withPriceShown(progress: V3Progress): V3Progress {
  const { next } = ladderOf(progress);
  if (next === null) return progress;
  const step = packAnswerStep(next);
  const seen = progress.events.some(
    (event) => event.kind === "shown" && event.step === step,
  );
  return seen ? progress : withEvent(progress, "shown", step);
}

/**
 * Adds a key moment of a full scene: tapped by the visitor or advanced by the scene.
 * A replay shows the same moments again, so only the scene's first play records them.
 */
export function withMoment(
  progress: V3Progress,
  step: string,
  moment: number,
  by: "visitor" | "scene",
  replaying: boolean,
): V3Progress {
  if (replaying) return progress;
  const kind = by === "visitor" ? "moment-tapped" : "moment-auto";
  return withEvent(progress, kind, step, `moment-${moment}`);
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
