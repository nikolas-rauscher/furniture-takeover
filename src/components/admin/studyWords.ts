import { EN } from "../../tour/i18n/en";

type Words = { question: string; options: Record<string, string> };

/** Answers stored without a question of their own in the survey's dictionary. */
const RECORDED: Record<string, Words> = {
  "draft-day": {
    question: "Day picked in the practice chat",
    options: EN.v3.draft.days,
  },
  "draft-variant": {
    question: "Reply Pako drafted in the practice chat",
    options: {
      exact: "At the agreed CHF 40",
      "wrong-price": "At CHF 45 instead of the agreed CHF 40",
    },
  },
  draft: {
    question: "What participants did with Pako's draft",
    options: {
      "sent-unchanged": "Sent as written",
      "sent-changed": "Edited, then sent",
      "sent-own": "Wrote their own",
      "not-sent": "Sent nothing",
      change: "Started editing, nothing decided",
      own: "Started their own, nothing decided",
    },
  },
  "draft-price": {
    question: "Price named in the message sent to Mia",
    options: {
      "chf-40": "CHF 40, as agreed",
      "chf-45": "CHF 45, the wrong price",
      several: "More than one price",
      "no-price": "No price",
    },
  },
};

/** Screens that show something instead of asking. */
const SHOWN: Record<string, string> = {
  "app-sell": `Scene: ${EN.v3.scenes.sell.title}`,
  "app-deal": `Scene: ${EN.v3.scenes.deal.title}`,
  "part-last-time": `Part screen: ${EN.v3.sections["last-time"]}`,
  "part-home": `Part screen: ${EN.v3.sections.home}`,
  "part-the-app": `Part screen: ${EN.v3.sections["the-app"]}`,
  "part-price": `Part screen: ${EN.v3.sections.price}`,
};

function wordsOf(step: string): Words | undefined {
  const steps: Record<string, Words> = EN.v3.steps;
  return RECORDED[step] ?? steps[step];
}

/**
 * The English question of a stored step. Steps of an older wording version may have
 * no words in today's survey; they show their id, which the protocol's queries use too.
 */
export function questionLabel(step: string): string {
  return wordsOf(step)?.question ?? SHOWN[step] ?? step;
}

export function optionLabel(step: string, option: string): string {
  return wordsOf(step)?.options[option] ?? option;
}
