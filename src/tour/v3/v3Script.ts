/**
 * Survey version 3 as data: step and option ids, order, sections and who sees what.
 * The words live in the dictionaries under `v3`. Ids are what the server stores, so
 * they change only together with `V3_VERSION`.
 */

import type { TourScene } from "../device/sceneMessages.ts";
import type { TourText } from "../i18n/en.ts";
import type { StepCondition } from "../stepConditions.ts";

/** Raised whenever a question, an option or its wording changes. */
export const V3_VERSION = "v3-1";
/** The time the start screen and the share text name, rounded up from the core's estimate. */
export const V3_MINUTES = 4;
/** The participant is asked not to talk about the planted error before this day. */
export const V3_CLOSES = "2026-12-13";
/** Free photo drafts a day in the pack situation. */
export const FREE_DRAFTS = 3;
/** The one open sentence is shorter than what the server accepts. */
export const STORY_MAX = 200;

export const V3_SECTIONS = [
  "you",
  "last-time",
  "first-look",
  "situations",
] as const;
export type V3Section = (typeof V3_SECTIONS)[number];

type StepWords = TourText["v3"]["steps"];
type ChoiceStepId = keyof StepWords;

/** Pako's line above a step's question, opening a part of the survey. */
type Intro = "moveIntro" | "firstLookIntro" | "situationsIntro";

type Base = {
  id: string;
  when?: StepCondition;
  /** The part of the core the step belongs to; steps after the core have none. */
  section?: V3Section;
};

export type V3ChoiceStep = Base & {
  kind: "choice";
  id: ChoiceStepId;
  /** Option ids in their listed order. */
  options: readonly string[];
  /** Options shuffled once per participant; the last `fixedLast` stay below. */
  shuffle: boolean;
  fixedLast: number;
  intro?: Intro;
  /** A product question: Pako keeps a neutral face whatever is picked. */
  product: boolean;
  /** Said after any pick, before Continue: the option shown is not real yet. */
  disclosure?: "helperMissing" | "packMissing";
  /** An option that opens a short text field once picked. */
  withText?: string;
};

export type V3Step =
  | V3ChoiceStep
  | (Base & { kind: "story" })
  | (Base & { kind: "desk"; options: readonly string[] })
  | (Base & { kind: "draft" })
  | (Base & { kind: "reveal" })
  | (Base & { kind: "saved" })
  | (Base & { kind: "about"; rows: readonly V3ChoiceStep[] })
  | (Base & { kind: "scene"; scene: TourScene })
  | (Base & { kind: "pilot" })
  | (Base & { kind: "end" });

/** The day picked in the draft chat is stored as an answer of its own. */
export const DRAFT_DAY_STEP = "draft-day";
export const DRAFT_DAYS = ["sat", "sun"] as const;
export type DraftDay = (typeof DRAFT_DAYS)[number];
/** The first button tapped on the offer, kept as the draft's first answer. */
export type DraftAction = "send" | "edit" | "dont-send";
/** The draft's final answer; `edit` stays the final answer when nothing was decided. */
export type DraftResult = "sent-unchanged" | "sent-edited" | "not-sent";

/** Pressed at the end of "About you": finish, or watch the optional tour first. */
export const PEEK_STEP = "peek";

const BUYING = ["buying", "getting-free"];
const TRIED: StepCondition = {
  step: "last-role",
  anyOf: [...BUYING, "selling", "giving-away"],
};
const STUDENTS: StepCondition = {
  step: "who",
  anyOf: ["epfl", "unil", "other-school"],
};
/** Only EPFL and UNIL students can open an account, so only they are invited. */
const ACCOUNT_HOLDERS: StepCondition = { step: "who", anyOf: ["epfl", "unil"] };
const WATCHES_TOUR: StepCondition = { step: PEEK_STEP, anyOf: ["tour"] };

function choice(
  id: ChoiceStepId,
  options: readonly string[],
  extra: Partial<V3ChoiceStep> = {},
): V3ChoiceStep {
  return {
    kind: "choice",
    id,
    options,
    shuffle: false,
    fixedLast: 0,
    product: false,
    ...extra,
  };
}

/** Whether the participant was buying or getting, which changes one obstacle's words. */
export const wasBuying = (role: string | undefined) =>
  role !== undefined && BUYING.includes(role);

export const TOUR_SCENES_ORDER: readonly TourScene[] = ["sell", "deal", "find"];
export const sceneStepId = (scene: TourScene) => `tour-${scene}`;

