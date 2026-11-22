import { EN } from "../../tour/i18n/en";
import { amountOption, amountsOf, V3_STEPS } from "../../tour/v3/v3Script";
import { amountLabel } from "../../tour/v3/v3Words";

type Words = { question: string; options: Record<string, string> };

const EARLIER_PLANS = {
  free: "Free",
  "seller-fee": "Fee per sale",
  "pack-5": "Pack of 5",
  monthly: "Monthly subscription",
};

/** Stored questions without an entry in the current survey dictionary. */
const RECORDED: Record<string, Words> = {
  "pay-model-not": {
    question: "Which of these would you not use?",
    options: {
      ...EARLIER_PLANS,
      "all-ok": "I'd consider all of them",
    },
  },
  "draft-day": {
    question: "Day picked in the practice chat",
    options: EN.v3.draft.days,
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
};

/** Labels for answers still present in reports from before the v4-3 wording. */
const EARLIER_OPTIONS: Record<string, Record<string, string>> = {
  "pay-model": { ...EARLIER_PLANS, "not-sure": "Not sure" },
  "last-messages": { "1-5": "1–5", "6-15": "6–15", "over-15": "More than 15" },
};

/** The amounts of each slider step, labelled as the participant read them. */
const AMOUNTS: Record<string, Words> = Object.fromEntries(
  V3_STEPS.flatMap((step) => {
    if (step.kind !== "amount") return [];
    const words = EN.v3.amounts[step.id];
    const options = Object.fromEntries(
      amountsOf(step).map((amount) => [
        amountOption(amount),
        amountLabel(words, amount),
      ]),
    );
    return [[step.id, { question: words.question, options }]];
  }),
);

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
  return RECORDED[step] ?? AMOUNTS[step] ?? steps[step];
}

/**
 * The English question of a stored step. Steps of an older wording version may have
 * no words in today's survey; they show their id, which the protocol's queries use too.
 */
export function questionLabel(step: string): string {
  return wordsOf(step)?.question ?? SHOWN[step] ?? step;
}

export function optionLabel(step: string, option: string): string {
  return (
    wordsOf(step)?.options[option] ?? EARLIER_OPTIONS[step]?.[option] ?? option
  );
}
