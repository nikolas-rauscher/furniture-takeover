import type { GuideBubble } from "./Guide";
import {
  GUIDE_NAME,
  actCopy,
  exampleSearch,
  intentById,
  intentOptions,
  placeById,
  places,
  storyActs,
  type Act,
  type Answers,
  type CompleteAnswers,
  type Intent,
  type PlaceId,
} from "./onboardingContent.ts";
import type { PakoMood } from "./storyTypes.ts";

export type StepId =
  "welcome" | "intro" | "intent" | "place" | "items" | Act | "done";

export type OnboardingOutcome =
  | { next: "dismiss" }
  | { next: "sign-in"; location?: string }
  | { next: "explore" | "sell"; location: string }
  | { next: "search"; location: string; query: string };

const QUESTION_STEPS: StepId[] = [
  "welcome",
  "intro",
  "intent",
  "place",
  "items",
];
/** Every intent tells the same three scenes, each in its own order. */
const SCENE_COUNT = 3;
export const STEP_COUNT = QUESTION_STEPS.length + SCENE_COUNT + 1;

export function flowSteps(intent: Intent): StepId[] {
  return [...QUESTION_STEPS, ...storyActs(intent), "done"];
}

/** Before the visitor says what brings them here, only the questions exist. */
export function stepAt(index: number, intent: Intent | undefined): StepId {
  const step = (intent ? flowSteps(intent) : QUESTION_STEPS)[index];
  if (!step) throw new Error(`The intro has no step ${index} yet.`);
  return step;
}

export function isAct(step: StepId): step is Act {
  return step === "snap" || step === "ask" || step === "chat";
}

export function heroStep(step: StepId) {
  return step === "welcome" || step === "done";
}

export function stepMood(step: StepId): PakoMood {
  if (step === "welcome" || step === "intro") return "wave";
  return step === "done" ? "cheer" : "idle";
}

export const questions = {
  intent: {
    id: "intent",
    title: "What brings you to takeover?",
    text: "Pick the one that fits you best.",
  },
  place: {
    id: "place",
    title: "Where do you live or study?",
    text: "I'll search and suggest pickups around there.",
  },
  sellItems: {
    id: "items-sell",
    title: "What's still in your room?",
    text: "Pick everything you want to pass on.",
  },
  findItems: {
    id: "items-find",
    title: "What are you looking for?",
    text: "Pick as many as you like.",
  },
} satisfies Record<string, GuideBubble>;

export type QuestionStep = "intent" | "place" | "items";

export function isQuestion(step: StepId): step is QuestionStep {
  return step === "intent" || step === "place" || step === "items";
}

export function itemsQuestion(intent: Intent | undefined) {
  return intent === "sell" ? questions.sellItems : questions.findItems;
}

const intentReaction = (intent: Intent): GuideBubble => ({
  id: `intent-${intent}`,
  text: intentById(intent).reaction,
});

const placeReaction = (place: PlaceId): GuideBubble => ({
  id: `place-${place}`,
  title: `${placeById(place).name} it is!`,
  text: "I'll look around there first.",
});

/** What Pako says on a step: the question, or a reaction once it is answered. */
export function stepBubble(
  step: StepId,
  answers: Answers,
): GuideBubble | undefined {
  if (heroStep(step)) return undefined;
  if (step === "intro")
    return {
      id: "intro",
      title: `Hi, I'm ${GUIDE_NAME}!`,
      text: "I'm your moving box with superpowers. I list your things, find what you need and sort out the details with other students.",
    };
  if (step === "intent")
    return answers.intent ? intentReaction(answers.intent) : questions.intent;
  if (step === "place")
    return answers.place ? placeReaction(answers.place) : questions.place;
  if (step === "items") return itemsQuestion(answers.intent);
  if (!answers.intent)
    throw new Error("The story starts after the visitor picked an intent.");
  return { id: step, ...actCopy(step, answers.intent) };
}

/**
 * Everything Pako may say on a step, the question and each reaction to an answer, so
 * his bubble keeps the size of the longest line and the answers below never move.
 */
export function stepLines(step: StepId, answers: Answers): GuideBubble[] {
  if (step === "intent")
    return [
      questions.intent,
      ...intentOptions.map(({ id }) => intentReaction(id)),
    ];
  if (step === "place")
    return [questions.place, ...places.map(({ id }) => placeReaction(id))];
  const bubble = stepBubble(step, answers);
  return bubble ? [bubble] : [];
}

export function canContinue(
  step: StepId,
  answers: Answers,
  finishedActs: Act[],
): boolean {
  if (step === "intent") return Boolean(answers.intent);
  if (step === "place") return Boolean(answers.place);
  if (step === "items") return answers.items.length > 0;
  if (isAct(step)) return finishedActs.includes(step);
  return true;
}

/** The final screen's main button for this visitor. */
export function finalAction(
  answers: CompleteAnswers,
  accountAction: boolean,
): { label: string; outcome: OnboardingOutcome } {
  const location = placeById(answers.place).searchArea;
  if (accountAction)
    return {
      label: "Sign in to start",
      outcome: { next: "sign-in", location },
    };
  if (answers.intent === "sell")
    return {
      label: "Take my first photo",
      outcome: { next: "sell", location },
    };
  return {
    label: "Start my first search",
    outcome: {
      next: "search",
      location,
      query: exampleSearch(answers.items),
    },
  };
}

export function exploreOutcome(answers: CompleteAnswers): OnboardingOutcome {
  return { next: "explore", location: placeById(answers.place).searchArea };
}