export const V3_STEPS: readonly V3Step[] = [
  choice("who", ["epfl", "unil", "other-school", "no"], { section: "you" }),
  choice(
    "last-role",
    ["buying", "getting-free", "selling", "giving-away", "none"],
    { section: "last-time" },
  ),
  choice(
    "last-item",
    [
      "furniture",
      "household",
      "electronics",
      "bike",
      "books",
      "clothes",
      "other",
    ],
    { section: "last-time", when: TRIED },
  ),
  choice(
    "last-occasion",
    ["moving-in", "moving-out", "no-move", "cant-recall"],
    {
      section: "last-time",
      when: TRIED,
    },
  ),
  { kind: "story", id: "last-story", section: "last-time", when: TRIED },
  choice(
    "last-trouble",
    [
      "finding",
      "listing",
      "price",
      "replies",
      "timing",
      "transport",
      "trust",
      "nothing",
      "other",
      "cant-recall",
    ],
    { section: "last-time", when: TRIED, shuffle: true, fixedLast: 3 },
  ),
  choice(
    "why-not",
    ["no-need", "prefer-new", "hassle", "dont-know-where", "other"],
    {
      section: "last-time",
      when: { step: "last-role", anyOf: ["none"] },
      shuffle: true,
      fixedLast: 1,
    },
  ),
  choice(
    "move",
    ["move-feb", "move-jun", "move-later", "no-plan", "not-sure"],
    {
      section: "last-time",
      intro: "moveIntro",
    },
  ),
  choice("housing", ["fmel", "other-res", "flat", "family", "elsewhere"], {
    section: "last-time",
  }),
  choice("headline", ["h-move", "h-photo", "h-ai", "h-nearby", "none"], {
    section: "first-look",
    intro: "firstLookIntro",
    product: true,
    shuffle: true,
    fixedLast: 1,
  }),
  choice("autonomy", ["yes", "no", "unsure"], {
    section: "first-look",
    product: true,
    shuffle: true,
    fixedLast: 1,
  }),
  choice("who-sends", ["stays", "sent-later", "sent-now", "not-sure"], {
    section: "first-look",
    product: true,
    shuffle: true,
    fixedLast: 1,
  }),
  choice(
    "move-it",
    [
      "carry-bike",
      "public-transport",
      "friend-car",
      "helper",
      "skip-desk",
      "not-sure",
    ],
    {
      section: "situations",
      intro: "situationsIntro",
      product: true,
      shuffle: true,
      fixedLast: 2,
      disclosure: "helperMissing",
    },
  ),
  {
    kind: "desk",
    id: "desk",
    section: "situations",
    options: ["nearer", "cheaper", "neither"],
  },
  choice("pack", ["manual", "wait", "pack", "other-way", "not-sure"], {
    section: "situations",
    product: true,
    shuffle: true,
    fixedLast: 2,
    disclosure: "packMissing",
  }),
  { kind: "draft", id: "draft", section: "situations" },
  { kind: "reveal", id: "reveal" },
  { kind: "saved", id: "saved" },
  {
    kind: "about",
    id: "about-you",
    rows: [
      choice("age", ["18-20", "21-23", "24-26", "27-30", "31-plus", "na"]),
      choice("gender", ["woman", "man", "non-binary", "self-describe", "na"], {
        withText: "self-describe",
      }),
    ],
  },
  {
    kind: "about",
    id: "about-studies",
    when: STUDENTS,
    rows: [
      choice("level", ["bachelor", "master", "phd", "other", "not-student"]),
      choice("exchange", ["yes", "no", "na"]),
    ],
  },
  choice("scene-pick", ["sell", "deal", "find"], {
    when: WATCHES_TOUR,
    shuffle: true,
  }),
  ...TOUR_SCENES_ORDER.map((scene): V3Step => ({
    kind: "scene",
    id: sceneStepId(scene),
    scene,
    when: WATCHES_TOUR,
  })),
  choice(
    "try-first",
    [
      "describe-search",
      "photo-listing",
      "offer-drafts",
      "pickup-card",
      "none",
      "need-more",
    ],
    { when: WATCHES_TOUR, product: true, shuffle: true, fixedLast: 2 },
  ),
  { kind: "pilot", id: "pilot", when: ACCOUNT_HOLDERS },
  { kind: "end", id: "end" },
];

/** Steps whose answers are stored; the pilot form goes to its own table. */
function storesAnswer(step: V3Step): boolean {
  return (
    step.kind === "choice" ||
    step.kind === "story" ||
    step.kind === "desk" ||
    step.kind === "draft"
  );
}

/** The ids stored for a step: the step itself, or each row of an "About you" screen. */
export function answerIds(step: V3Step): string[] {
  if (step.kind === "about") return step.rows.map((row) => row.id);
  return storesAnswer(step) ? [step.id] : [];
}
