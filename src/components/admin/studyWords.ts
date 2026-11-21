import type { TourScene } from "../../tour/device/sceneMessages";
import { EN } from "../../tour/i18n/en";
import { FREE_DRAFTS } from "../../tour/v3/v3Script";

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
  draft: {
    question: "Offer draft with the planted day",
    options: {
      "sent-unchanged": "Sent unchanged",
      "sent-edited": "Sent after editing",
      "not-sent": "Not sent",
      edit: "Edit tapped, nothing decided",
    },
  },
  peek: {
    question: "After “About you”",
    options: { finish: "Finished", tour: "Watched the full scenes" },
  },
};

/** Screens that show something instead of asking. */
const SHOWN: Record<string, string> = {
  "app-find": `Scene: ${EN.scenes.find.title}`,
  "app-sell": `Scene: ${EN.scenes.sell.title}`,
  "app-deal": `Scene: ${EN.scenes.deal.title}`,
  reveal: "Reveal of the planted day",
};

function wordsOf(step: string): Words | undefined {
  const steps: Record<
    string,
    {
      question: string | ((free: number) => string);
      options: Record<string, string>;
    }
  > = EN.v3.steps;
  const words = steps[step];
  if (RECORDED[step] || !words) return RECORDED[step];
  const { question, options } = words;
  return {
    question: typeof question === "function" ? question(FREE_DRAFTS) : question,
    options,
  };
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
  return feature
    ? `${EN.scenes[feature].title}: ${words.question}`
    : words.question;
}

export function optionLabel(step: string, option: string): string {
  return wordsOf(step)?.options[option] ?? option;
}
