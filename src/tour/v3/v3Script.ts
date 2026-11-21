/**
 * Survey version 4 as data: step and option ids, order, parts and who sees what. The
 * words live in the dictionaries under `v3`. Ids are what the server stores, so they
 * change only together with `V3_VERSION`.
 */

import type { TourScene } from "../device/sceneMessages.ts";
import type { TourText } from "../i18n/en.ts";
import type { StepCondition } from "../stepConditions.ts";

/** Raised whenever a question, an option or its wording changes. */
export const V3_VERSION = "v4-1";
/** The time the start screen and the share text name, rounded up from the core's estimate. */
export const V3_MINUTES = 6;

/** The four parts of the survey; each opens with a screen that says what it asks. */
export const V3_SECTIONS = ["last-time", "home", "the-app", "price"] as const;
export type V3Section = (typeof V3_SECTIONS)[number];

type StepWords = TourText["v3"]["steps"];
type ChoiceStepId = keyof StepWords;

/** The two scenes the survey shows; the find scene is cut for time. */
type V3Scene = Extract<TourScene, "sell" | "deal">;

/** A step whose context comes first, as Pako's line, with the question above the answers. */
type CardId = keyof TourText["v3"]["cards"];

type Base = {
  id: string;
  when?: StepCondition;
  /** The part the step belongs to; the end has none. */
  section?: V3Section;
};

export type V3ChoiceStep = Base & {
  kind: "choice";
  id: ChoiceStepId;
  /** Option ids in their listed order. */
  options: readonly string[];
  /**
   * Options only some participants see, by option id: the roles of `last-role` they
   * belong to. An option not listed here is offered to everyone.
   */
  onlyFor?: Readonly<Record<string, readonly string[]>>;
  /** Options shuffled once per participant; the last `fixedLast` stay below. */
  shuffle: boolean;
  fixedLast: number;
  /** The context Pako gives before the question, which then sits above the answers. */
  card?: CardId;
  /** A product question: Pako keeps a neutral face whatever is picked. */
  product: boolean;
  /** An option that opens a short text field once picked. */
  withText?: string;
  /** Several options may be picked; Continue moves on. */
  multiple?: boolean;
  /** In a multiple choice, the option that clears the others and is cleared by them. */
  exclusive?: string;
};

export type V3Step =
  /** Opens a part: its number, its name and what it asks. */
  | (Base & { kind: "part"; section: V3Section })
  | V3ChoiceStep
  | (Base & { kind: "draft" })
  | (Base & { kind: "scene"; scene: V3Scene })
  | (Base & { kind: "end" });

/** The day picked in the draft chat is stored as an answer of its own. */
export const DRAFT_DAY_STEP = "draft-day";
export const DRAFT_DAYS = ["sat", "sun"] as const;
export type DraftDay = (typeof DRAFT_DAYS)[number];
/**
 * Which reply Pako drafts, drawn once per participant and stored with the day: the
 * agreed price, or CHF 5 more than it, against the participant's interest.
 */
export const DRAFT_VARIANT_STEP = "draft-variant";
export const DRAFT_VARIANTS = ["exact", "wrong-price"] as const;
export type DraftVariant = (typeof DRAFT_VARIANTS)[number];
/** Two in three participants get the wrong price, so its rate of unchanged sends is narrower. */
export const DRAFT_ALLOCATION: readonly DraftVariant[] = [
  "exact",
  "wrong-price",
  "wrong-price",
];
/** The agreed price in CHF, and the price the wrong draft names instead. */
export const DRAFT_PRICES: Record<DraftVariant, number> = {
  exact: 40,
  "wrong-price": 45,
};
/** The price named in the message sent, stored as an answer of its own. */
export const DRAFT_PRICE_STEP = "draft-price";
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

/** The step whose answer decides which `last-trouble` obstacles are offered. */
const ROLE_STEP = "last-role";
const BUYING = ["buying", "getting-free"];
const PASSING_ON = ["selling", "giving-away"];
const TRIED: StepCondition = {
  step: ROLE_STEP,
  anyOf: [...BUYING, ...PASSING_ON],
};
/** Transport is asked where something changed hands or still might; implies having tried. */
const MOVED_OR_MOVING: StepCondition = {
  step: "last-outcome",
  anyOf: ["yes", "ongoing"],
};
const HAS_IDLE_ITEMS: StepCondition = {
  step: "idle-items",
  anyOf: ["1-3", "4-10", "over-10"],
};

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

type ChosenSheet = Record<string, { chosen: readonly string[] }>;

/** The options this participant is offered, in their listed order. */
export function offeredOptions(
  step: V3ChoiceStep,
  answers: ChosenSheet,
): readonly string[] {
  const { onlyFor } = step;
  if (!onlyFor) return step.options;
  const role = answers[ROLE_STEP]?.chosen[0];
  return step.options.filter((id) => {
    const roles = onlyFor[id];
    return roles === undefined || (role !== undefined && roles.includes(role));
  });
}

