/**
 * The study's questions as data, in the order of docs/STUDY.md. Step and option ids are
 * what the server stores, so they change only together with `STUDY_VERSION`.
 */

import type { TourScene } from "./device/sceneMessages.ts";

/** Raised whenever a question, an option or its wording changes. */
export const STUDY_VERSION = "pilot-1";

export type StudyOption = {
  id: string;
  label: string;
  detail?: string;
  /** Stays below the shuffled options, in the order listed. */
  last?: boolean;
  /** Clears every other option when picked, and is cleared by them. */
  exclusive?: boolean;
  /** Asks for a few words once picked. */
  withText?: boolean;
};

/** A step is shown only when an earlier answer includes one of these options. */
type StepCondition = { step: string; anyOf: string[] };

type BaseStep = { id: string; when?: StepCondition };

type ChoiceStep = BaseStep & {
  kind: "single" | "multiple";
  question: string;
  options: StudyOption[];
  shuffle: boolean;
  skippable: boolean;
};

type TextStep = BaseStep & {
  kind: "text";
  question: string;
  skippable: true;
};

/** A line of Pako's between parts of the study, answered with Continue. */
type LineStep = BaseStep & { kind: "line"; text: string };

/** Task C1: two desk cards in random order, then "Neither". */
type DeskTaskStep = BaseStep & {
  kind: "nearer-or-cheaper";
  question: string;
  options: StudyOption[];
};

/** Task C2: an offer draft with one wrong detail. */
export type DraftTaskStep = BaseStep & {
  kind: "draft-check";
  situation: string;
  prompt: string;
  draft: string;
  explanation: string;
};

export const DRAFT_ACTIONS = {
  send: "send",
  edit: "edit",
  writeOwn: "write-own",
  dontSend: "dont-send",
} as const;
export const DRAFT_RESULTS = {
  fridayKept: "friday-kept",
  fridayFixed: "friday-fixed",
  notSent: "not-sent",
} as const;
export type DraftAction = (typeof DRAFT_ACTIONS)[keyof typeof DRAFT_ACTIONS];
export type DraftResult = (typeof DRAFT_RESULTS)[keyof typeof DRAFT_RESULTS];

export type StudyStep =
  | ChoiceStep
  | TextStep
  | LineStep
  | DeskTaskStep
  | DraftTaskStep
  | (BaseStep & { kind: "scene"; scene: TourScene })
  | (BaseStep & { kind: "contact"; question: string })
  | (BaseStep & { kind: "end"; text: string });

const NOT_TRIED = "not-tried";
const STUDENT_ANSWERS = ["yes-epfl", "yes-unil", "yes-elsewhere"];
/** Everything in part B after `last-role` follows only an attempt in the last 12 months. */
const TRIED: StepCondition = {
  step: "last-role",
  anyOf: ["buying", "selling", "giving-away"],
};

const option = (id: string, label: string): StudyOption => ({ id, label });

const TRANSPORT_OPTIONS: StudyOption[] = [
  option("on-foot", "On foot"),
  option("bike", "By bike"),
  option("public-transport", "Public transport"),
  option("car", "Car or van"),
  option("delivery", "Delivery or post"),
];

function single(
  id: string,
  question: string,
  options: StudyOption[],
  extra: Partial<ChoiceStep> = {},
): ChoiceStep {
  return {
    kind: "single",
    id,
    question,
    options,
    shuffle: false,
    skippable: false,
    ...extra,
  };
}

function text(id: string, question: string, when?: StepCondition): TextStep {
  return { kind: "text", id, question, skippable: true, when };
}

