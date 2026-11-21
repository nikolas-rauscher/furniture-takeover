/**
 * Survey version 3 as data: step and option ids, order, sections and who sees what.
 * The words live in the dictionaries under `v3`. Ids are what the server stores, so
 * they change only together with `V3_VERSION`.
 */

import type { TourScene } from "../device/sceneMessages.ts";
import type { TourText } from "../i18n/en.ts";
import type { StepCondition } from "../stepConditions.ts";

/** Raised whenever a question, an option or its wording changes. */
export const V3_VERSION = "v3-6";
/** The time the start screen and the share text name, rounded up from the core's estimate. */
export const V3_MINUTES = 5;
/** The one open sentence is shorter than what the server accepts. */
export const STORY_MAX = 200;

export const V3_SECTIONS = [
  "you",
  "last-time",
  "the-app",
  "situations",
  "price",
] as const;
export type V3Section = (typeof V3_SECTIONS)[number];

type StepWords = TourText["v3"]["steps"];
type ChoiceStepId = keyof StepWords;

/** Pako's line above a step's question, opening a part of the survey. */
type Intro = "moveIntro" | "firstLookIntro" | "situationsIntro" | "priceIntro";

type Base = {
  id: string;
  when?: StepCondition;
  /** The part of the core the step belongs to; steps after the core have none. */
  section?: V3Section;
  /** Its place among the situations; a context card opens the step. */
  situation?: number;
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
  /** Several options may be picked; Continue moves on. */
  multiple?: boolean;
  /** In a multiple choice, the option that clears the others and is cleared by them. */
  exclusive?: string;
  /** The feature a "would this have helped" question is about. */
  feature?: TourScene;
};

export type V3Step =
  | (Base & { kind: "about-app" })
  | V3ChoiceStep
  | (Base & { kind: "story" })
  | (Base & { kind: "desk"; options: readonly string[] })
  | (Base & { kind: "draft" })
  /** The pack's price ladder: one or two prices, each its own stored answer. */
  | (Base & { kind: "ladder" })
  | (Base & { kind: "saved" })
  | (Base & { kind: "about"; rows: readonly V3ChoiceStep[] })
  | (Base & {
      kind: "scene";
      scene: TourScene;
      /** The short version in the core; the optional tour plays the full one. */
      brief: boolean;
    })
  | (Base & { kind: "pilot" })
  | (Base & { kind: "end" });

/** The day picked in the draft chat is stored as an answer of its own. */
export const DRAFT_DAY_STEP = "draft-day";
export const DRAFT_DAYS = ["sat", "sun"] as const;
export type DraftDay = (typeof DRAFT_DAYS)[number];
/** The option picked first for Pako's draft, kept as the draft's first answer. */
export type DraftAction = "send" | "change" | "own" | "dont-send";
/** The options that open the message for writing. */
export type DraftWriting = Extract<DraftAction, "change" | "own">;
/**
 * The draft's final answer. `change` or `own` stays the final answer when the
 * participant started writing and decided nothing.
 */
export const DRAFT_RESULTS = [
  "sent-unchanged",
  "sent-changed",
  "sent-own",
  "not-sent",
] as const;
export type DraftResult = (typeof DRAFT_RESULTS)[number];
/** How many situations part 4 holds, for its context cards. */
export const SITUATIONS = 3;

/** The move-out pack's prices in CHF, from low to high; the ladder starts at one at random. */
export const PACK_PRICES = [2, 5, 8] as const;
export type PackPrice = (typeof PACK_PRICES)[number];
export const PACK_ANSWERS = ["yes", "no", "not-sure"] as const;
export type PackAnswer = (typeof PACK_ANSWERS)[number];
export const PACK_LADDER_STEP = "pack-price";
/** The start price is stored as an answer of its own, like the draft's day. */
export const PACK_START_STEP = "pack-start";
export const packPriceId = (price: PackPrice) => `chf-${price}` as const;
export const packAnswerStep = (price: PackPrice) =>
  `pack-chf-${price}` as const;

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