export const V3_STEPS: readonly V3Step[] = [
  { kind: "part", id: "part-last-time", section: "last-time" },
  choice("who", ["epfl", "unil", "other-school", "no"], {
    section: "last-time",
  }),
  choice("housing", ["fmel", "other-res", "flat", "family", "elsewhere"], {
    section: "last-time",
  }),
  choice(
    "last-role",
    ["buying", "getting-free", "selling", "giving-away", "none"],
    { section: "last-time", card: "lastTime" },
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
  choice("last-occasion", ["moving-in", "moving-out", "both", "no-move"], {
    section: "last-time",
    when: TRIED,
  }),
  choice("last-how", ["friends", "chat-group", "facebook", "anibis", "other"], {
    section: "last-time",
    when: TRIED,
  }),
  choice("last-outcome", ["yes", "no", "ongoing"], {
    section: "last-time",
    when: TRIED,
  }),
  // Each side sees its own obstacles; the shared ones and the last three are offered to all.
  choice(
    "last-trouble",
    [
      "finding",
      "gone",
      "agree-price",
      "finding-taker",
      "deadline-pickup",
      "listing",
      "set-price",
      "replies",
      "messages",
      "timing",
      "cancelled",
      "transport",
      "trust",
      "other",
      "nothing",
      "cant-recall",
    ],
    {
      section: "last-time",
      when: TRIED,
      shuffle: true,
      fixedLast: 3,
      onlyFor: {
        finding: BUYING,
        gone: BUYING,
        "agree-price": ["buying"],
        "finding-taker": PASSING_ON,
        "deadline-pickup": PASSING_ON,
        listing: PASSING_ON,
        "set-price": ["selling"],
      },
    },
  ),
  choice(
    "last-transport",
    [
      "foot",
      "bike",
      "public-transport",
      "car",
      "delivery",
      "not-yet",
      "dont-know",
    ],
    { section: "last-time", when: MOVED_OR_MOVING },
  ),
  choice("last-messages", ["none", "1-5", "6-15", "over-15", "dont-remember"], {
    section: "last-time",
    when: TRIED,
  }),
  { kind: "part", id: "part-home", section: "home" },
  choice("idle-items", ["none", "1-3", "4-10", "over-10"], {
    section: "home",
  }),
  choice(
    "idle-why",
    [
      "listing-hassle",
      "messages-hassle",
      "transport",
      "not-worth",
      "dont-know-where",
      "might-need",
      "not-yet",
      "other",
    ],
    {
      section: "home",
      when: HAS_IDLE_ITEMS,
      multiple: true,
      shuffle: true,
      fixedLast: 1,
    },
  ),
  choice("move", ["move-feb", "move-jun", "no-or-later", "not-sure"], {
    section: "home",
  }),
  { kind: "part", id: "part-the-app", section: "the-app" },
  { kind: "scene", id: "app-sell", scene: "sell", section: "the-app" },
  { kind: "scene", id: "app-deal", scene: "deal", section: "the-app" },
  // "Wanted nearby", a feature idea: a nearby student's request, shown as a post.
  choice("wanted-react", ["offer-now", "offer-later", "leave", "rather-not"], {
    section: "the-app",
    product: true,
    card: "wanted",
    shuffle: true,
  }),
  choice("seeking", ["yes", "no"], {
    section: "the-app",
    product: true,
    withText: "yes",
  }),
  { kind: "draft", id: "draft", section: "the-app" },
  // Asked after the draft task, so the task is not framed by it.
  choice(
    "delegate",
    [
      "answer-questions",
      "suggest-time",
      "remind",
      "negotiate",
      "accept-offer",
      "none",
    ],
    {
      section: "the-app",
      product: true,
      card: "delegate",
      multiple: true,
      exclusive: "none",
      shuffle: true,
      fixedLast: 1,
    },
  ),
  { kind: "part", id: "part-price", section: "price" },
  choice(
    "pay-model",
    ["free", "seller-fee", "pay-once", "monthly", "not-sure"],
    {
      section: "price",
      product: true,
      card: "price",
      shuffle: true,
      fixedLast: 1,
    },
  ),
  choice(
    "age",
    ["under-18", "18-20", "21-23", "24-26", "27-30", "31-plus", "na"],
    { section: "price" },
  ),
  choice("gender", ["woman", "man", "non-binary", "self-describe", "na"], {
    section: "price",
    withText: "self-describe",
  }),
  { kind: "end", id: "end" },
];

/** The ids stored for a step: a choice or the draft task stores its own answer. */
export function answerIds(step: V3Step): string[] {
  return step.kind === "choice" || step.kind === "draft" ? [step.id] : [];
}