export const STUDY_STEPS: StudyStep[] = [
  single("student", "Are you a student?", [
    option("yes-epfl", "Yes, at EPFL"),
    option("yes-unil", "Yes, at UNIL"),
    option("yes-elsewhere", "Yes, somewhere else"),
    option("no", "No"),
  ]),
  single("housing", "Where do you live at the moment?", [
    option("fmel", "FMEL residence"),
    option("shared-flat", "Shared flat"),
    option("own-flat", "My own flat or studio"),
    option("with-family", "With family"),
    option("elsewhere", "Somewhere else"),
  ]),
  single(
    "last-role",
    "Think of the last time you tried to buy, sell or give away a used item. What were you doing?",
    [
      option("buying", "Buying"),
      option("selling", "Selling"),
      option("giving-away", "Giving it away"),
      option(NOT_TRIED, "I haven't tried in the last 12 months"),
    ],
  ),
  single(
    "last-occasion",
    "What was the occasion?",
    [
      option("moving-in", "Moving in"),
      option("moving-out", "Moving out"),
      option("during-year", "Neither, it was during the year"),
    ],
    { when: TRIED },
  ),
  single(
    "last-outcome",
    "How did it end?",
    [
      option("worked-out", "It worked out"),
      option("gave-up", "I gave up"),
      option("still-open", "It's still open"),
    ],
    { when: TRIED },
  ),
  text("last-story", "In a few words, what happened?", TRIED),
  {
    kind: "multiple",
    id: "last-hard",
    question: "What made it hard? Pick all that apply.",
    options: [
      option("finding", "Finding the right item or a buyer"),
      option("listing", "Writing the listing"),
      option("price", "Agreeing on a price"),
      option("replies", "Slow or no replies"),
      option("pickup-fell-through", "A pickup that fell through"),
      option("timing", "Finding a time that worked"),
      option("transport", "Getting the item from A to B"),
      option("trust", "Not sure I could trust the other person"),
      {
        id: "nothing",
        label: "Nothing, it was easy",
        last: true,
        exclusive: true,
      },
      {
        id: "something-else",
        label: "Something else",
        last: true,
        withText: true,
      },
    ],
    shuffle: true,
    skippable: false,
    when: TRIED,
  },
  single(
    "last-transport",
    "How did the item get from A to B?",
    [...TRANSPORT_OPTIONS, option("didnt", "It didn't")],
    { when: TRIED },
  ),
  single(
    "attempts",
    "How often did you try to buy, sell or give away something used in the last 12 months?",
    [
      option("once", "Once"),
      option("two-to-five", "2 to 5 times"),
      option("more-than-five", "More than 5 times"),
    ],
    { when: TRIED },
  ),
  {
    kind: "line",
    id: "tasks-intro",
    text: "Thanks! Now two short situations. Nothing here is real and nothing gets sent.",
  },
  {
    kind: "nearer-or-cheaper",
    id: "nearer-or-cheaper",
    question:
      "You need a desk. I found two that fit. Which one would you go for?",
    options: [
      { id: "nearer", label: "CHF 45", detail: "In your residence, 200 m" },
      { id: "cheaper", label: "CHF 30", detail: "Lausanne centre, 4 km" },
      { id: "neither", label: "Neither", last: true },
    ],
  },
  single(
    "far-transport",
    "How would you get it home?",
    [...TRANSPORT_OPTIONS, option("not-sure", "Not sure yet")],
    { when: { step: "nearer-or-cheaper", anyOf: ["cheaper"] } },
  ),
  {
    kind: "draft-check",
    id: "draft-check",
    situation:
      "You'd like Mia's desk. You told her you can only pick it up on Saturday.",
    prompt: "I drafted your offer. Check it, then decide.",
    draft:
      "Hi Mia! I'd like your white work desk. Would CHF 40 work? I could pick it up on Friday at 17:30 at FMEL Atrium.",
    explanation:
      "One thing: the draft said Friday, but you'd said Saturday. That was on purpose. We want to see how drafts get checked.",
  },
  text("draft-why", "What made you choose that?"),
  {
    kind: "line",
    id: "tour-intro",
    text: "Now the short tour. This is how takeover works.",
  },
  { kind: "scene", id: "tour-snap", scene: "sell" },
  { kind: "scene", id: "tour-chat", scene: "deal" },
  { kind: "scene", id: "tour-ask", scene: "find" },
  {
    kind: "multiple",
    id: "would-use",
    question: "Which of these would you use? Pick any.",
    options: [
      option("describe-search", "Search by describing what I need"),
      option("photo-listing", "A listing drafted from my photos"),
      option("price-suggestion", "A price suggestion from similar offers"),
      option("offer-drafts", "Offer drafts I can edit and send"),
      option("pickup-reminders", "Pickup with confirmations and reminders"),
      { id: "none", label: "None of these", last: true, exclusive: true },
    ],
    shuffle: true,
    skippable: false,
  },
  text("missing", "What's missing, or what would stop you from using it?"),
  single(
    "autonomy",
    "What should I be allowed to do without asking you first?",
    [
      option("nothing", "Nothing. I send everything myself"),
      option("short-updates", "Short updates like “On my way”"),
      option("simple-replies", "Replies to simple questions"),
      option("negotiate", "Negotiate within limits I set"),
    ],
  ),
  single(
    "need-soon",
    "In the next four weeks, do you have something to sell or do you need something?",
    [
      option("sell", "Something to sell"),
      option("need", "I need something"),
      option("both", "Both"),
      option("neither", "Neither"),
    ],
  ),
  {
    kind: "contact",
    id: "contact",
    question:
      "Can we email you two or three follow-up questions, or an invitation when we test with real items?",
  },
  single(
    "age",
    "How old are you?",
    [
      option("18-20", "18–20"),
      option("21-23", "21–23"),
      option("24-26", "24–26"),
      option("27-plus", "27 or older"),
      option("no-answer", "Prefer not to say"),
    ],
    { skippable: true },
  ),
  single(
    "gender",
    "Your gender?",
    [
      option("woman", "Woman"),
      option("man", "Man"),
      option("non-binary", "Non-binary"),
      option("no-answer", "Prefer not to say"),
    ],
    { skippable: true },
  ),
  single(
    "level",
    "What are you studying towards?",
    [
      option("bachelor", "Bachelor"),
      option("master", "Master"),
      option("phd", "PhD"),
      option("exchange", "Exchange semester"),
      option("other", "Something else"),
    ],
    { skippable: true, when: { step: "student", anyOf: STUDENT_ANSWERS } },
  ),
  {
    kind: "end",
    id: "end",
    text: "Thanks! That helps us decide what to build next.",
  },
];

/** Steps whose answers are stored; lines, scenes, the contact and the end are not. */
export function isQuestion(step: StudyStep): boolean {
  return (
    step.kind === "single" ||
    step.kind === "multiple" ||
    step.kind === "text" ||
    step.kind === "nearer-or-cheaper" ||
    step.kind === "draft-check"
  );
}

export type StepAnswer = { chosen: string[]; shown: string[]; text: string };
export type AnswerSheet = Record<string, StepAnswer>;

function isShown(step: StudyStep, answers: AnswerSheet): boolean {
  if (!step.when) return true;
  const { step: earlier, anyOf } = step.when;
  const chosen = answers[earlier]?.chosen ?? [];
  return chosen.some((id) => anyOf.includes(id));
}

/** The steps this participant sees, given their answers so far. */
export function visibleSteps(answers: AnswerSheet): StudyStep[] {
  return STUDY_STEPS.filter((step) => isShown(step, answers));
}

export function stepById(id: string): StudyStep {
  const step = STUDY_STEPS.find((candidate) => candidate.id === id);
  if (!step) throw new Error(`The study has no step ${id}.`);
  return step;
}