/** Whether the participant tried to buy, get, sell or give away something before. */
export const triedBefore = (
  answers: Record<string, { chosen: readonly string[] }>,
) => (answers[TRIED.step]?.chosen ?? []).some((id) => TRIED.anyOf.includes(id));

/** Whether the participant was buying or getting, which changes one obstacle's words. */
export const wasBuying = (role: string | undefined) =>
  role !== undefined && BUYING.includes(role);

export const TOUR_SCENES_ORDER: readonly TourScene[] = ["sell", "deal", "find"];
export const sceneStepId = (scene: TourScene) => `tour-${scene}`;
/** The core shows the features in the order of an exchange: find, list, agree. */
const CORE_SCENES: readonly TourScene[] = ["find", "sell", "deal"];
const helpedStepId = (scene: TourScene) =>
  `helped-${scene}` as const satisfies ChoiceStepId;

/** A short scene of one feature, then whether it would have helped. */
function featureSteps(scene: TourScene): V3Step[] {
  return [
    {
      kind: "scene",
      id: `app-${scene}`,
      scene,
      brief: true,
      section: "the-app",
    },
    choice(helpedStepId(scene), ["yes", "partly", "no", "na"], {
      section: "the-app",
      product: true,
      feature: scene,
    }),
  ];
}

export const V3_STEPS: readonly V3Step[] = [
  { kind: "about-app", id: "what-is", section: "you" },
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
    "last-cost",
    ["nothing", "under-10", "10-30", "over-30", "dont-remember"],
    { section: "last-time", when: TRIED },
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
    section: "the-app",
    intro: "firstLookIntro",
    product: true,
    shuffle: true,
    fixedLast: 1,
  }),
  ...CORE_SCENES.flatMap(featureSteps),
  choice(
    "stop",
    [
      "ai-mistakes",
      "nobody-nearby",
      "prefer-groups",
      "privacy",
      "too-long",
      "nothing",
      "other",
    ],
    {
      section: "the-app",
      product: true,
      shuffle: true,
      fixedLast: 2,
      multiple: true,
      exclusive: "nothing",
      withText: "other",
    },
  ),
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
    { section: "the-app", product: true, shuffle: true, fixedLast: 2 },
  ),
  // The options go from sending nothing to sending more, so they keep their order.
  choice("sending", ["myself", "short-updates", "replies-too", "not-sure"], {
    section: "the-app",
    product: true,
  }),
  // "Wanted nearby", a feature idea: a nearby student's anonymous request, shown as a card.
  choice("wanted-react", ["snap", "look", "ignore", "rather-not"], {
    section: "the-app",
    product: true,
    shuffle: true,
    fixedLast: 1,
  }),
  choice("wanted-share", ["yes", "maybe", "no"], {
    section: "the-app",
    product: true,
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
      situation: 1,
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
    situation: 2,
    options: ["nearer", "cheaper", "neither"],
  },
  { kind: "draft", id: "draft", section: "situations", situation: 3 },
  choice(
    "pay-model",
    ["seller-fee", "move-pack", "monthly", "institution", "none"],
    {
      section: "price",
      intro: "priceIntro",
      product: true,
      shuffle: true,
      fixedLast: 1,
    },
  ),
  { kind: "ladder", id: PACK_LADDER_STEP, section: "price" },
  choice("delivery-pref", ["pick-up", "if-priced", "always", "depends"], {
    section: "price",
    product: true,
  }),
  choice(
    "delivery-worth",
    ["only-free", "up-to-5", "5-10", "10-20", "over-20", "not-sure"],
    {
      section: "price",
      product: true,
      when: {
        step: "delivery-pref",
        anyOf: ["if-priced", "always", "depends"],
      },
    },
  ),
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
    brief: false,
    when: WATCHES_TOUR,
  })),
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

/** The ids stored for a step: the step itself, each row of an "About you" screen, or each ladder price. */
export function answerIds(step: V3Step): string[] {
  if (step.kind === "about") return step.rows.map((row) => row.id);
  if (step.kind === "ladder")
    return [PACK_START_STEP, ...PACK_PRICES.map(packAnswerStep)];
  return storesAnswer(step) ? [step.id] : [];
}
