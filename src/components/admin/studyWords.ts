import type { TourScene } from "../../tour/device/sceneMessages";
import { EN } from "../../tour/i18n/en";

type Words = { question: string; options: Record<string, string> };

/**
 * Answers stored without a question of their own in the survey's dictionary, and the
 * desk task, whose options the participant read as prices beside two distances.
 */
const RECORDED: Record<string, Words> = {
  desk: {
    question: EN.v3.steps.desk.question,
    options: {
      nearer: "CHF 45, 200 m away",
      cheaper: "CHF 30, 4 km away",
      neither: "Neither",
    },
  },
  "last-story": { question: EN.v3.lastStory.question, options: {} },
  "draft-day": {
    question: "Day picked in the practice chat",
    options: EN.v3.draft.days,
  },
  "draft-variant": {
    question: "Offer Pako drafted in the practice chat",
    options: {
      exact: "At the agreed CHF 40",
      "wrong-price": "At CHF 35 instead of the agreed CHF 40",
    },
  },
  draft: {
    question: "What participants did with Pako's offer draft",
    options: {
      "sent-unchanged": "Sent as it is",
      "sent-changed": "Changed, then sent",
      "sent-own": "Wrote their own",
      "not-sent": "Not sent",
      change: "Started changing, nothing decided",
      own: "Started their own, nothing decided",
    },
  },
  "pack-chf-2": {
    question: EN.v3.packLadder.question(2),
    options: EN.v3.packLadder.options,
  },
  "pack-chf-5": {
    question: EN.v3.packLadder.question(5),
    options: EN.v3.packLadder.options,
  },
  "pack-chf-8": {
    question: EN.v3.packLadder.question(8),
    options: EN.v3.packLadder.options,
  },
  peek: {
    question: "After “About you”",
    // The choice is counted, not the playback: "Skip the rest" can follow it.
    options: { finish: "Finished", tour: "Chose the full scenes" },
  },
};

/** Screens that show something instead of asking. */
const SHOWN: Record<string, string> = {
  "app-find": `Scene: ${EN.v3.scenes.find.title}`,
  "app-sell": `Scene: ${EN.v3.scenes.sell.title}`,
  "app-deal": `Scene: ${EN.v3.scenes.deal.title}`,
  "what-is": "What is takeover?",
  "part-last-time": `Part screen: ${EN.v3.sections["last-time"]}`,
  "part-the-app": `Part screen: ${EN.v3.sections["the-app"]}`,
  "part-situations": `Part screen: ${EN.v3.sections.situations}`,
  "part-price": `Part screen: ${EN.v3.sections.price}`,
  "pack-price": "Move-out pack price ladder",
};

function wordsOf(step: string): Words | undefined {
  const steps: Record<
    string,
    { question: string; options: Record<string, string> }
  > = EN.v3.steps;
  const words = steps[step];
  if (RECORDED[step] || !words) return RECORDED[step];
  return words;
}

/** A situation's scenario, which the participant read on its card before the question. */
function scenarioOf(step: string): string | undefined {
  const { situations } = EN.v3;
  if (step === "move-it" || step === "desk") return situations[step];
  return undefined;
}

/** The feature a "would it have helped" question follows, named for the admin. */
function featureOf(step: string): TourScene | undefined {
  const feature = step.replace(/^helped-/, "");
  return feature === "find" || feature === "sell" || feature === "deal"
    ? feature
    : undefined;
}

/**
 * The English question of a stored step. Steps of an older wording version may have
 * no words in today's survey; they show their id, which the protocol's queries use too.
 */
export function questionLabel(step: string): string {
  const words = wordsOf(step);
  if (!words) return SHOWN[step] ?? step;
  const feature = step.startsWith("helped-") ? featureOf(step) : undefined;
  if (feature) return `${EN.scenes[feature].title}: ${words.question}`;
  const scenario = scenarioOf(step);
  return scenario ? `${scenario} ${words.question}` : words.question;
}

/**
 * Codes the survey shares between two wordings. Buyers read "Finding the right item"
 * and sellers "Finding someone who wanted it"; both are stored as `finding`.
 */
const POOLED: Record<string, Record<string, string>> = {
  "last-trouble": {
    finding: "Finding the right item, or someone who wanted it",
  },
};

export function optionLabel(step: string, option: string): string {
  return POOLED[step]?.[option] ?? wordsOf(step)?.options[option] ?? option;
}
